from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.project import Project, ProjectMember, ProjectMilestone, ProjectStatus, ProjectPriority, ProjectPhase
from app.models.user import User, RoleType
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
        elif role == RoleType.TEAM_LEAD.value:
            query = query.filter(Project.organization_id == user.organization_id).join(ProjectMember).filter(ProjectMember.user_id == user.id)
        elif role == RoleType.EMPLOYEE.value:
            query = query.filter(Project.organization_id == user.organization_id, Project.assigned_to_id == user.id)
            
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
            end_date=data.end_date
        )
        db.add(project)
        db.flush()
        
        # Add creator / manager as project manager member
        pm = ProjectMember(project_id=project.id, user_id=project.manager_id, role_in_project="MANAGER")
        db.add(pm)
        
        # Add additional team members if provided
        for uid in data.member_ids:
            if uid != project.manager_id:
                m = ProjectMember(project_id=project.id, user_id=uid, role_in_project="MEMBER")
                db.add(m)
                
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update_project(db: Session, project_id: str, data: ProjectUpdate, user: User) -> Project:
        project = ProjectService.get_project_by_id(db, project_id, user)
        
        role = user.role.name.upper()
        if role == RoleType.TEAM_LEAD.value:
            is_member = any(m.user_id == user.id for m in project.members)
            if not is_member:
                raise PermissionDeniedException("You can only update projects you are assigned to.")
        elif role == RoleType.EMPLOYEE.value:
            if project.assigned_to_id != user.id:
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
        if data.priority is not None:
            project.priority = data.priority
        if data.phase is not None:
            project.phase = data.phase
        if data.assigned_to_id is not None:
            project.assigned_to_id = data.assigned_to_id
        if data.manager_id is not None:
            project.manager_id = data.manager_id
        if data.start_date is not None:
            project.start_date = data.start_date
        if data.end_date is not None:
            project.end_date = data.end_date
            
        if data.member_ids is not None:
            # Delete old members
            db.query(ProjectMember).filter(ProjectMember.project_id == project.id).delete()
            # Add new members
            for uid in data.member_ids:
                if uid != project.manager_id:
                    m = ProjectMember(project_id=project.id, user_id=uid, role_in_project="MEMBER")
                    db.add(m)

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
        project.assigned_to_id = data.assigned_to_id
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
            
        db.commit()
        db.refresh(milestone)
        return milestone
