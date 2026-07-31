import { User } from './user.model';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
  feedback?: string;
  due_date?: string;
}

export interface TaskLabel {
  id: string;
  name: string;
  color_code: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user: User;
  content: string;
  created_at: string;
}

export interface WorkLog {
  id: string;
  task_id: string;
  user_id: string;
  user: User;
  hours_logged: number;
  description?: string;
  log_date: string;
}

export interface Task {
  id: string;
  project_id: string;
  parent_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  estimated_hours: number;
  actual_hours: number;
  assignee?: User;
  reporter?: User;
  subtasks: Subtask[];
  labels: TaskLabel[];
  comments: TaskComment[];
  created_at: string;
  updated_at: string;
}