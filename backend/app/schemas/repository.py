"""PARK — Repository Schemas"""

from pydantic import BaseModel
from typing import Literal

RepoStatusLiteral = Literal["published", "hidden", "withdrawn"]
SortByLiteral = Literal["relevance", "newest", "most_viewed"]


class RepositoryProjectOut(BaseModel):
    id: str
    title: str
    student_name: str
    academic_year: str
    keywords: list[str] | None
    view_count: int
    download_count: int


class RepositoryProjectDetailOut(RepositoryProjectOut):
    student_matric: str
    supervisor_name: str
    abstract: str | None
    department_id: str
    chapter_count: int
    final_copy_url: str | None


class SearchResultsOut(BaseModel):
    items: list[RepositoryProjectOut]
    total: int
    page: int
    limit: int
    query: str | None


class DownloadUrlOut(BaseModel):
    download_url: str
    expires_in: int


class RepositoryStatusUpdateIn(BaseModel):
    status: RepoStatusLiteral
