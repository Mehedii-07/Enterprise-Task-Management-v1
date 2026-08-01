from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.user import User, RoleType, Role
from app.models.project import Project, ProjectStatus
import calendar
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/admin")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    org_id = current_user.organization_id
    
    # 1. Financial Income/Budget Graph Data (grouped by month and project state)
    # Since sqlite/postgres func.extract or strftime can be tricky cross-db, we'll fetch projects and aggregate in python
    projects = db.query(Project).filter(Project.organization_id == org_id).all()
    
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
                "active_revenue": 0.0
            }
            
        budget = project.budget or 0.0
        monthly_financials[month_name]["revenue"] += budget
        
        if project.status == ProjectStatus.COMPLETED:
            monthly_financials[month_name]["completed_revenue"] += budget
        elif project.status == ProjectStatus.ACTIVE:
            monthly_financials[month_name]["active_revenue"] += budget
            
    financial_data = list(monthly_financials.values())
    
    # Sort months by calendar order
    month_to_num = {v: k for k, v in enumerate(calendar.month_abbr) if k > 0}
    financial_data.sort(key=lambda x: month_to_num.get(x["month"], 0))

    # 2. Employee Productivity Board
    # Employees in the org
    employees = db.query(User).join(Role).filter(
        User.organization_id == org_id,
        Role.name == RoleType.EMPLOYEE.value
    ).all()
    
    employee_stats = []
    for emp in employees:
        assigned_projects = [p for p in projects if p.assigned_to_id == emp.id]
        total_assigned = len(assigned_projects)
        completed_count = len([p for p in assigned_projects if p.status == ProjectStatus.COMPLETED])
        completion_rate = (completed_count / total_assigned * 100) if total_assigned > 0 else 0.0
        
        employee_stats.append({
            "employee_id": emp.id,
            "name": emp.full_name,
            "avatar_url": emp.avatar_url,
            "job_title": emp.job_title,
            "total_assigned": total_assigned,
            "completed": completed_count,
            "completion_rate": round(completion_rate, 2)
        })

    # Sort by completion rate descending
    employee_stats.sort(key=lambda x: x["completion_rate"], reverse=True)

    return {
        "financial_chart": financial_data,
        "employee_productivity": employee_stats
    }
