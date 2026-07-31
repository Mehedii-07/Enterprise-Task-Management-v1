from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_team_lead, require_admin, require_ceo, get_current_user, require_authenticated
from app.models.user import User
from app.models.project import ProjectStatus, ProjectPriority
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMilestoneCreate, ProjectMilestoneResponse, ProjectAssignRequest, MilestoneToggleRequest
from app.schemas.common import MessageResponse
from app.services.project_service import ProjectService
from app.services.pdf_service import PdfService
from fastapi.responses import StreamingResponse
from fastapi import HTTPException
from app.api.v1.websockets import manager
import asyncio

router = APIRouter(prefix="/projects", tags=["Project Management"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    status: Optional[ProjectStatus] = None,
    priority: Optional[ProjectPriority] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ProjectService.get_projects(db, current_user, status, priority, skip, limit)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    project = ProjectService.create_project(db, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "PROJECT_CREATED", "project_id": project.id}))
    except Exception as e:
        print(f"WS error: {e}")
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ProjectService.get_project_by_id(db, project_id, current_user)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated)
):
    project = ProjectService.update_project(db, project_id, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "PROJECT_UPDATED", "project_id": project.id}))
    except Exception as e:
        print(f"WS error: {e}")
    return project


@router.delete("/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_ceo)
):
    ProjectService.delete_project(db, project_id, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "PROJECT_DELETED", "project_id": project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return MessageResponse(message="Project deleted.")


@router.post("/{project_id}/milestones", response_model=ProjectMilestoneResponse, status_code=status.HTTP_201_CREATED)
def add_milestone(
    project_id: str,
    data: ProjectMilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead)
):
    return ProjectService.add_milestone(db, project_id, data, current_user)


@router.patch("/{project_id}/assign", response_model=ProjectResponse)
def assign_project(
    project_id: str,
    data: ProjectAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    project = ProjectService.assign_project(db, project_id, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "PROJECT_ASSIGNED", "project_id": project.id}))
    except Exception as e:
        print(f"WS error: {e}")
    return project


@router.patch("/{project_id}/milestones/{milestone_id}", response_model=ProjectMilestoneResponse)
def toggle_milestone(
    project_id: str,
    milestone_id: str,
    data: MilestoneToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    milestone = ProjectService.toggle_milestone(db, project_id, milestone_id, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "MILESTONE_TOGGLED", "project_id": project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return milestone

@router.get("/{project_id}/export-pdf")
def export_project_pdf(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = ProjectService.get_project_by_id(db, project_id, current_user)
    
    # Check authorization based on role
    role = current_user.role.name if current_user.role else ""
    if role not in ["CEO", "ADMIN"]:
        if project.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have permission to export this project's report.")
            
    pdf_buffer = PdfService.generate_project_report(project)
    
    headers = {
        'Content-Disposition': f'attachment; filename="Project_Report_{project_id}.pdf"'
    }
    
    return StreamingResponse(
        pdf_buffer,
        media_type='application/pdf',
        headers=headers
    )
