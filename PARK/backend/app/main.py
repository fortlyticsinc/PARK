"""
PARK — App Factory
=====================
Creates and configures the FastAPI application.
Middleware is stacked so that security checks run BEFORE business logic.
"""

import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.config import settings
from app.core.error_handler import register_exception_handlers
from app.core.database import dispose_engine

from app.routers import (
    auth,
    users,
    lookups,
    pairings,
    chapters,
    meetings,
    messages,
    dashboard,
    repository,
    broadcast,
    certificates,
    health,
    guidelines,
)


# ──────────────────────────────────────────────
# Lifespan: cleanup on shutdown
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Async context manager — runs before first request and after last."""
    flush_task = asyncio.create_task(_periodic_view_flush())
    try:
        yield
    finally:
        flush_task.cancel()
        with suppress(asyncio.CancelledError):
            await flush_task
        from app.services.repository_service import flush_view_counts
        await flush_view_counts()
        await dispose_engine()


async def _periodic_view_flush() -> None:
    from app.services.repository_service import flush_view_counts
    while True:
        await asyncio.sleep(settings.VIEW_COUNT_FLUSH_INTERVAL_SECONDS)
        await flush_view_counts()


# ──────────────────────────────────────────────
# Rate Limiter (single definition)
# ──────────────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # Global cap per IP
)


# ──────────────────────────────────────────────
# App Factory
# ──────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    # Hide interactive docs in production for security
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    lifespan=lifespan,
)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Attach limiter to app state so slowapi middleware can access it
app.state.limiter = limiter


# ──────────────────────────────────────────────
# Middleware Stack
# NOTE: FastAPI/Starlette executes middleware in REVERSE
#       order of registration. Last added = outermost = runs
#       first on the way in, and — critically — last on the
#       way OUT, meaning it's the last thing to touch the
#       response before it goes to the browser.
#
#       CORSMiddleware MUST be added last (outermost). If any
#       inner middleware (SecurityHeaders, SlowAPI — both built
#       on Starlette's BaseHTTPMiddleware) lets an exception
#       propagate past it — e.g. a database error deep in a
#       dependency — CORS headers only get attached to the
#       final response if CORSMiddleware wraps everything else.
#       Previously CORS was nested INSIDE TrustedHost/SlowAPI,
#       so any unhandled error below it came back with NO CORS
#       headers at all, and the browser reported it as "blocked
#       by CORS policy" — which looked identical to being
#       offline, even though the backend was actually up and the
#       real problem was a 500 error underneath.
# ──────────────────────────────────────────────

# 5. GZip (innermost — compresses the response body)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# 4. Security Headers (CSP, HSTS, X-Frame-Options)
app.add_middleware(SecurityHeadersMiddleware)

# 3. Trusted Host (blocks Host-header spoofing)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

# 2. Rate Limiting
app.add_middleware(SlowAPIMiddleware)

# 1. CORS — added LAST so it's OUTERMOST and always gets to attach
#    Access-Control-Allow-Origin, even to error responses from
#    everything nested inside it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# ──────────────────────────────────────────────
# Exception Handlers
# ──────────────────────────────────────────────
register_exception_handlers(app)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Return structured JSON when a client hits the rate limit."""
    return JSONResponse(
        status_code=429,
        content={
            "data": None,
            "error": {
                "code": "RATE_LIMITED",
                "message": "Too many requests. Please try again later.",
            },
        },
    )


# ──────────────────────────────────────────────
# Router Registration
# ──────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(lookups.router)
app.include_router(pairings.router)
app.include_router(chapters.router)
app.include_router(meetings.router)
app.include_router(messages.router)
app.include_router(dashboard.router)
app.include_router(repository.router)
app.include_router(broadcast.router)
app.include_router(certificates.router)
app.include_router(health.router)
app.include_router(guidelines.router)


# ──────────────────────────────────────────────
# Root Health Check (lightweight, no DB)
# ──────────────────────────────────────────────
@app.get("/", tags=["system"])
async def root():
    """
    Hitting the bare backend URL should never just 404 — that makes it
    impossible to tell "wrong URL/port" apart from "server not running"
    apart from "route genuinely missing". This confirms which server
    and which build is actually answering requests.
    """
    return {
        "service": settings.APP_NAME,
        "status": "ok",
        "env": settings.ENV,
        "docs": None if settings.is_production else "/docs",
        "api_prefix": settings.API_V1_PREFIX,
    }