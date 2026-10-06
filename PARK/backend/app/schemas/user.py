"""PARK — User Schemas"""

from pydantic import BaseModel, EmailStr, Field
from typing import Literal

RoleLiteral = Literal["student", "supervisor", "coordinator", "admin"]


class UserOut(BaseModel):
    id: str
    email: str
    role: RoleLiteral
    full_name: str | None
    department_id: str | None
    institution_id: str | None
    avatar_url: str | None
    is_active: bool = True
    must_change_password: bool = False

    class Config:
        from_attributes = True


class UserListItemOut(UserOut):
    phone: str | None = None
    matric_number: str | None = None
    is_active: bool = True


class PaginatedUsersOut(BaseModel):
    items: list[UserListItemOut]
    total: int
    page: int
    limit: int
    pages: int


class UserCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=200)
    role: RoleLiteral
    phone: str | None = None
    matric_number: str | None = None
    department_id: str
    institution_id: str


class UserUpdateIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    department_id: str | None = None
    is_active: bool | None = None


class BulkImportResultOut(BaseModel):
    row_number: int
    success: bool
    user_id: str | None
    error_code: str | None
    error_message: str | None


class BulkImportSummaryOut(BaseModel):
    total_rows: int
    success_count: int
    failure_count: int
    results: list[BulkImportResultOut]
