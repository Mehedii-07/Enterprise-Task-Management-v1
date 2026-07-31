from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_team_lead, get_current_user
from app.models.user import User
from app.models.task import TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, SubtaskCreate, SubtaskUpdate, SubtaskResponse, TaskCommentCreate, TaskCommentResponse, WorkLogCreate, WorkLogResponse
from app.schemas.common import MessageResponse
from app.services.task_service import TaskService
from app.api.v1.websockets import manager
import asyncio

router = APIRouter(prefix="/tasks", tags=["Task Management"])


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return TaskService.get_tasks(db, current_user, project_id, assignee_id, status, priority, skip, limit)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead)
):
    task = TaskService.create_task(db, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "TASK_CREATED", "task_id": task.id, "project_id": task.project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return TaskService.get_task_by_id(db, task_id, current_user)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = TaskService.update_task(db, task_id, data, current_user)
    try:
        asyncio.run(manager.broadcast({"event": "TASK_UPDATED", "task_id": task.id, "project_id": task.project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return task


@router.delete("/{task_id}", response_model=MessageResponse)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead)
):
    TaskService.delete_task(db, task_id, current_user)
    return MessageResponse(message="Task deleted.")


# Subtasks
@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
def add_subtask(
    task_id: str,
    data: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_team_lead)
):
    subtask = TaskService.add_subtask(db, task_id, data, current_user)
    try:
        from app.models.task import Task as TaskModel
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        project_id = task.project_id if task else None
        asyncio.run(manager.broadcast({"event": "TASK_UPDATED", "task_id": task_id, "project_id": project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return subtask


@router.put("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(
    task_id: str,
    subtask_id: str,
    data: SubtaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subtask = TaskService.update_subtask(db, task_id, subtask_id, data, current_user)
    try:
        # Safely get project_id from task directly
        from app.models.task import Task as TaskModel
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        project_id = task.project_id if task else None
        asyncio.run(manager.broadcast({"event": "TASK_UPDATED", "task_id": task_id, "project_id": project_id}))
    except Exception as e:
        print(f"WS error: {e}")
    return subtask


# Comments
@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    task_id: str,
    data: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return TaskService.add_comment(db, task_id, data, current_user)


# Work logs
@router.post("/{task_id}/work-logs", response_model=WorkLogResponse, status_code=status.HTTP_201_CREATED)
def log_work(
    task_id: str,
    data: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data.task_id = task_id
    return TaskService.log_work(db, data, current_user)
