import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';

@Component({
  selector: 'app-team-lead-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="header-banner glass-card">
        <div>
          <h2>Team Lead Workspace Dashboard</h2>
          <p>Monitor Team Execution, Review Deliverables & Track Milestones</p>
        </div>
        <span class="badge badge-role">TEAM LEAD</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <span class="label">Team Size</span>
          <span class="value">{{ stats()?.team_size || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Active Team Projects</span>
          <span class="value">{{ stats()?.active_projects_count || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Team Tasks Completed</span>
          <span class="value">{{ stats()?.completed_team_tasks || 0 }} / {{ stats()?.total_team_tasks || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">Completion Rate</span>
          <span class="value">{{ stats()?.team_completion_rate || 0 }}%</span>
        </div>
      </div>

      <!-- Active Projects Table -->
      <div class="projects-section glass-card" *ngIf="stats()?.active_projects?.length > 0">
        <div class="section-header">
          <h3>
            <span class="material-symbols-outlined icon">domain</span>
            <span>Active Team Projects</span>
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page { display: flex; flex-direction: column; gap: 24px; }
    .header-banner { display: flex; justify-content: space-between; align-items: center; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      .metric-card {
        .label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
        .value { font-size: 1.8rem; font-weight: 800; color: var(--accent-primary); display: block; margin-top: 4px; }
      }
    }
    .projects-section {
      .section-header { margin-bottom: 16px; h3 { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; } }
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
  `]
})
export class TeamLeadDashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);

  ngOnInit() {
    this.loadDashboard();
    
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED') {
        this.loadDashboard();
      }
    });
  }

  loadDashboard() {
    this.api.get('/dashboards/team-lead').subscribe({
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
}
