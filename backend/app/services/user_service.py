"""PARK — User Service"""

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from backend.app.core.auth import AuthedUser
from backend.app.core.permissions import Role
from backend.app.core.error_handler import NotFoundError, ConflictError, PermissionError_, ValidationAppError
from backend.app.models.user import User, UserRole
from backend.app.models.department import Department
from backend.app.models.institution import Institution
from backend.app.models.pairing import Pairing
from backend.app.utils.file_parsing import parse_tabular_file
from backend.app.schemas.user import (
    UserOut, UserListItemOut, PaginatedUsersOut, UserCreateIn, UserUpdateIn,
    BulkImportResultOut, BulkImportSummaryOut,
)
from backend.app.core.supabase_admin import create_auth_user, delete_auth_user, update_auth_user_password


def coordinator_can_manage_user(requester: AuthedUser, target: User) -> bool:
    return (
        requester.role == Role.COORDINATOR
        and target.role == UserRole.supervisor
        and requester.department_id is not None
        and requester.department_id == str(target.department_id)
    )


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id), email=user.email, role=user.role.value, full_name=user.full_name,
        department_id=str(user.department_id) if user.department_id else None,
        institution_id=str(user.institution_id) if user.institution_id else None,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


def _to_list_item_out(user: User) -> UserListItemOut:
    base = _to_user_out(user)
    return UserListItemOut(**base.model_dump(), phone=user.phone, matric_number=user.matric_number)


def get_me(user: AuthedUser) -> UserOut:
    return UserOut(
        id=user.id, email=user.email, role=user.role.value, full_name=user.full_name,
        department_id=user.department_id, institution_id=user.institution_id, avatar_url=None,
        must_change_password=user.must_change_password,
    )


async def complete_password_reset(db: AsyncSession, supabase_uid: str, email: str, password: str) -> UserOut:
    user = (await db.execute(
        select(User).where(User.supabase_uid == supabase_uid, User.email == email)
    )).scalar_one_or_none()
    if user is None:
        raise NotFoundError("User account not found")
    if not user.must_change_password:
        raise ConflictError("This account does not require a password reset")

    await update_auth_user_password(supabase_uid, password)
    user.must_change_password = False
    await db.commit()
    await db.refresh(user)
    return _to_user_out(user)


async def sync_user(
    db: AsyncSession, supabase_uid: str, email: str, full_name: str | None,
    matric_number: str | None = None, department_id: str | None = None, institution_id: str | None = None,
) -> UserOut:
    email = email.strip().lower()
    existing = (await db.execute(
        select(User).where(or_(User.email == email, User.supabase_uid == supabase_uid))
    )).scalar_one_or_none()

    if existing:
        if existing.email.lower() != email:
            raise ConflictError("This verified email is already linked to another account")
        if existing.supabase_uid and str(existing.supabase_uid) != supabase_uid:
            raise ConflictError("This account is already linked to a different sign-in identity")
        if existing.supabase_uid is None:
            existing.supabase_uid = supabase_uid
            existing.email_verified = True
            await db.commit()
            await db.refresh(existing)
        return _to_user_out(existing)

    if not department_id or not institution_id:
        raise ValidationAppError("Select an institution and department to complete student registration")
    department = (await db.execute(
        select(Department).where(Department.id == department_id)
    )).scalar_one_or_none()
    if department is None or str(department.institution_id) != institution_id:
        raise ValidationAppError("The selected department does not belong to the selected institution")
    institution = (await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )).scalar_one_or_none()
    if institution is None:
        raise ValidationAppError("The selected institution does not exist")

    matric_number = matric_number.strip() if matric_number else None
    if matric_number:
        existing_matric = (await db.execute(
            select(User.id).where(
                User.institution_id == institution_id,
                func.lower(User.matric_number) == matric_number.lower(),
            ).limit(1)
        )).scalar_one_or_none()
        if existing_matric:
            raise ConflictError("This matric number is already registered at this institution")

    # Self-registration case (public signup page) — always created as
    # 'student'. Supervisor/coordinator/admin accounts are NEVER created
    # through this path; they're provisioned via create_user() by a
    # coordinator or admin, per the platform's role hierarchy.
    new_user = User(
        supabase_uid=supabase_uid, email=email, full_name=full_name or email.split("@")[0],
        role=UserRole.student, email_verified=True,
        matric_number=matric_number, department_id=department_id, institution_id=institution_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return _to_user_out(new_user)


async def list_users(
    db: AsyncSession, user: AuthedUser, role: str | None = None, department_id: str | None = None,
    search: str | None = None, active_only: bool = False, page: int = 1, limit: int = 20,
) -> PaginatedUsersOut:
    query = select(User)

    if user.role == Role.COORDINATOR:
        query = query.where(User.department_id == user.department_id)
    elif user.role == Role.SUPERVISOR:
        # Supervisors may search their assigned students, but their own
        # supervisor record must remain discoverable when role-filtered.
        if role == UserRole.student.value:
            query = query.join(Pairing, Pairing.student_id == User.id).where(Pairing.supervisor_id == user.id).distinct()
        else:
            query = query.where(User.id == user.id)
    elif department_id:
        query = query.where(User.department_id == department_id)

    if role:
        query = query.where(User.role == role)
    if active_only:
        query = query.where(User.is_active.is_(True))
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(User.full_name.ilike(pattern), User.email.ilike(pattern), User.matric_number.ilike(pattern)))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    offset = (page - 1) * limit
    rows = (await db.execute(query.order_by(User.full_name.asc()).offset(offset).limit(limit))).scalars().all()

    pages = (total + limit - 1) // limit if total > 0 else 1
    return PaginatedUsersOut(items=[_to_list_item_out(u) for u in rows], total=total, page=page, limit=limit, pages=pages)


