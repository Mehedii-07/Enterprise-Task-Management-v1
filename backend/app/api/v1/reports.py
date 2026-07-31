from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_admin, require_authenticated, get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/tasks/csv")
def export_tasks_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_task_report_data(db, current_user)
    csv_content = ReportService.generate_csv_report(data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tasks_report.csv"}
    )


@router.get("/tasks/excel")
def export_tasks_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_task_report_data(db, current_user)
    excel_content = ReportService.generate_excel_report(data)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tasks_report.xlsx"}
    )


@router.get("/work-logs/csv")
def export_worklogs_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_worklog_report_data(db, current_user)
    csv_content = ReportService.generate_csv_report(data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=worklogs_report.csv"}
    )


@router.get("/projects/progress/csv")
def export_projects_progress_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_project_progress_report_data(db, current_user)
    csv_content = ReportService.generate_csv_report(data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=projects_progress_report.csv"}
    )


@router.get("/projects/progress/excel")
def export_projects_progress_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_project_progress_report_data(db, current_user)
    excel_content = ReportService.generate_excel_report(data)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=projects_progress_report.xlsx"}
    )


@router.get("/projects/task-breakdown/excel")
def export_task_breakdown_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    data = ReportService.generate_project_task_breakdown_data(db, current_user)
    excel_content = ReportService.generate_excel_report(data)
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=project_task_breakdown.xlsx"}
    )
