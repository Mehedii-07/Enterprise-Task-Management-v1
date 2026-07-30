from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.task import TaskResponse
from app.schemas.project import ProjectResponse


class EmployeeDashboardResponse(BaseModel):
    my_tasks_count: int
    todays_tasks_count: int
    completed_tasks_count: int
    pending_tasks_count: int
    overdue_tasks_count: int
    todo_count: int
    in_progress_count: int
    review_count: int
    testing_count: int
    total_hours_logged: float
    productivity_score: float
    task_completion_rate: float
    current_sprint_progress: float
    recent_tasks: List[TaskResponse]
    upcoming_deadlines: List[TaskResponse]
    recent_activities: List[Dict[str, Any]]
    assigned_projects: List[ProjectResponse] = []
    
    # Team contribution section for employee
    team_contribution: Dict[str, Any]


class TeamLeadDashboardResponse(BaseModel):
    team_size: int
    active_projects_count: int
    total_team_tasks: int
    completed_team_tasks: int
    pending_team_tasks: int
    overdue_team_tasks: int
    team_completion_rate: float
    average_team_performance: float
    recent_team_tasks: List[TaskResponse]
    team_leaderboard: List[Dict[str, Any]]
    active_projects: List[ProjectResponse] = []
    project_progress: List[Dict[str, Any]]


class AdminDashboardResponse(BaseModel):
    total_employees: int
    total_team_leads: int
    active_projects: int
    completed_projects: int
    pending_projects: int
    overdue_projects: int
    tasks_by_status: Dict[str, int]
    tasks_by_priority: Dict[str, int]
    department_performance: List[Dict[str, Any]]
    monthly_productivity: List[Dict[str, Any]]
    organization_performance_score: float
    employee_ranking: List[Dict[str, Any]]
    late_task_statistics: Dict[str, Any]


class CEODashboardResponse(BaseModel):
    total_organizations: int
    total_users: int
    total_admins: int
    total_team_leads: int
    total_employees: int
    total_projects: int
    completed_projects: int
    pending_projects: int
    overdue_projects: int
    active_projects: List[ProjectResponse] = []
    system_usage_score: float
    organization_performance: List[Dict[str, Any]]
    employee_performance: List[Dict[str, Any]]
    task_analytics: Dict[str, Any]
    project_analytics: Dict[str, Any]
    login_statistics: Dict[str, Any]
    organization_comparison: List[Dict[str, Any]]
    recent_audit_logs: List[Dict[str, Any]]
