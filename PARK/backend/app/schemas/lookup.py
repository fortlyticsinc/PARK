"""PARK — Institution & Department Schemas"""

from pydantic import BaseModel, Field, field_validator


class InstitutionOut(BaseModel):
    id: str
    name: str
    code: str | None
    academic_session: str | None = None

    class Config:
        from_attributes = True


class InstitutionCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str | None = None


class InstitutionUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = None


class AcademicSessionUpdateIn(BaseModel):
    academic_session: str = Field(pattern=r"^\d{4}/\d{4}$")

    @field_validator("academic_session")
    @classmethod
    def validate_consecutive_years(cls, value: str) -> str:
        start_year, end_year = (int(year) for year in value.split("/"))
        if end_year != start_year + 1:
            raise ValueError("Academic session must use consecutive years, e.g. 2025/2026")
        return value


class DepartmentOut(BaseModel):
    id: str
    institution_id: str
    name: str
    code: str | None
    coordinator_id: str | None

    class Config:
        from_attributes = True


class DepartmentCreateIn(BaseModel):
    institution_id: str
    name: str = Field(min_length=2, max_length=200)
    code: str | None = None


class DepartmentUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = None
    coordinator_id: str | None = None
