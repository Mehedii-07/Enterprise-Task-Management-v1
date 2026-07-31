from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.project import ProjectStatus, ProjectPriority, ProjectPhase
from app.schemas.user import UserResponse


class ProjectMilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneResponse(ProjectMilestoneBase):
    id: str
    project_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MilestoneToggleRequest(BaseModel):
    is_completed: bool
    project_phase: Optional[ProjectPhase] = None


class ProjectAssignRequest(BaseModel):
    assigned_to_id: Optional[str] = None


class ProjectMemberCreate(BaseModel):
    user_id: str
    role_in_project: str = "MEMBER"  # MANAGER, LEAD, MEMBER, VIEWER


class ProjectMemberResponse(BaseModel):
    id: str
    user_id: str
    role_in_project: str
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    budget: float = 0.0
    status: ProjectStatus = ProjectStatus.ACTIVE
    priority: ProjectPriority = ProjectPriority.MEDIUM
    phase: ProjectPhase = ProjectPhase.PLANNING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectCreate(ProjectBase):
    organization_id: Optional[str] = None
    department_id: Optional[str] = None
    manager_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    member_ids: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    phase: Optional[ProjectPhase] = None
    manager_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    member_ids: Optional[List[str]] = None


class ProjectResponse(ProjectBase):
    id: str
    organization_id: str
    department_id: Optional[str] = None
    manager_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    manager: Optional[UserResponse] = None
    assigned_to: Optional[UserResponse] = None
    members: List[ProjectMemberResponse] = []
    milestones: List[ProjectMilestoneResponse] = []
    progress_percentage: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
