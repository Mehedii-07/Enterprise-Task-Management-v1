from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User, RoleType, Role
from app.models.project import Project, ProjectStatus, ProjectPhase, ProjectPriority
from app.models.task import Task, TaskStatus
import calendar
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def compute_project_analytics(db: Session, current_user: User) -> Dict[str, Any]:
    org_id = current_user.organization_id
    is_ceo = current_user.role and current_user.role.name.upper() == RoleType.CEO.value

    # CEO has global multi-tenant project visibility; Admin has org-level visibility
    if is_ceo:
        projects = db.query(Project).all()
        employees = db.query(User).join(Role).filter(
            Role.name == RoleType.EMPLOYEE.value
        ).all()
    else:
        projects = db.query(Project).filter(Project.organization_id == org_id).all()
        employees = db.query(User).join(Role).filter(
            User.organization_id == org_id,
            Role.name == RoleType.EMPLOYEE.value
        ).all()

    now = datetime.utcnow()
    total_projects = len(projects)

    # 1. Financial Income/Budget Graph Data (grouped by month and project state)
    monthly_financials = {}
    for project in projects:
        if not project.created_at:
            continue

        month_num = project.created_at.month
        month_name = calendar.month_abbr[month_num]

        if month_name not in monthly_financials:
            monthly_financials[month_name] = {
                "month": month_name,
                "revenue": 0.0,
                "completed_revenue": 0.0,
                "active_revenue": 0.0,
                "projects_count": 0,
                "projects": []
            }

        budget = project.budget or 0.0
        monthly_financials[month_name]["revenue"] += budget
        monthly_financials[month_name]["projects_count"] += 1
        monthly_financials[month_name]["projects"].append({
            "id": project.id,
            "code": project.code,
            "name": project.name,
            "budget": budget,
            "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
            "phase": project.phase.value if hasattr(project.phase, 'value') else str(project.phase),
            "progress_percentage": project.progress_percentage
        })

        if project.status == ProjectStatus.COMPLETED:
            monthly_financials[month_name]["completed_revenue"] += budget
        else:
            monthly_financials[month_name]["active_revenue"] += budget

    for item in monthly_financials.values():
        rev = item["revenue"]
        comp = item["completed_revenue"]
        item["realization_rate"] = round((comp / rev * 100), 1) if rev > 0 else 0.0

    financial_data = list(monthly_financials.values())
    month_to_num = {v: k for k, v in enumerate(calendar.month_abbr) if k > 0}
    financial_data.sort(key=lambda x: month_to_num.get(x["month"], 0))

    # 2. Project Phase Distribution
    phase_counts = {
        "Planning": 0,
        "In Progress": 0,
        "Testing": 0,
        "Completed": 0,
        "On Hold": 0
    }
    for p in projects:
        phase_str = p.phase.value if hasattr(p.phase, 'value') else str(p.phase)
        phase_key = phase_str.title() if phase_str else "Planning"
        if phase_key in phase_counts:
            phase_counts[phase_key] += 1
        elif "progress" in phase_str.lower():
            phase_counts["In Progress"] += 1
        elif "test" in phase_str.lower():
            phase_counts["Testing"] += 1
        elif "complete" in phase_str.lower():
            phase_counts["Completed"] += 1
        elif "hold" in phase_str.lower():
            phase_counts["On Hold"] += 1
        else:
            phase_counts["Planning"] += 1

    phase_distribution = [
        {
            "phase": phase_name,
            "count": count,
            "percentage": round((count / total_projects * 100), 1) if total_projects > 0 else 0.0
        }
        for phase_name, count in phase_counts.items()
    ]

    # 3. Status Distribution
    status_distribution = {
        "ACTIVE": len([p for p in projects if p.status == ProjectStatus.ACTIVE]),
        "COMPLETED": len([p for p in projects if p.status == ProjectStatus.COMPLETED]),
        "PLANNING": len([p for p in projects if p.status == ProjectStatus.PLANNING]),
        "ON_HOLD": len([p for p in projects if p.status == ProjectStatus.ON_HOLD]),
        "ARCHIVED": len([p for p in projects if p.status == ProjectStatus.ARCHIVED]),
    }

    # 4. Priority Distribution
    priority_distribution = {
        "CRITICAL": len([p for p in projects if p.priority == ProjectPriority.CRITICAL]),
        "HIGH": len([p for p in projects if p.priority == ProjectPriority.HIGH]),
        "MEDIUM": len([p for p in projects if p.priority == ProjectPriority.MEDIUM]),
        "LOW": len([p for p in projects if p.priority == ProjectPriority.LOW]),
    }

    # 5. Project Health Status (On Track vs Overdue vs Completed)
    overdue_count = len([p for p in projects if p.end_date and p.end_date < now and p.status != ProjectStatus.COMPLETED])
    completed_count = status_distribution["COMPLETED"]
    # All projects not overdue are on track
    on_track_count = len([p for p in projects if not (p.end_date and p.end_date < now and p.status != ProjectStatus.COMPLETED)])
    active_on_track = len([p for p in projects if p.status != ProjectStatus.COMPLETED and not (p.end_date and p.end_date < now)])

    project_health = {
        "on_track": on_track_count,
        "active_on_track": active_on_track,
        "overdue": overdue_count,
        "completed": completed_count
    }

    # 6. Project KPIs & Velocity
    total_budget = sum(p.budget or 0.0 for p in projects)
    completed_revenue = sum(p.budget or 0.0 for p in projects if p.status == ProjectStatus.COMPLETED)
    remaining_budget = sum(p.budget or 0.0 for p in projects if p.status != ProjectStatus.COMPLETED)

    avg_progress = round(sum(p.progress_percentage for p in projects) / total_projects, 1) if total_projects > 0 else 0.0

    all_milestones = []
    all_tasks = []
    for p in projects:
        if p.milestones:
            all_milestones.extend(p.milestones)
        if p.tasks:
            all_tasks.extend(p.tasks)

    total_milestones = len(all_milestones)
    completed_milestones = sum(1 for m in all_milestones if m.is_completed)
    milestone_rate = round((completed_milestones / total_milestones * 100), 1) if total_milestones > 0 else 0.0

    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == TaskStatus.COMPLETED)
    task_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    summary = {
        "total_projects": total_projects,
        "active_projects": status_distribution["ACTIVE"],
        "completed_projects": completed_count,
        "total_budget": total_budget,
        "completed_revenue": completed_revenue,
        "remaining_budget": remaining_budget,
        "avg_progress": avg_progress,
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
        "milestone_completion_rate": milestone_rate,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "task_completion_rate": task_rate
    }

    # 7. Employee Productivity Board
    employee_stats = []
    for emp in employees:
        assigned_projects = [
            p for p in projects
            if p.assigned_to_id == emp.id or any(m.user_id == emp.id for m in p.members)
        ]
        total_assigned = len(assigned_projects)
        emp_completed = len([p for p in assigned_projects if p.status == ProjectStatus.COMPLETED])
        completion_rate = (emp_completed / total_assigned * 100) if total_assigned > 0 else 0.0

        employee_stats.append({
            "employee_id": emp.id,
            "name": emp.full_name,
            "avatar_url": emp.avatar_url,
            "job_title": emp.job_title,
            "total_assigned": total_assigned,
            "completed": emp_completed,
            "completion_rate": round(completion_rate, 2)
        })

    employee_stats.sort(key=lambda x: x["completion_rate"], reverse=True)

    return {
        "financial_chart": financial_data,
        "phase_distribution": phase_distribution,
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
        "project_health": project_health,
        "summary": summary,
        "employee_productivity": employee_stats
    }


@router.get("/admin")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return compute_project_analytics(db, current_user)


@router.get("/ceo")
def get_ceo_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return compute_project_analytics(db, current_user)


@router.get("/projects")
def get_project_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return compute_project_analytics(db, current_user)
