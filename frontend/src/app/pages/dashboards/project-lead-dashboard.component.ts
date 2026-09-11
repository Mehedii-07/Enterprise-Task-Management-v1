import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';

@Component({
  selector: 'app-project-lead-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="header-banner glass-card">
        <div>
          <h2>Project Lead Workspace Dashboard</h2>
          <p>Monitor Project Execution, Review Deliverables & Track Milestones</p>
        </div>
        <span class="badge badge-role">PROJECT LEAD</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <span class="label">Project Team Size</span>
          <span class="value">{{ stats()?.team_size || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Active Projects</span>
          <span class="value">{{ stats()?.active_projects_count || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Tasks Completed</span>
          <span class="value">{{ stats()?.completed_team_tasks || 0 }} / {{ stats()?.total_team_tasks || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Completion Rate</span>
          <span class="value">{{ stats()?.team_completion_rate || 0 }}%</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Pending Tasks</span>
          <span class="value" style="color: #F59E0B;">{{ stats()?.pending_team_tasks || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Overdue Tasks</span>
          <span class="value" style="color: #EF4444;">{{ stats()?.overdue_team_tasks || 0 }}</span>
        </div>
      </div>

      <!-- Active Projects Table -->
      <div class="projects-section glass-card" *ngIf="stats()?.active_projects?.length > 0">
        <div class="section-header">
          <h3>
            <span class="material-symbols-outlined icon">domain</span>
            <span>Active Projects & Milestones</span>
          </h3>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project Code</th>
                <th>Project Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Budget</th>
                <th>Milestones Checklist</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of stats()?.active_projects">
                <td class="font-bold text-primary">{{ p.code }}</td>
                <td>{{ p.name }}</td>
                <td>
                  <select
                    [ngModel]="p.status"
                    (ngModelChange)="updateProjectStatus(p, $event)"
                    class="status-select">
                    <option value="PLANNING">PLANNING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </td>
                <td>
                  <span class="badge" [ngClass]="'priority-' + (p.priority || 'MEDIUM').toLowerCase()">
                    {{ p.priority }}
                  </span>
                </td>
                <td>\${{ p.budget | number }}</td>
                <td style="min-width: 220px;">
                  <div class="milestones-checklist">
                    <div *ngIf="!p.milestones || p.milestones.length === 0" class="text-muted" style="font-size: 0.8rem; font-style: italic;">No milestones defined.</div>
                    <div *ngFor="let m of p.milestones" class="milestone-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <input type="checkbox" [checked]="m.is_completed" (change)="toggleMilestone(p, m, $event)" style="cursor: pointer; accent-color: var(--accent-success); width: 16px; height: 16px;" />
                      <span [style.text-decoration]="m.is_completed ? 'line-through' : 'none'" [style.color]="m.is_completed ? 'var(--text-muted)' : 'inherit'" style="font-size: 0.85rem;">{{ m.title }}</span>
                    </div>
                  </div>
                </td>
                <td style="min-width: 120px;">
                  <div style="font-size: 0.8rem; font-weight: 700; margin-bottom: 4px; color: var(--accent-primary);">{{ p.progress_percentage || 0 }}%</div>
                  <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                    <div [style.width.%]="p.progress_percentage || 0" style="height: 100%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); transition: width 0.3s ease;"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      .metric-card {
        min-width: 0;
        box-sizing: border-box;
        padding: 18px 20px;
        .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .value { font-size: 1.5rem; font-weight: 800; color: var(--accent-primary); display: block; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      }
    }
    .projects-section {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
        h3 { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
      }
      .data-table { width: 100%; border-collapse: collapse; th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); } th { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); } }
      .text-primary { color: var(--accent-primary); }
      .status-select {
        background: var(--bg-main);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.85rem;
      }
    }

    .milestones-checklist {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 120px;
      overflow-y: auto;
    }

    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .header-banner { flex-direction: column; align-items: flex-start; gap: 12px; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .projects-section .section-header { flex-direction: column; align-items: flex-start; }
    }
    @media (max-width: 480px) {
      .metrics-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProjectLeadDashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);

  ngOnInit() {
    this.loadDashboard();
    
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED' || msg.event === 'PROJECT_DELETED') {
        this.loadDashboard();
      }
    });
  }

  loadDashboard() {
    this.api.get('/dashboards/project-lead').subscribe({
      next: res => this.stats.set(res)
    });
  }

  updateProjectStatus(project: any, newStatus: string) {
    this.api.put('/projects/' + project.id, { status: newStatus }).subscribe({
      next: () => {
        project.status = newStatus;
        this.loadDashboard();
      }
    });
  }

  toggleMilestone(project: any, milestone: any, event: any) {
    const isCompleted = event.target.checked;
    milestone.is_completed = isCompleted;

    const totalM = (project.milestones || []).length;
    const doneM = (project.milestones || []).filter((m: any) => m.is_completed).length;
    if (totalM > 0) {
      project.progress_percentage = Math.round((doneM / totalM) * 100);
    }

    this.api.patch(`/projects/${project.id}/milestones/${milestone.id}`, {
      is_completed: isCompleted
    }).subscribe({
      next: () => this.loadDashboard(),
      error: () => {
        milestone.is_completed = !isCompleted;
        this.loadDashboard();
      }
    });
  }
}
