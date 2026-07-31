from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.task import TaskStatus, TaskPriority
from app.schemas.user import UserResponse


class SubtaskBase(BaseModel):
    title: str
    is_completed: bool = False
    feedback: Optional[str] = None
    due_date: Optional[datetime] = None


class SubtaskCreate(SubtaskBase):
    pass


class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    feedback: Optional[str] = None
    due_date: Optional[datetime] = None


class SubtaskResponse(SubtaskBase):
    id: str
    task_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubtaskWithTaskResponse(SubtaskResponse):
    """Extended response that includes the parent task info for WS broadcasts."""
    pass


class TaskLabelResponse(BaseModel):
    id: str
    name: str
    color_code: str

    model_config = ConfigDict(from_attributes=True)


class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentResponse(TaskCommentBase):
    id: str
    task_id: str
    user_id: str
    user: UserResponse
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkLogBase(BaseModel):
    hours_logged: float
    description: Optional[str] = None
    log_date: Optional[datetime] = None


class WorkLogCreate(WorkLogBase):
    task_id: str


class WorkLogResponse(WorkLogBase):
    id: str
    task_id: str
    user_id: str
    user: UserResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0


class TaskCreate(TaskBase):
    project_id: str
    assignee_id: Optional[str] = None
    parent_id: Optional[str] = None
    label_ids: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    assignee_id: Optional[str] = None
    label_ids: Optional[List[str]] = None


class TaskResponse(TaskBase):
    id: str
    project_id: str
    parent_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    assignee: Optional[UserResponse] = None
    reporter: Optional[UserResponse] = None
    subtasks: List[SubtaskResponse] = []
    labels: List[TaskLabelResponse] = []
    comments: List[TaskCommentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
