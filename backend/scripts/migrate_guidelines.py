"""Create the department guideline table in an existing database.

Run with: python -m scripts.migrate_guidelines
"""

import asyncio

from backend.app.core.database import engine, Base
from backend.app.models.guideline import DepartmentGuideline  # noqa: F401 - registers the model


async def migrate() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: DepartmentGuideline.metadata.create_all(
                sync_connection, tables=[DepartmentGuideline.__table__]
            )
        )
    print("Department guideline table is ready.")


if __name__ == "__main__":
    asyncio.run(migrate())
