"""
PARK — Structured Error Handling
====================================
"""

import logging
import uuid
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("p_ark")


class AppError(Exception):
    status_code: int = 500
    code: str = "SERVER_ERROR"

    def __init__(self, message: str, field: str | None = None, retry_after: int | None = None):
        self.message = message
        self.field = field
        self.retry_after = retry_after
        super().__init__(message)


class ValidationAppError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class AuthError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "AUTH_ERROR"

    def __init__(self, message: str = "Session expired, please log in"):
        super().__init__(message)


class PermissionError_(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "PERMISSION_DENIED"

    def __init__(self, message: str = "You don't have permission to do that"):
        super().__init__(message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"

    def __init__(self, message: str = "We couldn't find that"):
        super().__init__(message)


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"


class RateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "RATE_LIMITED"

    def __init__(self, retry_after: int = 60):
        super().__init__(f"Too many attempts, try again in {retry_after}s", retry_after=retry_after)


class UpstreamError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "UPSTREAM_ERROR"

    def __init__(self):
        super().__init__("Service temporarily unavailable, please try again")


class FeatureDisabledError(AppError):
    status_code = status.HTTP_410_GONE
    code = "FEATURE_DISABLED"

    def __init__(self, message: str):
        super().__init__(message)


def _envelope(code: str, message: str, field=None, retry_after=None, incident_id=None):
    error: dict = {"code": code, "message": message}
    if field:
        error["field"] = field
    if retry_after:
        error["retry_after"] = retry_after
    if incident_id:
        error["incident_id"] = incident_id
    return {"data": None, "error": error}


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(exc.code, exc.message, exc.field, exc.retry_after),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_pydantic_validation(request: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(p) for p in first.get("loc", [])[1:])
        return JSONResponse(
            status_code=422,
            content=_envelope("VALIDATION_ERROR", first.get("msg", "Invalid request"), field=field or None),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope("HTTP_ERROR", str(exc.detail)),
        )

    @app.exception_handler(Exception)
    async def handle_unhandled(request: Request, exc: Exception):
        incident_id = str(uuid.uuid4())
        logger.exception(f"Unhandled error [incident_id={incident_id}]")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope(
                "SERVER_ERROR",
                "Something went wrong on our end. Please try again.",
                incident_id=incident_id,
            ),
        )
