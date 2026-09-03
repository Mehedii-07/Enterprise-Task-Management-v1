import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
              <option *ngFor="let p of projects(); trackBy: trackByProjectId" [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            </select>
          </div>
          <a routerLink="/projects" class="btn btn-secondary">
            <span class="material-symbols-outlined">domain</span>
            <span>Manage Projects</span>
          </a>
          <button *ngIf="auth.hasRole(['CEO', 'ADMIN', 'TEAM_LEAD'])" class="btn btn-primary" (click)="showCreateModal = true">
            <span class="material-symbols-outlined">add_task</span>
            <span>Create Task</span>
          </button>
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="kanban-board">
        <div class="kanban-column" *ngFor="let col of columns; trackBy: trackByColStatus">
          <div class="column-header">
            <span class="col-title">{{ col.label }}</span>
            <span class="col-count">{{ (tasksByStatus()[col.status] || []).length }}</span>
          </div>

          <div class="column-body">
            <div class="task-card glass-card" *ngFor="let task of tasksByStatus()[col.status] || []; trackBy: trackByTaskId">
              <div class="task-card-header">
                <span class="badge" [class]="'badge-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                <span class="project-tag" style="font-size: 0.7rem; color: #a0a0a0; margin-left: auto;">{{ projectMap()[task.project_id] || 'Unknown Project' }}</span>
              </div>
              <h4 class="task-title">{{ task.title }}</h4>
              <p class="task-desc" *ngIf="task.description">{{ task.description }}</p>

              <div class="hours-info" *ngIf="task.estimated_hours">
                <span class="material-symbols-outlined">schedule</span>
                <span>{{ task.actual_hours }} / {{ task.estimated_hours }} hrs</span>
              </div>
              <div class="assignee-info" *ngIf="task.assignee" style="font-size: 0.75rem; color: var(--accent-primary); display: flex; align-items: center; gap: 6px;">
                <img *ngIf="task.assignee.avatar_url" [src]="task.assignee.avatar_url" alt="Avatar" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;">
                <span *ngIf="!task.assignee.avatar_url" class="material-symbols-outlined" style="font-size: 14px;">person</span>
                <span>{{ task.assignee.first_name }} {{ task.assignee.last_name }}</span>
              </div>

              <!-- Subtasks Section -->
              <div class="subtasks-section" style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 8px;">
                <h5 style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">SUBTASKS ({{ task.subtasks?.length || 0 }})</h5>
                
                <div class="subtask-list" style="display: flex; flex-direction: column; gap: 6px;">
                  <div class="subtask-item" *ngFor="let st of task.subtasks; trackBy: trackBySubtaskId" style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.1); padding: 6px; border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <input type="checkbox" [checked]="st.is_completed" (change)="toggleSubtask(task.id, st, $event)" [disabled]="!canEditTask(task)">
                      <span [style.text-decoration]="st.is_completed ? 'line-through' : 'none'" [style.opacity]="st.is_completed ? '0.5' : '1'" style="font-size: 0.8rem;">{{ st.title }}</span>
                    </div>
                    <div style="padding-left: 20px;">
                      <input type="text" placeholder="Add feedback..." [ngModel]="st.feedback" (change)="updateSubtaskFeedback(task.id, st, $event)" [disabled]="!canEditTask(task)" style="width: 100%; padding: 4px 6px; font-size: 0.75rem; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                    </div>
                  </div>
                </div>

                <div class="add-subtask" *ngIf="auth.hasRole(['CEO', 'ADMIN', 'TEAM_LEAD'])" style="margin-top: 8px; display: flex; gap: 4px;">
                  <input type="text" #newStInput placeholder="New subtask..." style="flex: 1; padding: 4px 6px; font-size: 0.75rem; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
                  <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" (click)="addSubtask(task.id, newStInput)">+</button>
                </div>
              </div>

              <div class="status-selector" style="margin-top: 12px;">
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
                <option *ngFor="let p of projects(); trackBy: trackByProjectId" [value]="p.id">{{ p.name }} ({{ p.code }})</option>
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
                <option *ngFor="let u of users(); trackBy: trackByUserId" [value]="u.id">{{ u.first_name }} {{ u.last_name }} ({{ u.role.name }})</option>
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

  // Group tasks by status — no project filtering here, API already scopes by project_id
  tasksByStatus = computed(() => {
    const grouped: Record<string, Task[]> = {
      'TODO': [], 'IN_PROGRESS': [], 'REVIEW': [], 'TESTING': [], 'COMPLETED': [], 'CANCELLED': []
    };
    for (const t of this.tasks()) {
      if (!grouped[t.status]) grouped[t.status] = [];
      grouped[t.status].push(t);
    }
    return grouped;
  });

  // Performance Optimization: O(1) project name lookup
  projectMap = computed(() => {
    const map: Record<string, string> = {};
    for (const p of this.projects()) {
      map[p.id] = p.name;
    }
    return map;
  });

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

  trackByProjectId(index: number, project: Project): string { return project.id; }
  trackByUserId(index: number, user: any): string { return user.id; }
  trackByColStatus(index: number, col: any): string { return col.status; }
  trackByTaskId(index: number, task: Task): string { return task.id; }
  trackBySubtaskId(index: number, st: any): string { return st.id; }

  ngOnInit() {
    this.loadTasks();
    this.api.get<Project[]>('/projects').subscribe({
      next: res => {
        this.projects.set(res);
        if (res.length > 0) this.newTask.project_id = res[0].id;
      }
    });

    this.api.get<any[]>('/users').subscribe({
      next: res => this.users.set(res)
    });

    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_DELETED') {
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

  addSubtask(taskId: string, inputElement: HTMLInputElement) {
    const title = inputElement.value.trim();
    if (!title) return;
    this.api.post(`/tasks/${taskId}/subtasks`, { title: title, is_completed: false }).subscribe({
      next: () => {
        inputElement.value = '';
        this.loadTasks();
      }
    });
  }

  toggleSubtask(taskId: string, subtask: any, event: any) {
    const isCompleted = event.target.checked;
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { is_completed: isCompleted }).subscribe({
      next: () => this.loadTasks()
    });
  }

  updateSubtaskFeedback(taskId: string, subtask: any, event: any) {
    const feedback = event.target.value.trim();
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { feedback: feedback }).subscribe({
      next: () => this.loadTasks()
    });
  }
}
