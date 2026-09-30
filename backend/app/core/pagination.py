from typing import Generic, List, Optional, TypeVar
from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        limit: int = Query(25, ge=1, le=100, description="Items per page"),
        search: Optional[str] = Query(None, description="Search keyword"),
        sort: Optional[str] = Query(None, description="Sort column"),
        order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    ):
        self.page = page
        self.limit = limit
        self.search = search
        self.sort = sort
        self.order = order

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResult(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    total_pages: int
    has_more: bool

    @classmethod
    def create(
        cls,
        *,
        items: List[T],
        total: int,
        page: int,
        limit: int,
    ) -> "PaginatedResult[T]":
        pages = (total + limit - 1) // limit if total else 0
        return cls(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=pages,
            has_more=page < pages,
        )
