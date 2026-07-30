from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.project import Project
from app.models.task import Task, TaskComment
from app.models.organization import Organization
from app.models.system import Notification, ActivityLog, AuditLog
from app.schemas.common import GlobalSearchItem


class SystemService:
    @staticmethod
    def global_search(db: Session, query_str: str, current_user: User) -> List[GlobalSearchItem]:
        results: List[GlobalSearchItem] = []
        term = f"%{query_str}%"
        
        # Search Users
        users = db.query(User).filter(
            (User.first_name.ilike(term)) | (User.last_name.ilike(term)) | (User.email.ilike(term))
        ).limit(5).all()
        for u in users:
            results.append(GlobalSearchItem(
                id=u.id,
                type="USER",
                title=u.full_name,
                subtitle=u.email,
                link=f"/users/{u.id}"
            ))

        # Search Projects
        projects = db.query(Project).filter(
            (Project.name.ilike(term)) | (Project.code.ilike(term))
        ).limit(5).all()
        for p in projects:
            results.append(GlobalSearchItem(
                id=p.id,
                type="PROJECT",
                title=p.name,
                subtitle=f"Code: {p.code} | Status: {p.status.value}",
                link=f"/projects/{p.id}"
            ))

        # Search Tasks
        tasks = db.query(Task).filter(
            (Task.title.ilike(term)) | (Task.description.ilike(term))
        ).limit(10).all()
        for t in tasks:
            results.append(GlobalSearchItem(
                id=t.id,
                type="TASK",
                title=t.title,
                subtitle=f"Status: {t.status.value} | Priority: {t.priority.value}",
                link=f"/tasks/{t.id}"
            ))

        # Search Organizations
        orgs = db.query(Organization).filter(
            (Organization.name.ilike(term)) | (Organization.slug.ilike(term))
        ).limit(5).all()
        for o in orgs:
            results.append(GlobalSearchItem(
                id=o.id,
                type="ORGANIZATION",
                title=o.name,
                subtitle=o.slug,
                link=f"/organizations/{o.id}"
            ))

        return results

    @staticmethod
    def get_user_notifications(db: Session, user_id: str) -> List[Notification]:
        return db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_notification_read(db: Session, notification_id: str, user_id: str):
        noti = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if noti:
            noti.is_read = True
            db.commit()

    @staticmethod
    def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
