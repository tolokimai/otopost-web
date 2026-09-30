from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..core.deps import require_admin
from ..core.pagination import PaginatedResult, PaginationParams
from ..core.responses import ApiResponse, success_response
from ..db import models
from ..db.base import get_db
from ..schemas.admin import (
    MenuCreate,
    MenuUpdate,
    PlanCreate,
    PlanUpdate,
    SettingUpdate,
    UserAdminUpdate,
)
from ..services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=ApiResponse[Dict[str, Any]])
def overview(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    return success_response(data=service.get_overview())


@router.get("/plans", response_model=ApiResponse[Dict[str, Any]])
def list_plans(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    return success_response(data={"plans": service.list_plans()})


@router.post("/plans", response_model=ApiResponse[Dict[str, Any]])
def create_plan(
    req: PlanCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.create_plan(req.model_dump(), actor_id=admin.id)
    return success_response(data=data, message="Paket berhasil dibuat")


@router.put("/plans/{plan_id}", response_model=ApiResponse[Dict[str, Any]])
def update_plan(
    plan_id: str,
    req: PlanUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.update_plan(plan_id, req.model_dump(exclude_unset=True), actor_id=admin.id)
    return success_response(data=data, message="Paket berhasil diperbarui")


@router.delete("/plans/{plan_id}", response_model=ApiResponse[None])
def delete_plan(
    plan_id: str,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    service.delete_plan(plan_id, actor_id=admin.id)
    return success_response(message="Paket berhasil dihapus")


@router.get("/settings", response_model=ApiResponse[Dict[str, Any]])
def list_settings(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    return success_response(data={"settings": service.list_settings()})


@router.put("/settings/{key}", response_model=ApiResponse[Dict[str, Any]])
def update_setting(
    key: str,
    req: SettingUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.update_setting(key, value=req.value or "", clear=bool(req.clear), actor_id=admin.id)
    return success_response(data=data, message="Pengaturan berhasil disimpan")


@router.get("/menus", response_model=ApiResponse[Dict[str, Any]])
def list_menus(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    return success_response(data={"menus": service.list_menus()})


@router.post("/menus", response_model=ApiResponse[Dict[str, Any]])
def create_menu(
    req: MenuCreate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.create_menu(req.model_dump(), actor_id=admin.id)
    return success_response(data=data, message="Menu berhasil ditambahkan")


@router.put("/menus/{menu_id}", response_model=ApiResponse[Dict[str, Any]])
def update_menu(
    menu_id: str,
    req: MenuUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.update_menu(menu_id, req.model_dump(exclude_unset=True), actor_id=admin.id)
    return success_response(data=data, message="Menu berhasil diperbarui")


@router.delete("/menus/{menu_id}", response_model=ApiResponse[None])
def delete_menu(
    menu_id: str,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    service.delete_menu(menu_id, actor_id=admin.id)
    return success_response(message="Menu berhasil dihapus")


@router.get("/users", response_model=ApiResponse[Dict[str, Any]])
def list_users(
    params: PaginationParams = Depends(),
    q: str = Query(default="", description="Backward-compatible search"),
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    search_term = params.search or q
    service = AdminService(db)
    res = service.list_users(page=params.page, limit=params.limit, search=search_term)
    return success_response(
        data={
            "users": res.items,
            "total": res.total,
            "page": res.page,
            "limit": res.limit,
            "totalPages": res.total_pages,
        }
    )


@router.put("/users/{user_id}", response_model=ApiResponse[Dict[str, Any]])
def update_user(
    user_id: str,
    req: UserAdminUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    data = service.update_user(user_id, req.model_dump(exclude_unset=True), admin)
    return success_response(data=data, message="Data user berhasil diperbarui")

