import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';
import { Task, TaskStatus } from '../../core/models/task.model';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="task-page">
      <div class="page-header glass-card">
        <div>
          <h2>Kanban Task Board</h2>
          <p>Task Workflows, Priority Badges, Subtask Execution & Time Tracking</p>
        </div>
        <div style="display: flex; gap: 12px;">
          <div class="filter-group">
            <select [(ngModel)]="selectedProjectId" (ngModelChange)="loadTasks()" class="project-filter">
              <option value="">All Projects</option>
              <option *ngFor="let p of projects()" [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            </select>
          </div>
          <a routerLink="/projects" class="btn btn-secondary">
            <span class="material-symbols-outlined">domain</span>
            <span>Manage Projects</span>
          </a>
          <button *ngIf="auth.hasRole(['CEO'])" class="btn btn-primary" (click)="showCreateModal = true">
            <span class="material-symbols-outlined">add_task</span>
            <span>Create Task</span>
          </button>
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="kanban-board">
        <div class="kanban-column" *ngFor="let col of columns">
          <div class="column-header">
            <span class="col-title">{{ col.label }}</span>
            <span class="col-count">{{ getTasksByStatus(col.status).length }}</span>
          </div>

          <div class="column-body">
            <div class="task-card glass-card" *ngFor="let task of getTasksByStatus(col.status)">
              <div class="task-card-header">
                <span class="badge" [class]="'badge-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                <span class="project-tag" style="font-size: 0.7rem; color: #a0a0a0; margin-left: auto;">{{ getProjectName(task.project_id) }}</span>
              </div>
              <h4 class="task-title">{{ task.title }}</h4>
              <p class="task-desc" *ngIf="task.description">{{ task.description }}</p>

              <div class="hours-info" *ngIf="task.estimated_hours">
                <span class="material-symbols-outlined">schedule</span>
                <span>{{ task.actual_hours }} / {{ task.estimated_hours }} hrs</span>
              </div>
              <div class="assignee-info" *ngIf="task.assignee" style="font-size: 0.75rem; color: var(--accent-primary); display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 14px;">person</span>
                <span>{{ task.assignee.first_name }} {{ task.assignee.last_name }}</span>
              </div>

              <div class="status-selector">
                <select [ngModel]="task.status" (ngModelChange)="updateTaskStatus(task, $event)" [disabled]="!canEditTask(task)">
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="REVIEW">REVIEW</option>
                  <option value="TESTING">TESTING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Task Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card glass-card">
          <h3>Create New Task</h3>
          <form (ngSubmit)="createTask()">
            <div class="form-group">
              <label>Select Project</label>
              <select [(ngModel)]="newTask.project_id" name="project_id" required>
                <option *ngFor="let p of projects()" [value]="p.id">{{ p.name }} ({{ p.code }})</option>
              </select>
            </div>

            <div class="form-group">
              <label>Task Title</label>
              <input type="text" [(ngModel)]="newTask.title" name="title" required />
            </div>

            <div class="form-group">
              <label>Assignee</label>
              <select [(ngModel)]="newTask.assignee_id" name="assignee_id">
                <option value="">Unassigned</option>
                <option *ngFor="let u of users()" [value]="u.id">{{ u.first_name }} {{ u.last_name }} ({{ u.role.name }})</option>
              </select>
            </div>

            <div class="form-group">
              <label>Priority</label>
              <select [(ngModel)]="newTask.priority" name="priority">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div class="form-group">
              <label>Estimated Hours</label>
              <input type="number" [(ngModel)]="newTask.estimated_hours" name="estimated_hours" />
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newTask.description" name="description" rows="3"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    
    .project-filter {
      padding: 8px 12px;
      background: var(--bg-main);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.9rem;
      min-width: 200px;
    }

    .kanban-board {
      display: flex;
      flex-wrap: nowrap;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;

      .kanban-column {
        flex: 0 0 280px;
        min-width: 280px;
        scroll-snap-align: start;
        background: var(--bg-sidebar);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 500px;

        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);

          .col-title { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
          .col-count { font-size: 0.75rem; font-weight: 700; background: var(--bg-card-hover); padding: 2px 8px; border-radius: 12px; }
        }

        .column-body {
          display: flex;
          flex-direction: column;
          gap: 12px;

          .task-card {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .task-title { font-size: 0.95rem; color: var(--text-primary); }
            .task-desc { font-size: 0.8rem; color: var(--text-muted); }
            
            .hours-info {
              display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted);
              .material-symbols-outlined { font-size: 16px; }
            }

            .status-selector select {
              width: 100%;
              padding: 4px 8px;
              font-size: 0.75rem;
              background: var(--bg-main);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              color: var(--text-secondary);
            }
          }
        }
      }
    }

    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 16px;
    }
    .modal-card { 
      width: 100%; 
      max-width: 480px; 
      max-height: 90vh;
      overflow-y: auto;
      h3 { font-size: 1.3rem; margin-bottom: 20px; }
      .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    }
  `]
})
export class TaskBoardComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  ws = inject(WebsocketService);
  tasks = signal<Task[]>([]);
  projects = signal<Project[]>([]);
  users = signal<any[]>([]);
  showCreateModal = false;
  selectedProjectId: string = '';

  columns = [
    { label: 'TODO', status: 'TODO' },
    { label: 'IN PROGRESS', status: 'IN_PROGRESS' },
    { label: 'REVIEW', status: 'REVIEW' },
    { label: 'TESTING', status: 'TESTING' },
    { label: 'COMPLETED', status: 'COMPLETED' },
    { label: 'CANCELLED', status: 'CANCELLED' }
  ];

  newTask = {
    project_id: '',
    title: '',
    priority: 'MEDIUM',
    estimated_hours: 8,
    description: '',
    assignee_id: ''
  };

  ngOnInit() {
    this.loadTasks();
    this.api.get<Project[]>('/projects').subscribe({
      next: res => {
        const activeProjects = res.filter(p => p.status === 'PLANNING' || p.status === 'ACTIVE');
        this.projects.set(activeProjects);
        if (activeProjects.length > 0) this.newTask.project_id = activeProjects[0].id;
      }
    });

    this.api.get<any[]>('/users').subscribe({
      next: res => this.users.set(res)
    });

    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED') {
        this.loadTasks();
      }
    });
  }

  loadTasks() {
    let url = '/tasks';
    if (this.selectedProjectId) {
      url += `?project_id=${this.selectedProjectId}`;
    }
    this.api.get<Task[]>(url).subscribe({
      next: res => this.tasks.set(res)
    });
  }

  getTasksByStatus(status: string): Task[] {
    const activeProjectIds = new Set(this.projects().map(p => p.id));
    return this.tasks().filter(t => t.status === status && activeProjectIds.has(t.project_id));
  }

  getProjectName(projectId: string): string {
    const p = this.projects().find(p => p.id === projectId);
    return p ? p.name : 'Unknown Project';
  }

  updateTaskStatus(task: Task, newStatus: TaskStatus) {
    this.api.put(`/tasks/${task.id}`, { status: newStatus }).subscribe({
      next: () => this.loadTasks()
    });
  }

  canEditTask(task: Task): boolean {
    if (this.auth.hasRole(['CEO'])) return true;
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.id === task.assignee?.id;
  }

  createTask() {
    const payload: any = { ...this.newTask };
    if (!payload.assignee_id) delete payload.assignee_id; // Remove empty assignee
    
    this.api.post('/tasks', payload).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newTask.title = '';
        this.newTask.description = '';
        this.loadTasks();
      }
    });
  }
}
