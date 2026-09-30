import logging
from typing import Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .responses import error_response

logger = logging.getLogger("otopost.errors")


class ErrorCode:
    AUTH_REQUIRED = "AUTH_REQUIRED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: Any = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class AuthRequiredException(AppException):
    def __init__(self, message: str = "Autentikasi diperlukan untuk melanjutkan"):
        super().__init__(ErrorCode.AUTH_REQUIRED, message, 401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Akses ditolak"):
        super().__init__(ErrorCode.FORBIDDEN, message, 403)


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource tidak ditemukan"):
        super().__init__(ErrorCode.NOT_FOUND, message, 404)


class ConflictException(AppException):
    def __init__(self, message: str = "Data sudah ada atau terjadi konflik"):
        super().__init__(ErrorCode.CONFLICT, message, 409)


class ValidationException(AppException):
    def __init__(self, message: str = "Data tidak valid", details: Any = None):
        super().__init__(ErrorCode.VALIDATION_ERROR, message, 422, details)


class RateLimitedException(AppException):
    def __init__(self, message: str = "Terlalu banyak permintaan. Silakan coba sesaat lagi"):
        super().__init__(ErrorCode.RATE_LIMITED, message, 429)


class InternalErrorException(AppException):
    def __init__(self, message: str = "Terjadi kesalahan internal pada server"):
        super().__init__(ErrorCode.INTERNAL_ERROR, message, 500)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return error_response(exc.code, exc.message, exc.status_code)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        code_map = {
            401: ErrorCode.AUTH_REQUIRED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            409: ErrorCode.CONFLICT,
            422: ErrorCode.VALIDATION_ERROR,
            429: ErrorCode.RATE_LIMITED,
        }
        code = code_map.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
        msg = str(exc.detail) if exc.detail else "Terjadi kesalahan"
        return error_response(code, msg, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        msg = "Format data tidak valid"
        if errors and len(errors) > 0:
            first = errors[0]
            loc = " -> ".join(str(l) for l in first.get("loc", []) if l != "body")
            m = first.get("msg", "")
            msg = f"{loc}: {m}" if loc else m
        return error_response(ErrorCode.VALIDATION_ERROR, msg, 422)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return error_response(ErrorCode.INTERNAL_ERROR, "Terjadi gangguan sistem. Silakan coba kembali nanti.", 500)

