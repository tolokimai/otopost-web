from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse

T = TypeVar("T")


class ApiErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error catalog code")
    message: str = Field(..., description="Human-readable safe explanation")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: str = ""


class ApiErrorResponse(BaseModel):
    success: bool = False
    error: ApiErrorDetail


def success_response(data: Optional[T] = None, message: str = "") -> dict:
    """Standard success envelope mandated by the Engineering Constitution."""
    return {
        "success": True,
        "data": data,
        "message": message,
    }


def error_response(code: str, message: str, status_code: int = 400) -> JSONResponse:
    """Standard error response envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
            },
        },
    )

