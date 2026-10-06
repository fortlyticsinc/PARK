# backend/app/core/database.py
"""
PARK — Database Engine & Session
====================================
Enhanced with connection health checks and better error messages.
"""

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import AsyncGenerator
import logging

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Log the connection string (masked) for debugging
masked_url = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "local"
logger.info(f"Database connecting to: {masked_url}")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=not settings.is_production,
    pool_size=2,
    max_overflow=8,
    pool_pre_ping=True,        # Validates connections before use
    pool_recycle=1800,         # Recycle connections every 30 min
    connect_args={
        # Defense-in-depth, not the primary fix: this disables asyncpg's
        # own client-side prepared-statement cache. It does NOT reliably
        # prevent "InvalidSQLStatementNameError" against Supabase's
        # Transaction-mode pooler (port 6543) on its own — SQLAlchemy's
        # own connection pool can still hold a stale prepared-statement
        # reference across what it thinks is one connection while the
        # pooler swaps the physical backend underneath it. The real fix
        # is which connection string you use — see TESTING.md §2: local
        # Postgres for dev, Supabase's SESSION pooler (port 5432) for
        # production. Never the Transaction pooler for this app.
        "statement_cache_size": 0,
        "server_settings": {
            "application_name": "p-ark-backend"
        }
    }
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session, ensuring cleanup."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_health() -> bool:
    """Quick health check — used by /health endpoint."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


async def dispose_engine() -> None:
    """Clean shutdown — call in lifespan or atexit."""
    await engine.dispose()
    logger.info("Database engine disposed")