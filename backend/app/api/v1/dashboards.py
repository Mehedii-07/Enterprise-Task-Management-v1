from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, require_team_lead, require_admin, require_ceo
from app.models.user import User
from app.schemas.dashboard import EmployeeDashboardResponse, TeamLeadDashboardResponse, AdminDashboardResponse, CEODashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboards", tags=["Dashboards & Analytics"])


@router.get("/employee", response_model=EmployeeDashboardResponse)
def get_employee_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return DashboardService.get_employee_dashboard(db, current_user)


@router.get("/team-lead", response_model=TeamLeadDashboardResponse)
def get_team_lead_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead)
):
    return DashboardService.get_team_lead_dashboard(db, current_user)


@router.get("/admin", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return DashboardService.get_admin_dashboard(db, current_user)


@router.get("/ceo", response_model=CEODashboardResponse)
def get_ceo_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    return DashboardService.get_ceo_dashboard(db)