async def get_user(db: AsyncSession, requesting_user: AuthedUser, user_id: str) -> UserListItemOut:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise NotFoundError("User not found")

    is_self = requesting_user.id == str(target.id)
    is_dept_staff = requesting_user.role == Role.ADMIN or (requesting_user.role == Role.COORDINATOR and requesting_user.department_id == str(target.department_id))
    if not (is_self or is_dept_staff):
        raise PermissionError_("You don't have access to this profile")

    return _to_list_item_out(target)


async def create_user(db: AsyncSession, requesting_user: AuthedUser, data: UserCreateIn) -> UserOut:
    if requesting_user.role == Role.ADMIN:
        if data.role != "coordinator":
            raise PermissionError_("Admins can only provision coordinator accounts")
    elif requesting_user.role == Role.COORDINATOR:
        if requesting_user.department_id != data.department_id:
            raise PermissionError_("Coordinators can only add users to their own department")
        if data.role != "supervisor":
            raise PermissionError_("Coordinators can only provision supervisor accounts")
    else:
        raise PermissionError_("You cannot provision accounts")

    department = (await db.execute(
        select(Department).where(Department.id == data.department_id)
    )).scalar_one_or_none()
    if department is None or str(department.institution_id) != data.institution_id:
        raise ValidationAppError("Department does not belong to the selected institution")

    supabase_uid = await create_auth_user(data.email, data.password, data.full_name)

    new_user = User(
        supabase_uid=supabase_uid, email=data.email, full_name=data.full_name, role=UserRole(data.role), phone=data.phone,
        matric_number=data.matric_number, department_id=data.department_id, institution_id=data.institution_id,
        must_change_password=True,
    )
    db.add(new_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        await delete_auth_user(supabase_uid)
        raise ConflictError(f"A user with email {data.email} already exists")

    await db.refresh(new_user)
    return _to_user_out(new_user)


async def update_user(db: AsyncSession, requesting_user: AuthedUser, user_id: str, data: UserUpdateIn) -> UserOut:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise NotFoundError("User not found")

    if requesting_user.role == Role.COORDINATOR:
        if not coordinator_can_manage_user(requesting_user, target):
            raise PermissionError_("Coordinators can only edit supervisors in their own department")
        if data.department_id is not None and data.department_id != requesting_user.department_id:
            raise PermissionError_("Coordinators cannot move users to another department")
    elif requesting_user.role != Role.ADMIN:
        raise PermissionError_("You cannot edit this user")

    if data.full_name is not None:
        target.full_name = data.full_name
    if data.phone is not None:
        target.phone = data.phone
    if data.department_id is not None:
        department = (await db.execute(
            select(Department).where(Department.id == data.department_id)
        )).scalar_one_or_none()
        if department is None:
            raise ValidationAppError("Selected department does not exist")
        target.department_id = department.id
        target.institution_id = department.institution_id
    if data.is_active is not None:
        target.is_active = data.is_active

    await db.commit()
    await db.refresh(target)
    return _to_user_out(target)


async def delete_user(db: AsyncSession, requesting_user: AuthedUser, user_id: str) -> None:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise NotFoundError("User not found")

    is_dept_staff = requesting_user.role == Role.ADMIN or (
        coordinator_can_manage_user(requesting_user, target)
    )
    if not is_dept_staff:
        raise PermissionError_("You can only delete users in your own department")
    target.is_active = False
    await db.commit()


async def set_user_activation(db: AsyncSession, requesting_user: AuthedUser, user_id: str, is_active: bool) -> UserOut:
    target = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if target is None:
        raise NotFoundError("User not found")
    if target.role == UserRole.student and requesting_user.role == Role.SUPERVISOR:
        allowed = (await db.execute(
            select(Pairing).where(
                Pairing.supervisor_id == requesting_user.id,
                Pairing.student_id == target.id,
            ).limit(1)
        )).scalar_one_or_none() is not None
    elif requesting_user.role in (Role.ADMIN, Role.COORDINATOR) and (
        requesting_user.role == Role.COORDINATOR and requesting_user.department_id == str(target.department_id)
        or requesting_user.role == Role.ADMIN
    ) and target.role in (UserRole.student, UserRole.supervisor):
        allowed = True
    else:
        allowed = False
    if not allowed:
        raise PermissionError_("You can only manage students in your permitted scope")
    target.is_active = is_active
    await db.commit()
    await db.refresh(target)
    return _to_user_out(target)


EXPECTED_COLUMNS = {"email", "full_name", "role", "department_id", "institution_id"}


async def bulk_import_users(db: AsyncSession, requesting_user: AuthedUser, filename: str, file_bytes: bytes) -> BulkImportSummaryOut:
    rows = parse_tabular_file(filename, file_bytes)

    if not rows:
        raise ValidationAppError("File has no data rows")

    header_keys = set(rows[0].keys())
    if not EXPECTED_COLUMNS.issubset(header_keys) or not ({"password", "temporary_password"} & header_keys):
        raise ValidationAppError(f"File must contain columns: {', '.join(sorted(EXPECTED_COLUMNS))}")

    results, success_count = [], 0

    for row_number, row in enumerate(rows, start=2):
        supabase_uid = None
        try:
            role = (row.get("role") or "").strip().lower()
            department_id = (row.get("department_id") or "").strip()
            password = (row.get("password") or row.get("temporary_password") or "").strip()

            if len(password) < 8:
                raise ValidationAppError("password must be at least 8 characters")
            if role not in ("student", "supervisor"):
                raise PermissionError_("Bulk import only supports student and supervisor accounts")
            department = (await db.execute(select(Department).where(Department.id == department_id))).scalar_one_or_none()
            institution_id = (row.get("institution_id") or "").strip()
            institution = (await db.execute(select(Institution).where(Institution.id == institution_id))).scalar_one_or_none()
            if not department or not institution or str(department.institution_id) != institution_id:
                raise ValidationAppError("department_id and institution_id do not identify a matching department")

            # Same boundary as create_user(): a coordinator uploading a
            # spreadsheet can't sneak users into another department, and
            # can't bulk-create coordinators/admins.
            if requesting_user.role == Role.COORDINATOR:
                if department_id != requesting_user.department_id:
                    results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                        error_code="DEPARTMENT_FORBIDDEN", error_message="You can only import users into your own department"))
                    continue
                if role not in ("student", "supervisor"):
                    results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                        error_code="ROLE_FORBIDDEN", error_message="Coordinators can only import students or supervisors"))
                    continue

            if role not in {r.value for r in UserRole}:
                results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                    error_code="INVALID_ROLE", error_message=f"'{role}' is not a valid role"))
                continue

            email = (row.get("email") or "").strip().lower()
            full_name = (row.get("full_name") or "").strip()
            if not email or not full_name:
                raise ValidationAppError("email and full_name are required")
            supabase_uid = await create_auth_user(email, password, full_name)
            new_user = User(
                supabase_uid=supabase_uid, email=email, full_name=full_name, role=UserRole(role),
                phone=(row.get("phone") or "").strip() or None, matric_number=(row.get("matric_number") or "").strip() or None,
                department_id=department_id, institution_id=(row.get("institution_id") or "").strip(),
                must_change_password=True,
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            results.append(BulkImportResultOut(row_number=row_number, success=True, user_id=str(new_user.id), error_code=None, error_message=None))
            success_count += 1

        except IntegrityError:
            await db.rollback()
            if supabase_uid:
                await delete_auth_user(supabase_uid)
            results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                error_code="DUPLICATE_EMAIL", error_message="A user with this email already exists"))
        except (ValidationAppError, PermissionError_) as e:
            await db.rollback()
            if supabase_uid:
                await delete_auth_user(supabase_uid)
            results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                error_code="INVALID_ROW", error_message=str(e)))
        except Exception as e:
            await db.rollback()
            if supabase_uid:
                await delete_auth_user(supabase_uid)
            results.append(BulkImportResultOut(row_number=row_number, success=False, user_id=None,
                error_code="UNKNOWN_ERROR", error_message=str(e)))

    return BulkImportSummaryOut(total_rows=len(rows), success_count=success_count,
        failure_count=len(rows) - success_count, results=results)
