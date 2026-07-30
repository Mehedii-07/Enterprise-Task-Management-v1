from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.user import User, Role, RoleType
from app.models.organization import Organization, Department
from app.models.project import Project, ProjectStatus, ProjectMember
from app.models.task import Task, TaskStatus, TaskPriority, WorkLog
from app.models.system import AuditLog, ActivityLog
from app.schemas.dashboard import EmployeeDashboardResponse, TeamLeadDashboardResponse, AdminDashboardResponse, CEODashboardResponse


class DashboardService:
    @staticmethod
    def get_employee_dashboard(db: Session, user: User) -> Dict[str, Any]:
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        
        project_member_subq = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user.id).subquery()
        
        assigned_tasks = db.query(Task).filter(
            or_(
                Task.assignee_id == user.id,
                Task.project_id.in_(project_member_subq)
            )
        ).all()
        
        my_tasks_count = len(assigned_tasks)
        todays_tasks_count = len([t for t in assigned_tasks if t.due_date and t.due_date >= today_start and t.due_date < today_start + timedelta(days=1)])
        completed_tasks = [t for t in assigned_tasks if t.status == TaskStatus.COMPLETED]
        completed_tasks_count = len(completed_tasks)
        pending_tasks_count = len([t for t in assigned_tasks if t.status in [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.TESTING]])
        overdue_tasks_count = len([t for t in assigned_tasks if t.due_date and t.due_date < now and t.status != TaskStatus.COMPLETED])
        
        todo_count = len([t for t in assigned_tasks if t.status == TaskStatus.TODO])
        in_progress_count = len([t for t in assigned_tasks if t.status == TaskStatus.IN_PROGRESS])
        review_count = len([t for t in assigned_tasks if t.status == TaskStatus.REVIEW])
        testing_count = len([t for t in assigned_tasks if t.status == TaskStatus.TESTING])
        
        total_hours = db.query(func.sum(WorkLog.hours_logged)).filter(WorkLog.user_id == user.id).scalar() or 0.0
        
        task_completion_rate = round((completed_tasks_count / my_tasks_count * 100), 2) if my_tasks_count > 0 else 100.0
        productivity_score = min(100.0, round(completed_tasks_count * 10.0 + total_hours * 2.5, 1))
        
        recent_tasks = db.query(Task).filter(
            or_(
                Task.assignee_id == user.id,
                Task.project_id.in_(project_member_subq)
            )
        ).order_by(Task.updated_at.desc()).limit(5).all()
        
        upcoming_deadlines = db.query(Task).filter(
            Task.status != TaskStatus.COMPLETED,
            Task.due_date != None,
            or_(
                Task.assignee_id == user.id,
                Task.project_id.in_(project_member_subq)
            )
        ).order_by(Task.due_date.asc()).limit(5).all()
        
        # Team contribution calculations
        org_tasks = db.query(Task).join(Project).filter(Project.organization_id == user.organization_id).all()
        total_team_tasks = len(org_tasks)
        completed_team_tasks = len([t for t in org_tasks if t.status == TaskStatus.COMPLETED])
        team_progress_pct = round((completed_team_tasks / total_team_tasks * 100), 2) if total_team_tasks > 0 else 100.0

        assigned_projects = db.query(Project).filter(
            Project.organization_id == user.organization_id,
            or_(
                Project.members.any(ProjectMember.user_id == user.id),
                Project.tasks.any(Task.assignee_id == user.id)
            )
        ).all()

        return {
            "my_tasks_count": my_tasks_count,
            "todays_tasks_count": todays_tasks_count,
            "completed_tasks_count": completed_tasks_count,
            "pending_tasks_count": pending_tasks_count,
            "overdue_tasks_count": overdue_tasks_count,
            "todo_count": todo_count,
            "in_progress_count": in_progress_count,
            "review_count": review_count,
            "testing_count": testing_count,
            "total_hours_logged": round(total_hours, 2),
            "productivity_score": productivity_score,
            "task_completion_rate": task_completion_rate,
            "current_sprint_progress": min(100.0, task_completion_rate),
            "recent_tasks": recent_tasks,
            "upcoming_deadlines": upcoming_deadlines,
            "recent_activities": [],
            "assigned_projects": assigned_projects,
            "team_contribution": {
                "total_team_tasks": total_team_tasks,
                "completed_team_tasks": completed_team_tasks,
                "pending_team_tasks": total_team_tasks - completed_team_tasks,
                "team_progress_percentage": team_progress_pct,
                "leaderboard": []
            }
        }

    @staticmethod
    def get_team_lead_dashboard(db: Session, user: User) -> Dict[str, Any]:
        now = datetime.utcnow()
        team_members_count = db.query(User).filter(User.organization_id == user.organization_id, User.department_id == user.department_id).count()
        active_projects_count = db.query(Project).filter(Project.organization_id == user.organization_id, Project.status == ProjectStatus.ACTIVE).count()
        
        team_tasks = db.query(Task).join(Project).filter(Project.organization_id == user.organization_id).all()
        total_team_tasks = len(team_tasks)
        completed_team_tasks = len([t for t in team_tasks if t.status == TaskStatus.COMPLETED])
        pending_team_tasks = len([t for t in team_tasks if t.status != TaskStatus.COMPLETED])
        overdue_team_tasks = len([t for t in team_tasks if t.due_date and t.due_date < now and t.status != TaskStatus.COMPLETED])
        
        team_completion_rate = round((completed_team_tasks / total_team_tasks * 100), 2) if total_team_tasks > 0 else 100.0
        
        recent_team_tasks = db.query(Task).join(Project).filter(Project.organization_id == user.organization_id).order_by(Task.created_at.desc()).limit(10).all()
        active_projects = db.query(Project).filter(Project.organization_id == user.organization_id, Project.status == ProjectStatus.ACTIVE).all()

        return {
            "team_size": team_members_count,
            "active_projects_count": active_projects_count,
            "total_team_tasks": total_team_tasks,
            "completed_team_tasks": completed_team_tasks,
            "pending_team_tasks": pending_team_tasks,
            "overdue_team_tasks": overdue_team_tasks,
            "team_completion_rate": team_completion_rate,
            "average_team_performance": 88.5,
            "recent_team_tasks": recent_team_tasks,
            "team_leaderboard": [],
            "active_projects": active_projects,
            "project_progress": []
        }

    @staticmethod
    def get_admin_dashboard(db: Session, user: User) -> Dict[str, Any]:
        now = datetime.utcnow()
        org_id = user.organization_id
        
        total_employees = db.query(User).join(Role).filter(User.organization_id == org_id, Role.name == RoleType.EMPLOYEE.value).count()
        total_team_leads = db.query(User).join(Role).filter(User.organization_id == org_id, Role.name == RoleType.TEAM_LEAD.value).count()
        
        projects = db.query(Project).filter(Project.organization_id == org_id).all()
        active_projects = len([p for p in projects if p.status == ProjectStatus.ACTIVE])
        completed_projects = len([p for p in projects if p.status == ProjectStatus.COMPLETED])
        pending_projects = len([p for p in projects if p.status in [ProjectStatus.PLANNING, ProjectStatus.ON_HOLD]])
        overdue_projects = len([p for p in projects if p.end_date and p.end_date < now and p.status != ProjectStatus.COMPLETED])
        
        tasks = db.query(Task).join(Project).filter(Project.organization_id == org_id).all()
        
        tasks_by_status = {
            "TODO": len([t for t in tasks if t.status == TaskStatus.TODO]),
            "IN_PROGRESS": len([t for t in tasks if t.status == TaskStatus.IN_PROGRESS]),
            "REVIEW": len([t for t in tasks if t.status == TaskStatus.REVIEW]),
            "TESTING": len([t for t in tasks if t.status == TaskStatus.TESTING]),
            "COMPLETED": len([t for t in tasks if t.status == TaskStatus.COMPLETED]),
            "CANCELLED": len([t for t in tasks if t.status == TaskStatus.CANCELLED])
        }
        
        tasks_by_priority = {
            "LOW": len([t for t in tasks if t.priority == TaskPriority.LOW]),
            "MEDIUM": len([t for t in tasks if t.priority == TaskPriority.MEDIUM]),
            "HIGH": len([t for t in tasks if t.priority == TaskPriority.HIGH]),
            "CRITICAL": len([t for t in tasks if t.priority == TaskPriority.CRITICAL])
        }

        return {
            "total_employees": total_employees,
            "total_team_leads": total_team_leads,
            "active_projects": active_projects,
            "completed_projects": completed_projects,
            "pending_projects": pending_projects,
            "overdue_projects": overdue_projects,
            "tasks_by_status": tasks_by_status,
            "tasks_by_priority": tasks_by_priority,
            "department_performance": [],
            "monthly_productivity": [],
            "organization_performance_score": 92.4,
            "employee_ranking": [],
            "late_task_statistics": {"total_late": len([t for t in tasks if t.due_date and t.due_date < now and t.status != TaskStatus.COMPLETED])}
        }

    @staticmethod
    def get_ceo_dashboard(db: Session) -> Dict[str, Any]:
        now = datetime.utcnow()
        
        total_organizations = db.query(Organization).count()
        total_users = db.query(User).count()
        total_admins = db.query(User).join(Role).filter(Role.name == RoleType.ADMIN.value).count()
        total_team_leads = db.query(User).join(Role).filter(Role.name == RoleType.TEAM_LEAD.value).count()
        total_employees = db.query(User).join(Role).filter(Role.name == RoleType.EMPLOYEE.value).count()
        
        projects = db.query(Project).all()
        total_projects = len(projects)
        completed_projects = len([p for p in projects if p.status == ProjectStatus.COMPLETED])
        pending_projects = len([p for p in projects if p.status in [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD]])
        overdue_projects = len([p for p in projects if p.end_date and p.end_date < now and p.status != ProjectStatus.COMPLETED])

        return {
            "total_organizations": total_organizations,
            "total_users": total_users,
            "total_admins": total_admins,
            "total_team_leads": total_team_leads,
            "total_employees": total_employees,
            "total_projects": total_projects,
            "completed_projects": completed_projects,
            "pending_projects": pending_projects,
            "overdue_projects": overdue_projects,
            "active_projects": [p for p in projects if p.status in [ProjectStatus.PLANNING, ProjectStatus.ACTIVE]],
            "system_usage_score": 95.5,
            "organization_performance": [],
            "employee_performance": [],
            "task_analytics": {"total_tasks": db.query(Task).count()},
            "project_analytics": {"total_projects": total_projects},
            "login_statistics": {"active_sessions": db.query(User).filter(User.is_active == True).count()},
            "organization_comparison": [],
            "recent_audit_logs": []
        }
