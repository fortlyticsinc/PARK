"""Add the first-login password-reset flag to an existing users table.

Run from backend with: python -m scripts.migrate_password_reset
"""

import asyncio

from sqlalchemy import inspect, text

from app.core.database import engine


async def migrate() -> None:
    async with engine.begin() as connection:
        await connection.execute(text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        columns = await connection.run_sync(
            lambda sync_connection: {
                column["name"] for column in inspect(sync_connection).get_columns("users")
            }
        )
        if "must_change_password" not in columns:
            raise RuntimeError("Migration completed but users.must_change_password is missing")
    print("Verified users.must_change_password exists.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())