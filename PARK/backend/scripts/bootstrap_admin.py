"""Create the first real local Supabase Auth admin account.

Usage:
    python -m scripts.bootstrap_admin admin@example.com "A strong password" <department-id> <institution-id>
"""

import asyncio
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.supabase_admin import create_auth_user
from app.models.user import User, UserRole


async def bootstrap(email: str, password: str, department_id: str, institution_id: str) -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        supabase_uid = await create_auth_user(email, password, "System Administrator")
        if existing is not None:
            if existing.role != UserRole.admin or existing.supabase_uid is not None:
                raise RuntimeError(f"A non-bootstrap account already exists for {email}")
            existing.supabase_uid = supabase_uid
            existing.full_name = "System Administrator"
            existing.department_id = department_id
            existing.institution_id = institution_id
            existing.is_active = True
            existing.email_verified = True
        else:
            db.add(User(
                supabase_uid=supabase_uid,
                email=email,
                full_name="System Administrator",
                role=UserRole.admin,
                department_id=department_id,
                institution_id=institution_id,
                is_active=True,
                email_verified=True,
            ))
        await db.commit()
        print(f"Created real Supabase admin account: {email}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit("Usage: python -m scripts.bootstrap_admin EMAIL PASSWORD DEPARTMENT_ID INSTITUTION_ID")
    asyncio.run(bootstrap(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]))