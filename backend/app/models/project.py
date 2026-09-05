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
    assign_date = Column(DateTime, nullable=True)
    delivery_time = Column(DateTime, nullable=True)
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
        phase_map = {
            ProjectPhase.PLANNING: 25.0,
            ProjectPhase.IN_PROGRESS: 50.0,
            ProjectPhase.TESTING: 75.0,
            ProjectPhase.COMPLETED: 100.0
        }
        
        current_phase = self.phase
        phase_pct = 25.0
        if isinstance(current_phase, str):
            normalized = current_phase.lower().replace(" ", "_")
            for k, v in phase_map.items():
                if normalized == k.value.lower().replace(" ", "_") or normalized == k.name.lower().replace(" ", "_"):
                    phase_pct = v
                    break
        else:
            phase_pct = phase_map.get(current_phase, 25.0)

        # Collect all subtasks across all tasks in this project
        all_subtasks = []
        for task in (self.tasks or []):
            if task.subtasks:
                all_subtasks.extend(task.subtasks)

        if all_subtasks:
            completed_subtasks = sum(1 for s in all_subtasks if s.is_completed)
            subtask_pct = (completed_subtasks / len(all_subtasks)) * 100.0
        elif self.tasks:
            from app.models.task import TaskStatus
            completed_tasks = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
            subtask_pct = (completed_tasks / len(self.tasks)) * 100.0
        elif self.milestones:
            completed_milestones = sum(1 for m in self.milestones if m.is_completed)
            subtask_pct = (completed_milestones / len(self.milestones)) * 100.0
        else:
            subtask_pct = 0.0

        # If no tasks or milestones exist, progress is purely determined by Phase
        if not self.tasks and not self.milestones:
            return round(phase_pct, 1)

        # Total 100% depends on both subtask complete AND Phase combinations
        # 50% weight from subtasks, 50% weight from Phase
        total_pct = (subtask_pct * 0.5) + (phase_pct * 0.5)

        # Must have both subtasks 100% AND phase Completed (100%) to achieve 100%
        if subtask_pct >= 100.0 and phase_pct >= 100.0:
            return 100.0
        elif total_pct >= 100.0:
            return 99.0

        return round(total_pct, 1)


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
