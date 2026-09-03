import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="project-page">
      <div class="page-header glass-card">
        <div>
          <h2>Projects & Milestones Workspace</h2>
          <p>Enterprise Project Portfolio — Manage Members, Statuses, Budgets & Goals</p>
        </div>
        <button *ngIf="auth.hasRole(['CEO','ADMIN'])" class="btn btn-primary" (click)="openCreateModal()">
          <span class="material-symbols-outlined">add</span>
          <span>New Project</span>
        </button>
      </div>

      <div class="projects-grid">
        <div class="project-card glass-card" *ngFor="let project of projects()">
          <div class="card-header">
            <span class="code-badge">{{ project.code }}</span>
            <div class="header-actions">
              <span class="badge" [ngClass]="'badge-' + (project.status || 'ACTIVE').toLowerCase()">{{ project.status }}</span>
              <button *ngIf="auth.hasRole(['CEO', 'ADMIN'])" class="icon-btn" (click)="openEditModal(project)" title="Edit Project">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button *ngIf="auth.hasRole(['CEO'])" class="icon-btn delete-btn" (click)="deleteProject(project, $event)" title="Delete Project">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <h3 class="title">{{ project.name }}</h3>
          <p class="desc">{{ project.description || 'No description provided.' }}</p>

          <!-- Assigned Members -->
          <div class="members-section">
            <div class="members-label">
              <span class="material-symbols-outlined">group</span>
              <span>Team Members ({{ project.members?.length || 0 }})</span>
            </div>
            <div class="members-list" *ngIf="project.members && project.members.length > 0">
              <div class="member-chip" *ngFor="let m of project.members" [title]="m.user.first_name + ' ' + m.user.last_name + ' — ' + m.role_in_project">
                <img *ngIf="m.user.avatar_url" [src]="m.user.avatar_url" alt="Avatar" class="member-avatar-img">
                <span *ngIf="!m.user.avatar_url" class="member-avatar">{{ m.user.first_name[0] }}{{ m.user.last_name[0] }}</span>
                <span class="member-name">{{ m.user.first_name }} {{ m.user.last_name }}</span>
                <span class="member-role" [class.is-manager]="m.role_in_project === 'MANAGER'">{{ m.role_in_project }}</span>
              </div>
            </div>
            <div class="no-members" *ngIf="!project.members || project.members.length === 0">
              <span class="material-symbols-outlined">person_off</span>
              <span>No members assigned yet.</span>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-item">
              <span class="label">Assign Date</span>
              <span class="value" style="font-size:0.9rem;">{{ project.assign_date ? (project.assign_date | date:'mediumDate') : 'N/A' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Delivery</span>
              <span class="value" style="font-size:0.9rem;">{{ project.delivery_time ? (project.delivery_time | date:'mediumDate') : 'N/A' }}</span>
            </div>
          </div>
          <div class="meta-row">
            <div class="meta-item">
              <span class="label">Budget</span>
              <span class="value">\${{ project.budget | number }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Priority</span>
              <span class="badge" [ngClass]="'badge-' + (project.priority || 'MEDIUM').toLowerCase()">{{ project.priority }}</span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span class="label">Progress</span>
              <span class="pct font-bold">{{ project.progress_percentage || 0 }}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" [style.width.%]="project.progress_percentage || 0"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card glass-card">
          <div class="modal-header">
            <h3>Create New Enterprise Project</h3>
            <button class="icon-btn" (click)="showCreateModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div *ngIf="errorMessage" class="error-alert">{{ errorMessage }}</div>
          <form (ngSubmit)="createProject()">
            <div class="form-row">
              <div class="form-group">
                <label>Project Name</label>
                <input type="text" [(ngModel)]="newProject.name" name="name" required />
              </div>
              <div class="form-group">
                <label>Project Code</label>
                <input type="text" [(ngModel)]="newProject.code" name="code" placeholder="PRJ-002" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Budget ($)</label>
                <input type="number" [(ngModel)]="newProject.budget" name="budget" />
              </div>
              <div class="form-group">
                <label>Status</label>
                <select [(ngModel)]="newProject.status" name="status">
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newProject.description" name="description" rows="2"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Assign Date</label>
                <input type="date" [(ngModel)]="newProject.assign_date" name="assign_date" />
              </div>
              <div class="form-group">
                <label>Delivery Time</label>
                <input type="date" [(ngModel)]="newProject.delivery_time" name="delivery_time" />
              </div>
            </div>
            <div class="form-group">
              <label class="section-label">
                <span class="material-symbols-outlined">group_add</span>
                Assign Team Members
              </label>
              <div class="member-checklist">
                <label class="check-label" *ngFor="let u of users()">
                  <input type="checkbox" [checked]="newProject.member_ids.includes(u.id)" (change)="toggleMember(newProject.member_ids, u.id, $event)">
                  <img *ngIf="u.avatar_url" [src]="u.avatar_url" alt="Avatar" class="check-avatar-img">
                  <span *ngIf="!u.avatar_url" class="check-avatar">{{ u.first_name[0] }}{{ u.last_name[0] }}</span>
                  <span class="check-name">{{ u.first_name }} {{ u.last_name }}</span>
                  <span class="check-role">{{ u.role?.name }}</span>
                </label>
              </div>
              <small class="hint">{{ newProject.member_ids.length }} member(s) selected</small>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Project Modal -->
      <div class="modal-backdrop" *ngIf="showEditModal">
        <div class="modal-card glass-card">
          <div class="modal-header">
            <h3>Edit: {{ editingProject.name }}</h3>
            <button class="icon-btn" (click)="showEditModal = false"><span class="material-symbols-outlined">close</span></button>
          </div>
          <form (ngSubmit)="updateProject()">
            <div class="form-row">
              <div class="form-group">
                <label>Project Name</label>
                <input type="text" [(ngModel)]="editingProject.name" name="edit_name" required />
              </div>
              <div class="form-group">
                <label>Project Code</label>
                <input type="text" [(ngModel)]="editingProject.code" name="edit_code" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Budget ($)</label>
                <input type="number" [(ngModel)]="editingProject.budget" name="edit_budget" />
              </div>
              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="editingProject.priority" name="edit_priority">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Status</label>
                <select [(ngModel)]="editingProject.status" name="edit_status">
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div class="form-group">
                <label>Description</label>
                <input type="text" [(ngModel)]="editingProject.description" name="edit_description" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Assign Date</label>
                <input type="date" [(ngModel)]="editingProject.assign_date" name="edit_assign_date" />
              </div>
              <div class="form-group">
                <label>Delivery Time</label>
                <input type="date" [(ngModel)]="editingProject.delivery_time" name="edit_delivery_time" />
              </div>
            </div>
            <div class="form-group">
              <label class="section-label">
                <span class="material-symbols-outlined">group_add</span>
                Assign Team Members
              </label>
              <div class="member-checklist">
                <label class="check-label" *ngFor="let u of users()">
                  <input type="checkbox" [checked]="editingProject.member_ids?.includes(u.id)" (change)="toggleMember(editingProject.member_ids, u.id, $event)">
                  <img *ngIf="u.avatar_url" [src]="u.avatar_url" alt="Avatar" class="check-avatar-img">
                  <span *ngIf="!u.avatar_url" class="check-avatar">{{ u.first_name[0] }}{{ u.last_name[0] }}</span>
                  <span class="check-name">{{ u.first_name }} {{ u.last_name }}</span>
                  <span class="check-role">{{ u.role?.name }}</span>
                </label>
              </div>
              <small class="hint">{{ editingProject.member_ids?.length || 0 }} member(s) selected</small>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showEditModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .project-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }

    .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }

    .project-card {
      display: flex; flex-direction: column; gap: 12px;

      .card-header {
        display: flex; justify-content: space-between; align-items: center;
        .code-badge { font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); background: rgba(59,130,246,0.15); padding: 4px 10px; border-radius: 6px; }
        .header-actions { display: flex; align-items: center; gap: 8px; }
    .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px;
          &:hover { color: var(--accent-primary); background: rgba(255,255,255,0.05); }
          &.delete-btn:hover { color: #EF4444; background: rgba(239,68,68,0.1); }
        }
      }

      .title { font-size: 1.05rem; color: var(--text-primary); }
      .desc { font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; }

      .members-section {
        padding: 10px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
        .members-label { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;
          .material-symbols-outlined { font-size: 14px; } }
        .members-list { display: flex; flex-direction: column; gap: 5px; max-height: 120px; overflow-y: auto; padding-right: 4px; }
        .member-chip {
          display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          .member-avatar-img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
          .member-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--accent-primary); flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: #fff; }
          .member-name { font-size: 0.82rem; flex: 1; }
          .member-role { font-size: 0.65rem; padding: 2px 6px; border-radius: 8px; background: rgba(255,255,255,0.06); color: var(--text-muted); font-weight: 600;
            &.is-manager { background: rgba(14,165,233,0.15); color: var(--accent-primary); } }
        }
        .no-members { display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.8rem; font-style: italic;
          .material-symbols-outlined { font-size: 16px; } }
      }

      .meta-row { display: flex; justify-content: space-between; padding-top: 4px;
        .meta-item { display: flex; flex-direction: column;
          .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
          .value { font-size: 1rem; font-weight: 700; } }
      }

      .progress-section {
        .progress-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; }
        .progress-bar-container { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); border-radius: 4px; transition: width 0.3s ease; }
        .pct { color: var(--text-primary); }
      }
    }

    .modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal-card { width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
      .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
        h3 { font-size: 1.2rem; }
        .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px;
          &:hover { color: var(--accent-danger); } }
      }
      .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }

    .error-alert { background: rgba(239,68,68,0.15); border: 1px solid #F87171; color: #F87171; padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem; }

    .section-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600;
      .material-symbols-outlined { font-size: 18px; } }

    .member-checklist {
      display: flex; flex-direction: column; gap: 4px;
      max-height: 210px; overflow-y: auto;
      border: 1px solid var(--border-color); border-radius: 10px; padding: 8px;
      background: var(--bg-main); margin-top: 8px;
    }

    .check-label {
      display: flex; align-items: center; gap: 10px; padding: 6px 8px;
      border-radius: 8px; cursor: pointer; transition: background 0.15s ease;
      &:hover { background: rgba(255,255,255,0.04); }
      input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent-primary); cursor: pointer; flex-shrink: 0; }
    }
    .check-avatar-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .check-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-primary);
      display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #fff; flex-shrink: 0; }
    .check-name { font-size: 0.85rem; flex: 1; }
    .check-role { font-size: 0.68rem; padding: 2px 6px; border-radius: 8px; background: rgba(255,255,255,0.06); color: var(--text-muted); }
    .hint { color: var(--text-muted); font-size: 0.75rem; margin-top: 6px; display: block; }

    .badge { padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; }
    .badge-active { background: rgba(16,185,129,0.15); color: #10B981; }
    .badge-planning { background: rgba(14,165,233,0.15); color: #0EA5E9; }
    .badge-on_hold { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .badge-completed { background: rgba(107,114,128,0.15); color: #9CA3AF; }
    .badge-low { background: rgba(16,185,129,0.15); color: #10B981; }
    .badge-medium { background: rgba(14,165,233,0.15); color: #0EA5E9; }
    .badge-high { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .badge-critical { background: rgba(239,68,68,0.15); color: #EF4444; }
  `]
})
export class ProjectListComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  ws = inject(WebsocketService);
  projects = signal<Project[]>([]);
  users = signal<any[]>([]);
  showCreateModal = false;
  showEditModal = false;
  errorMessage = '';

  newProject: any = {
    name: '', code: '', description: '', budget: 50000,
    priority: 'MEDIUM', status: 'ACTIVE', member_ids: [] as string[],
    assign_date: '', delivery_time: ''
  };
  editingProject: any = {};

  ngOnInit() {
    this.loadProjects();
    this.api.get<any[]>('/users').subscribe({ next: res => this.users.set(res) });
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'PROJECT_CREATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_DELETED') {
        this.loadProjects();
      }
    });
  }

  loadProjects() {
    this.api.get<Project[]>('/projects').subscribe({ next: res => this.projects.set(res) });
  }

  openCreateModal() {
    const today = new Date().toISOString().split('T')[0];
    const nextNum = (this.projects().length + 1).toString().padStart(3, '0');
    const autoCode = `PRJ-${nextNum}`;
    this.newProject = { name: '', code: autoCode, description: '', budget: 50000, priority: 'MEDIUM', status: 'ACTIVE', member_ids: [], assign_date: today, delivery_time: '' };
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  toggleMember(memberIds: string[], userId: string, event: any) {
    if (event.target.checked) {
      if (!memberIds.includes(userId)) memberIds.push(userId);
    } else {
      const idx = memberIds.indexOf(userId);
      if (idx > -1) memberIds.splice(idx, 1);
    }
  }

  createProject() {
    this.errorMessage = '';
    this.api.post('/projects', this.newProject).subscribe({
      next: () => { this.showCreateModal = false; this.loadProjects(); },
      error: (err) => { this.errorMessage = err.error?.detail || 'Failed to create project. Check if code already exists.'; }
    });
  }

  openEditModal(project: any) {
    this.editingProject = { ...project };
    this.editingProject.member_ids = project.members ? project.members.map((m: any) => m.user_id) : [];
    if (this.editingProject.assign_date) this.editingProject.assign_date = this.editingProject.assign_date.split('T')[0];
    if (this.editingProject.delivery_time) this.editingProject.delivery_time = this.editingProject.delivery_time.split('T')[0];
    this.showEditModal = true;
  }

  updateProject() {
    this.api.put('/projects/' + this.editingProject.id, this.editingProject).subscribe({
      next: () => { this.showEditModal = false; this.loadProjects(); }
    });
  }

  deleteProject(project: any, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete project "${project.name}"?\n\nThis will permanently remove all tasks, subtasks, milestones and member assignments for this project.`)) return;
    this.api.delete('/projects/' + project.id).subscribe({
      next: () => this.loadProjects(),
      error: (err) => alert('Failed to delete project: ' + (err.error?.detail || err.message))
    });
  }
}
