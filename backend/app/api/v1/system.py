from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, require_ceo
from app.models.user import User
from app.schemas.common import GlobalSearchItem, MessageResponse
from app.services.system_service import SystemService

router = APIRouter(prefix="/system", tags=["System, Search & Notifications"])


@router.get("/search", response_model=List[GlobalSearchItem])
def global_search(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return SystemService.global_search(db, q, current_user)


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return SystemService.get_user_notifications(db, current_user.id)


@router.post("/notifications/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    SystemService.mark_notification_read(db, notification_id, current_user.id)
    return MessageResponse(message="Notification marked as read.")


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    return SystemService.get_audit_logs(db, skip, limit)
