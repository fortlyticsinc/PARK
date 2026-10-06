"""
PARK — Local Dev Seed Script
===================================
Creates one institution, one department, one user of each role, and
one active pairing between the seeded student and supervisor — the
minimum needed to click through every module without doing it all
by hand via /docs first.

Run with: python -m scripts.seed_data
"""

import asyncio
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.institution import Institution
from backend.app.models.department import Department
from backend.app.models.user import User, UserRole
from backend.app.models.pairing import Pairing, PairingStatus


async def seed():
    async with AsyncSessionLocal() as db:
        institution = (await db.execute(
            select(Institution).where(Institution.code == "UNILAG")
        )).scalar_one_or_none()
        if institution is None:
            institution = Institution(name="University of Lagos", code="UNILAG")
            db.add(institution)
            await db.flush()

        department = (await db.execute(
            select(Department).where(
                Department.institution_id == institution.id,
                Department.code == "CSC",
            )
        )).scalar_one_or_none()
        if department is None:
            department = Department(institution_id=institution.id, name="Computer Science", code="CSC")
            db.add(department)
            await db.flush()

        seeded_users = {
            "student@example.com": ("Adaeze Okafor", UserRole.student, "CSC/2021/001", "08012345678"),
            "supervisor@example.com": ("Dr. Musa Ibrahim", UserRole.supervisor, None, "08023456789"),
            "coordinator@example.com": ("Prof. Ngozi Eze", UserRole.coordinator, None, "08034567890"),
            "admin@example.com": ("System Admin", UserRole.admin, None, "08045678901"),
        }
        users = {}
        for email, (full_name, role, matric_number, phone) in seeded_users.items():
            user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if user is None:
                user = User(
                    email=email, full_name=full_name, role=role, matric_number=matric_number,
                    department_id=department.id, institution_id=institution.id, phone=phone,
                    is_active=True, email_verified=True,
                )
                db.add(user)
            users[email] = user
        await db.flush()

        student = users["student@example.com"]
        supervisor = users["supervisor@example.com"]
        coordinator = users["coordinator@example.com"]
        admin = users["admin@example.com"]
        department.coordinator_id = coordinator.id

        pairing = (await db.execute(
            select(Pairing).where(
                Pairing.student_id == student.id,
                Pairing.academic_year == "2024/2025",
            )
        )).scalar_one_or_none()
        if pairing is None:
            pairing = Pairing(
                student_id=student.id, supervisor_id=supervisor.id, department_id=department.id,
                institution_id=institution.id, academic_year="2024/2025",
                project_title="IoT-Based Irrigation System for Smallholder Farmers",
                status=PairingStatus.active, created_by=coordinator.id,
            )
            db.add(pairing)

        await db.commit()

        print("Seed complete:")
        print(f"  Institution: {institution.name} ({institution.id})")
        print(f"  Department:  {department.name} ({department.id})")
        print(f"  Student:     {student.email} ({student.id})")
        print(f"  Supervisor:  {supervisor.email} ({supervisor.id})")
        print(f"  Coordinator: {coordinator.email} ({coordinator.id})")
        print(f"  Admin:       {admin.email} ({admin.id})")
        print(f"  Pairing:     {pairing.id}")


if __name__ == "__main__":
    asyncio.run(seed())
