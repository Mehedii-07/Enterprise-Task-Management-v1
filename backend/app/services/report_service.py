import io
import csv
import pandas as pd
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.task import Task, WorkLog
from app.models.project import Project, ProjectMember
from app.models.user import User, RoleType


class ReportService:
    @staticmethod
    def generate_csv_report(data: List[Dict[str, Any]]) -> str:
        if not data:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    @staticmethod
    def generate_excel_report(data: List[Dict[str, Any]]) -> bytes:
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Report')
        return output.getvalue()

    @staticmethod
    def generate_task_report_data(db: Session, user: User) -> List[Dict[str, Any]]:
        query = db.query(Task).join(Project)
        role = user.role.name.upper()
        if role != RoleType.CEO.value:
            query = query.filter(Project.organization_id == user.organization_id)
            if role in [RoleType.TEAM_LEAD.value, RoleType.EMPLOYEE.value]:
                query = query.join(ProjectMember, ProjectMember.project_id == Project.id).filter(ProjectMember.user_id == user.id)
        tasks = query.all()
        report = []
        for t in tasks:
            report.append({
                "Task ID": t.id,
                "Title": t.title,
                "Project": t.project.name if t.project else "",
                "Status": t.status.value,
                "Priority": t.priority.value,
                "Assignee": t.assignee.full_name if t.assignee else "Unassigned",
                "Due Date": t.due_date.strftime("%Y-%m-%d") if t.due_date else "",
                "Estimated Hours": t.estimated_hours,
                "Actual Hours": t.actual_hours
            })
        return report

    @staticmethod
    def generate_worklog_report_data(db: Session, user: User) -> List[Dict[str, Any]]:
        query = db.query(WorkLog).join(User)
        role = user.role.name.upper()
        if role != RoleType.CEO.value:
            query = query.filter(User.organization_id == user.organization_id)
            if role == RoleType.EMPLOYEE.value:
                query = query.filter(WorkLog.user_id == user.id)
        logs = query.all()
        report = []
        for l in logs:
            report.append({
                "Log ID": l.id,
                "User": l.user.full_name if l.user else "",
                "Task": l.task.title if l.task else "",
                "Hours Logged": l.hours_logged,
                "Description": l.description or "",
                "Date": l.log_date.strftime("%Y-%m-%d") if l.log_date else ""
            })
        return report

    @staticmethod
    def generate_project_progress_report_data(db: Session, user: User) -> List[Dict[str, Any]]:
        query = db.query(Project)
        role = user.role.name.upper()
        
        if role == RoleType.CEO.value:
            pass
        elif role == RoleType.ADMIN.value:
            query = query.filter(Project.organization_id == user.organization_id)
        elif role in [RoleType.TEAM_LEAD.value, RoleType.EMPLOYEE.value]:
            query = query.filter(Project.organization_id == user.organization_id).join(ProjectMember).filter(ProjectMember.user_id == user.id)
            
        projects = query.all()
        report = []
        for p in projects:
            total_tasks = len(p.tasks) if p.tasks else 0
            completed_tasks = len([t for t in p.tasks if t.status.value == "COMPLETED"]) if p.tasks else 0
            progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            total_actual_hours = sum([t.actual_hours or 0 for t in p.tasks]) if p.tasks else 0
            
            report.append({
                "Project ID": p.id,
                "Name": p.name,
                "Code": p.code,
                "Status": p.status.value,
                "Priority": p.priority.value,
                "Manager": p.manager.full_name if p.manager else "Unassigned",
                "Budget": p.budget,
                "Total Tasks": total_tasks,
                "Completed Tasks": completed_tasks,
                "Progress (%)": round(progress, 2),
                "Total Actual Hours": total_actual_hours
            })
        return report
