import { User } from './user.model';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectMilestone {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  is_completed: boolean;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  role_in_project: string;
  user: User;
}

export interface Project {
  id: string;
  organization_id: string;
  department_id?: string;
  manager_id?: string;
  name: string;
  code: string;
  description?: string;
  budget: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  end_date?: string;
  manager?: User;
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  progress_percentage?: number;
  created_at: string;
  updated_at: string;
}
