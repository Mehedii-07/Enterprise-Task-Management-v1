from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.project import Project, ProjectMember, ProjectMilestone, ProjectStatus, ProjectPriority, ProjectPhase
from app.models.user import User, RoleType, Role
from app.models.task import TaskStatus
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectMilestoneCreate, ProjectAssignRequest, MilestoneToggleRequest
from app.core.exceptions import EntityNotFoundException, PermissionDeniedException


class ProjectService:
    @staticmethod
    def get_projects(
        db: Session,
        user: User,
        status: Optional[ProjectStatus] = None,
        priority: Optional[ProjectPriority] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Project]:
        query = db.query(Project)
        role = user.role.name.upper()
        
        # Scope filters per role
        if role == RoleType.CEO.value:
            pass  # Unrestricted global access
        elif role == RoleType.ADMIN.value:
            query = query.filter(Project.organization_id == user.organization_id)
        elif role == RoleType.PROJECT_LEAD.value:
            query = query.join(ProjectMember).filter(Project.organization_id == user.organization_id, ProjectMember.user_id == user.id)
        else:
            from app.models.task import Task
            query = query.outerjoin(ProjectMember).outerjoin(Task, Task.project_id == Project.id).filter(
                Project.organization_id == user.organization_id,
                or_(
                    Project.assigned_to_id == user.id,
                    ProjectMember.user_id == user.id,
                    Task.assignee_id == user.id
                )
            ).distinct()
            
        if status:
            query = query.filter(Project.status == status)
        if priority:
            query = query.filter(Project.priority == priority)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_project_by_id(db: Session, project_id: str, user: User) -> Project:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise EntityNotFoundException("Project", project_id)
            
        role = user.role.name.upper()
        if role != RoleType.CEO.value and project.organization_id != user.organization_id:
            raise PermissionDeniedException("Cannot access projects outside your organization.")
            
        return project

    @staticmethod
    def create_project(db: Session, data: ProjectCreate, creator: User) -> Project:
        org_id = creator.organization_id if creator.role.name.upper() != RoleType.CEO.value else (data.organization_id or creator.organization_id)
        
        project = Project(
            organization_id=org_id,
            department_id=data.department_id,
            manager_id=data.manager_id or creator.id,
            name=data.name,
            code=data.code,
            description=data.description,
            budget=data.budget,
            status=data.status,
            priority=data.priority,
            phase=data.phase,
            assigned_to_id=data.assigned_to_id,
            start_date=data.start_date,
            end_date=data.end_date,
            assign_date=data.assign_date or (datetime.utcnow() if data.member_ids else None),
            delivery_time=data.delivery_time
        )
        db.add(project)
        db.flush()

        # Add creator/manager as MANAGER member
        pm = ProjectMember(project_id=project.id, user_id=project.manager_id, role_in_project="MANAGER")
        db.add(pm)

        # Auto-add ALL Project Leads in the same organization as LEAD members
        team_leads = db.query(User).join(User.role).filter(
            User.organization_id == org_id,
            User.role.has(name=RoleType.PROJECT_LEAD.value)
        ).all()
        existing_ids = {project.manager_id}
        for lead in team_leads:
            if lead.id not in existing_ids:
                db.add(ProjectMember(project_id=project.id, user_id=lead.id, role_in_project="LEAD"))
                existing_ids.add(lead.id)

        # Add any explicitly selected additional members
        for uid in data.member_ids:
            if uid not in existing_ids:
                db.add(ProjectMember(project_id=project.id, user_id=uid, role_in_project="MEMBER"))
                existing_ids.add(uid)

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update_project(db: Session, project_id: str, data: ProjectUpdate, user: User) -> Project:
        project = ProjectService.get_project_by_id(db, project_id, user)
        
        role = user.role.name.upper()
        if role == RoleType.PROJECT_LEAD.value:
            is_member = any(m.user_id == user.id for m in project.members)
            if not is_member:
                raise PermissionDeniedException("You can only update projects you are assigned to.")
        elif role == RoleType.EMPLOYEE.value:
            is_member = any(m.user_id == user.id for m in project.members)
            if project.assigned_to_id != user.id and not is_member:
                raise PermissionDeniedException("You can only update projects assigned to you.")
        
        if data.name is not None:
            project.name = data.name
        if data.code is not None:
            project.code = data.code
        if data.description is not None:
            project.description = data.description
        if data.budget is not None:
            project.budget = data.budget
        if data.status is not None:
            project.status = data.status
            if data.status == ProjectStatus.COMPLETED:
                project.phase = ProjectPhase.COMPLETED
        if data.priority is not None:
            project.priority = data.priority
        if data.phase is not None:
            project.phase = data.phase
            if data.phase == ProjectPhase.COMPLETED:
                project.status = ProjectStatus.COMPLETED
        if data.assigned_to_id is not None:
            project.assigned_to_id = data.assigned_to_id
        if data.manager_id is not None:
            project.manager_id = data.manager_id
        if data.start_date is not None:
            project.start_date = data.start_date
        if data.end_date is not None:
            project.end_date = data.end_date
        if hasattr(data, 'assign_date') and data.assign_date is not None:
            project.assign_date = data.assign_date
        if hasattr(data, 'delivery_time') and data.delivery_time is not None:
            project.delivery_time = data.delivery_time
            
        if data.member_ids is not None:
            # Clear old members except manager
            db.query(ProjectMember).filter(ProjectMember.project_id == project.id).delete()
            # Always re-add manager
            manager_id = project.manager_id
            if manager_id:
                db.add(ProjectMember(project_id=project.id, user_id=manager_id, role_in_project="MANAGER"))
            # Add selected members
            for uid in data.member_ids:
                if uid != manager_id:
                    db.add(ProjectMember(project_id=project.id, user_id=uid, role_in_project="MEMBER"))

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: str, user: User):
        project = ProjectService.get_project_by_id(db, project_id, user)
        db.delete(project)
        db.commit()

    @staticmethod
    def add_milestone(db: Session, project_id: str, data: ProjectMilestoneCreate, user: User) -> ProjectMilestone:
        project = ProjectService.get_project_by_id(db, project_id, user)
        milestone = ProjectMilestone(
            project_id=project.id,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            is_completed=data.is_completed
        )
        db.add(milestone)
        db.commit()
        db.refresh(milestone)
        return milestone

    @staticmethod
    def assign_project(db: Session, project_id: str, data: ProjectAssignRequest, user: User) -> Project:
        project = ProjectService.get_project_by_id(db, project_id, user)
        if data.assigned_to_id is not None:
            project.assigned_to_id = data.assigned_to_id
            
        if hasattr(data, 'assign_date') and data.assign_date is not None:
            project.assign_date = data.assign_date
        if hasattr(data, 'delivery_time') and data.delivery_time is not None:
            project.delivery_time = data.delivery_time
            
        if data.member_ids is not None:
            # Clear previous assigned members
            db.query(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role_in_project == "MEMBER"
            ).delete()
            
            for uid in data.member_ids:
                db.add(ProjectMember(project_id=project_id, user_id=uid, role_in_project="MEMBER"))
                
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def toggle_milestone(db: Session, project_id: str, milestone_id: str, data: MilestoneToggleRequest, user: User) -> ProjectMilestone:
        project = ProjectService.get_project_by_id(db, project_id, user)
        milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id).first()
        if not milestone:
            raise EntityNotFoundException("ProjectMilestone", milestone_id)
        
        milestone.is_completed = data.is_completed
        if data.project_phase:
            project.phase = data.project_phase
            if data.project_phase == ProjectPhase.COMPLETED:
                project.status = ProjectStatus.COMPLETED
            
        db.commit()
        db.refresh(milestone)
        
        ProjectService.check_and_auto_complete_project(db, project)
        
        return milestone

    @staticmethod
    def check_and_auto_complete_project(db: Session, project: Project):
        if project.status == ProjectStatus.COMPLETED:
            return
            
        has_tasks = len(project.tasks) > 0
        has_milestones = len(project.milestones) > 0
        
        if not has_tasks and not has_milestones:
            return
            
        tasks_done = all(t.status == TaskStatus.COMPLETED for t in project.tasks) if has_tasks else True
        milestones_done = all(m.is_completed for m in project.milestones) if has_milestones else True
        
        if tasks_done and milestones_done:
            project.status = ProjectStatus.COMPLETED
            project.phase = ProjectPhase.COMPLETED
            db.commit()
            db.refresh(project)
