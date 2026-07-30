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
          <p>Enterprise Project Portfolio, Real-time Statuses, Budgets & Strategic Goals</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal = true">
          <span class="material-symbols-outlined">add</span>
          <span>New Project</span>
        </button>
      </div>

      <div class="projects-grid">
        <div class="project-card glass-card" *ngFor="let project of projects()">
          <div class="card-header">
            <span class="code-badge">{{ project.code }}</span>
            <div class="header-actions">
              <span class="badge" [class]="'badge-' + (project.status || 'ACTIVE').toLowerCase()">{{ project.status }}</span>
              <button *ngIf="auth.hasRole(['CEO', 'ADMIN'])" class="icon-btn" (click)="openEditModal(project)" title="Edit Project">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </div>
          </div>

          <h3 class="title">{{ project.name }}</h3>
          <p class="desc">{{ project.description || 'No description provided.' }}</p>

          <div class="meta-row">
            <div class="meta-item">
              <span class="label">Budget</span>
              <span class="value">\${{ project.budget | number }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Priority</span>
              <span class="badge" [class]="'badge-' + (project.priority || 'MEDIUM').toLowerCase()">{{ project.priority }}</span>
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
          <h3>Create New Enterprise Project</h3>
          
          <div *ngIf="errorMessage" class="error-alert" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #F87171; color: #F87171; padding: 10px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem;">
            {{ errorMessage }}
          </div>

          <form (ngSubmit)="createProject()">
            <div class="form-group">
              <label>Project Name</label>
              <input type="text" [(ngModel)]="newProject.name" name="name" required />
            </div>

            <div class="form-group">
              <label>Project Code</label>
              <input type="text" [(ngModel)]="newProject.code" name="code" placeholder="PRJ-002" required />
            </div>

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

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newProject.description" name="description" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Assign Team Members</label>
              <select [(ngModel)]="newProject.member_ids" name="member_ids" multiple class="multi-select" style="height: 120px;">
                <option *ngFor="let u of users()" [value]="u.id">{{ u.first_name }} {{ u.last_name }} ({{ u.role.name }})</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Hold Ctrl/Cmd to select multiple employees</small>
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
          <h3>Edit Project Details</h3>
          <form (ngSubmit)="updateProject()">
            <div class="form-group">
              <label>Project Name</label>
              <input type="text" [(ngModel)]="editingProject.name" name="edit_name" required />
            </div>

            <div class="form-group">
              <label>Project Code</label>
              <input type="text" [(ngModel)]="editingProject.code" name="edit_code" required />
            </div>

            <div class="form-group">
              <label>Budget ($)</label>
              <input type="number" [(ngModel)]="editingProject.budget" name="edit_budget" />
            </div>

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
              <label>Priority</label>
              <select [(ngModel)]="editingProject.priority" name="edit_priority">
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="editingProject.description" name="edit_description" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Update Team Members</label>
              <select [(ngModel)]="editingProject.member_ids" name="edit_member_ids" multiple class="multi-select" style="height: 120px;">
                <option *ngFor="let u of users()" [value]="u.id">{{ u.first_name }} {{ u.last_name }} ({{ u.role.name }})</option>
              </select>
              <small style="color: var(--text-muted); font-size: 0.75rem;">Hold Ctrl/Cmd to select multiple employees</small>
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
    .page-header { display: flex; justify-content: space-between; align-items: center; }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;

      .project-card {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .card-header {
          display: flex; justify-content: space-between; align-items: center;
          .code-badge { font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); background: rgba(59, 130, 246, 0.15); padding: 4px 8px; border-radius: 6px; }
          .header-actions { display: flex; align-items: center; gap: 8px; }
          .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 4px; &:hover { color: var(--accent-primary); background: rgba(255,255,255,0.05); } }
        }

        .title { font-size: 1.2rem; color: var(--text-primary); }
        .desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; flex: 1; }

        .meta-row {
          display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border-color);
          .meta-item { display: flex; flex-direction: column;
            .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
            .value { font-size: 1rem; font-weight: 700; }
          }
        }

        .progress-section {
          margin-top: 8px;
          .progress-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
          .progress-bar-container { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
          .progress-bar-fill { height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.3s ease; }
          .pct { color: var(--text-primary); }
        }
      }
    }

    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      padding: 16px;
    }
    .modal-card { width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
      h3 { font-size: 1.3rem; margin-bottom: 20px; }
      .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    }
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

  newProject = {
    name: '',
    code: '',
    description: '',
    budget: 50000,
    priority: 'MEDIUM',
    status: 'ACTIVE',
    member_ids: [] as string[]
  };

  editingProject: any = {};

  ngOnInit() {
    this.loadProjects();
    this.api.get<any[]>('/users').subscribe({
      next: res => this.users.set(res)
    });
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'PROJECT_CREATED' || msg.event === 'PROJECT_UPDATED') {
        this.loadProjects();
      }
    });
  }

  loadProjects() {
    this.api.get<Project[]>('/projects').subscribe({
      next: res => this.projects.set(res)
    });
  }

  createProject() {
    this.errorMessage = '';
    this.api.post('/projects', this.newProject).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newProject = { name: '', code: '', description: '', budget: 50000, priority: 'MEDIUM', status: 'ACTIVE', member_ids: [] };
        this.loadProjects();
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Failed to create project. Check if code already exists.';
      }
    });
  }

  openEditModal(project: any) {
    this.editingProject = { ...project };
    this.editingProject.member_ids = project.members ? project.members.map((m: any) => m.user_id) : [];
    this.showEditModal = true;
  }

  updateProject() {
    this.api.put('/projects/' + this.editingProject.id, this.editingProject).subscribe({
      next: () => {
        this.showEditModal = false;
        this.loadProjects();
      }
    });
  }
}
