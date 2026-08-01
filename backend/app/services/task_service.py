from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.task import Task, Subtask, TaskLabel, TaskComment, WorkLog, TaskStatus, TaskPriority
from app.models.project import Project
from app.models.system import Notification
from app.models.user import User, RoleType
from app.schemas.task import TaskCreate, TaskUpdate, SubtaskCreate, SubtaskUpdate, TaskCommentCreate, WorkLogCreate
from app.core.exceptions import EntityNotFoundException, PermissionDeniedException


class TaskService:
    @staticmethod
    def get_tasks(
        db: Session,
        user: User,
        project_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        query = db.query(Task)
        role = user.role.name.upper()

        # Scope restrictions
        if role == RoleType.CEO.value:
            pass
        elif role == RoleType.ADMIN.value:
            query = query.join(Project).filter(Project.organization_id == user.organization_id)
        elif role in [RoleType.PROJECT_LEAD.value, RoleType.EMPLOYEE.value]:
            from app.models.project import ProjectMember
            query = query.join(Project).outerjoin(ProjectMember, ProjectMember.project_id == Project.id).filter(
                or_(
                    Task.assignee_id == user.id,
                    ProjectMember.user_id == user.id,
                    Project.assigned_to_id == user.id
                )
            ).distinct()

        if project_id:
            query = query.filter(Task.project_id == project_id)
        if assignee_id:
            query = query.filter(Task.assignee_id == assignee_id)
        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_task_by_id(db: Session, task_id: str, user: User) -> Task:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise EntityNotFoundException("Task", task_id)
        return task

    @staticmethod
    def create_task(db: Session, data: TaskCreate, creator: User) -> Task:
        task = Task(
            project_id=data.project_id,
            parent_id=data.parent_id,
            assignee_id=data.assignee_id,
            reporter_id=creator.id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            due_date=data.due_date,
            estimated_hours=data.estimated_hours,
            actual_hours=data.actual_hours
        )
        db.add(task)
        db.flush()

        # Labels
        if data.label_ids:
            labels = db.query(TaskLabel).filter(TaskLabel.id.in_(data.label_ids)).all()
            task.labels.extend(labels)

        # Trigger notification to assignee if assigned
        if data.assignee_id:
            noti = Notification(
                user_id=data.assignee_id,
                title="New Task Assigned",
                message=f"You have been assigned to task: '{task.title}'",
                type="TASK_ASSIGNED",
                link=f"/tasks/{task.id}"
            )
            db.add(noti)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_task(db: Session, task_id: str, data: TaskUpdate, user: User) -> Task:
        task = TaskService.get_task_by_id(db, task_id, user)
        
        if data.title is not None:
            task.title = data.title
        if data.description is not None:
            task.description = data.description
        if data.status is not None:
            old_status = task.status
            task.status = data.status
            # Send notification on completion
            if data.status == TaskStatus.COMPLETED and old_status != TaskStatus.COMPLETED and task.reporter_id:
                noti = Notification(
                    user_id=task.reporter_id,
                    title="Task Completed",
                    message=f"Task '{task.title}' has been marked as COMPLETED by {user.full_name}.",
                    type="TASK_COMPLETED",
                    link=f"/tasks/{task.id}"
                )
                db.add(noti)
        if data.priority is not None:
            task.priority = data.priority
        if data.due_date is not None:
            task.due_date = data.due_date
        if data.estimated_hours is not None:
            task.estimated_hours = data.estimated_hours
        if data.actual_hours is not None:
            task.actual_hours = data.actual_hours
        if data.assignee_id is not None and data.assignee_id != task.assignee_id:
            task.assignee_id = data.assignee_id
            noti = Notification(
                user_id=data.assignee_id,
                title="Task Re-assigned",
                message=f"Task '{task.title}' has been assigned to you.",
                type="TASK_ASSIGNED",
                link=f"/tasks/{task.id}"
            )
            db.add(noti)

        db.commit()
        db.refresh(task)
        
        from app.services.project_service import ProjectService
        ProjectService.check_and_auto_complete_project(db, task.project)
        
        return task

    @staticmethod
    def delete_task(db: Session, task_id: str, user: User):
        task = TaskService.get_task_by_id(db, task_id, user)
        db.delete(task)
        db.commit()

    @staticmethod
    def add_subtask(db: Session, task_id: str, data: SubtaskCreate, user: User) -> Subtask:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise EntityNotFoundException("Task", task_id)
        subtask = Subtask(
            task_id=task.id,
            title=data.title,
            is_completed=data.is_completed,
            feedback=data.feedback,
            due_date=data.due_date
        )
        db.add(subtask)
        db.commit()
        db.refresh(subtask)
        return subtask

    @staticmethod
    def update_subtask(db: Session, task_id: str, subtask_id: str, data: SubtaskUpdate, user: User) -> Subtask:
        task = TaskService.get_task_by_id(db, task_id, user)
        subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
        if not subtask:
            raise EntityNotFoundException("Subtask", subtask_id)

        if data.title is not None:
            subtask.title = data.title
        if data.is_completed is not None:
            subtask.is_completed = data.is_completed
        if data.feedback is not None:
            subtask.feedback = data.feedback
        if data.due_date is not None:
            subtask.due_date = data.due_date

        db.commit()
        db.refresh(subtask)
        
        # Auto-complete or auto-revert the parent task based on subtask progress
        all_subtasks = db.query(Subtask).filter(Subtask.task_id == task_id).all()
        if all_subtasks:
            all_done = all(st.is_completed for st in all_subtasks)
            if all_done and task.status != TaskStatus.COMPLETED:
                task.status = TaskStatus.COMPLETED
                db.commit()
                db.refresh(task)
            elif not all_done and task.status == TaskStatus.COMPLETED:
                task.status = TaskStatus.IN_PROGRESS
                db.commit()
                db.refresh(task)
                
            from app.services.project_service import ProjectService
            ProjectService.check_and_auto_complete_project(db, task.project)

        return subtask

    @staticmethod
    def add_comment(db: Session, task_id: str, data: TaskCommentCreate, user: User) -> TaskComment:
        task = TaskService.get_task_by_id(db, task_id, user)
        comment = TaskComment(
            task_id=task.id,
            user_id=user.id,
            content=data.content
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment

    @staticmethod
    def log_work(db: Session, data: WorkLogCreate, user: User) -> WorkLog:
        task = TaskService.get_task_by_id(db, data.task_id, user)
        log = WorkLog(
            task_id=task.id,
            user_id=user.id,
            hours_logged=data.hours_logged,
            description=data.description,
            log_date=data.log_date or datetime.utcnow()
        )
        db.add(log)
        
        # Accumulate actual hours on the task
        task.actual_hours = (task.actual_hours or 0.0) + data.hours_logged
        
        db.commit()
        db.refresh(log)
        return log
