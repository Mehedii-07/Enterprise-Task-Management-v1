import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProjectStatus(str, PyEnum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class ProjectPhase(str, PyEnum):
    PLANNING = "Planning"
    IN_PROGRESS = "In Progress"
    TESTING = "Testing"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"


class ProjectPriority(str, PyEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    manager_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    budget = Column(Float, default=0.0)
    
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False, index=True)
    priority = Column(Enum(ProjectPriority), default=ProjectPriority.MEDIUM, nullable=False)
    phase = Column(Enum(ProjectPhase), default=ProjectPhase.PLANNING, nullable=False)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    department = relationship("Department", back_populates="projects")
    manager = relationship("User", back_populates="managed_projects", foreign_keys=[manager_id])
    assigned_to = relationship("User", back_populates="assigned_projects", foreign_keys=[assigned_to_id])
    
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan", lazy="selectin")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan", lazy="selectin")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan", lazy="selectin")

    @property
    def progress_percentage(self) -> float:
        if self.status == ProjectStatus.COMPLETED or self.phase == ProjectPhase.COMPLETED:
            return 100.0
            
        has_tasks = len(self.tasks) > 0
        has_milestones = len(self.milestones) > 0
        
        if not has_tasks and not has_milestones:
            if self.phase == ProjectPhase.PLANNING:
                return 25.0
            elif self.phase == ProjectPhase.IN_PROGRESS:
                return 50.0
            elif self.phase == ProjectPhase.TESTING:
                return 75.0
            return 0.0
            
        task_progress = (sum(task.progress_percentage for task in self.tasks) / len(self.tasks)) if has_tasks else 0.0
        milestone_progress = (sum(100.0 for m in self.milestones if m.is_completed) / len(self.milestones)) if has_milestones else 0.0
        
        if has_tasks and has_milestones:
            return round((task_progress + milestone_progress) / 2.0, 1)
        elif has_tasks:
            return round(task_progress, 1)
        else:
            return round(milestone_progress, 1)


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_project = Column(String(50), default="MEMBER")  # MANAGER, LEAD, MEMBER, VIEWER
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="milestones")
