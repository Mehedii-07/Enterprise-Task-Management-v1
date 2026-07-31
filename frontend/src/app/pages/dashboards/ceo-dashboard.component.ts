import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ceo-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="header-banner glass-card">
        <div>
          <h2>CEO Master Control Dashboard</h2>
          <p>Global Multi-Tenant Enterprise Analytics & System Performance Monitoring</p>
        </div>
        <span class="badge badge-role">CEO SUPER ADMIN</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <div class="icon-wrapper blue">
            <span class="material-symbols-outlined">corporate_fare</span>
          </div>
          <div class="content">
            <span class="label">Organizations</span>
            <span class="value">{{ stats()?.total_organizations || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="icon-wrapper purple">
            <span class="material-symbols-outlined">group</span>
          </div>
          <div class="content">
            <span class="label">Total System Users</span>
            <span class="value">{{ stats()?.total_users || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="icon-wrapper amber">
            <span class="material-symbols-outlined">folder_special</span>
          </div>
          <div class="content">
            <span class="label">Active Projects</span>
            <span class="value">{{ stats()?.total_projects || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="icon-wrapper green">
            <span class="material-symbols-outlined">task</span>
          </div>
          <div class="content">
            <span class="label">System Tasks</span>
            <span class="value">{{ stats()?.task_analytics?.total_tasks || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="user-role-breakdown glass-card">
        <h3>Role Distribution Across Enterprise</h3>
        <div class="role-bars">
          <div class="role-stat">
            <span class="role-title">Company Admins</span>
            <span class="role-count">{{ stats()?.total_admins || 0 }}</span>
          </div>
          <div class="role-stat">
            <span class="role-title">Team Leads</span>
            <span class="role-count">{{ stats()?.total_team_leads || 0 }}</span>
          </div>
          <div class="role-stat">
            <span class="role-title">Employees</span>
            <span class="role-count">{{ stats()?.total_employees || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Active Projects Status -->
      <div class="projects-section glass-card" *ngIf="stats()?.active_projects?.length > 0">
        <div class="section-header" style="margin-bottom: 16px;">
          <h3 style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
            <span class="material-symbols-outlined icon">monitoring</span>
            <span>Enterprise Project Progress</span>
          </h3>
        </div>
        <div class="table-responsive">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Project Code</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Project Name</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Assigned Employee</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Status</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Overall Progress</th>
                <th style="padding: 12px 16px; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Report</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of stats()?.active_projects">
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <span class="badge" style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">{{ p.code }}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 500;">{{ p.name }}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <select
                    [ngModel]="p.assigned_to_id"
                    (ngModelChange)="assignProject(p.id, $event)"
                    style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px; border-radius: 4px; font-size: 0.85rem; width: 100%;">
                    <option [ngValue]="null">-- Unassigned --</option>
                    <option *ngFor="let u of users()" [value]="u.id">{{ u.first_name }} {{ u.last_name }}</option>
                  </select>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <span class="badge" [class]="'badge-' + (p.status || 'ACTIVE').toLowerCase()">{{ p.status }}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); min-width: 150px;">
                  <div class="progress-section">
                    <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                      <span>Completion</span>
                      <span class="font-bold" style="color: var(--accent-primary);">{{ p.progress_percentage || 0 }}%</span>
                    </div>
                    <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                      <div class="progress-bar-fill" [style.width.%]="p.progress_percentage || 0" style="height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); text-align: right;">
                  <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem;" (click)="downloadReport(p.id, p.name)" [disabled]="isDownloading[p.id]">
                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                    <span *ngIf="!isDownloading[p.id]">PDF</span>
                    <span *ngIf="isDownloading[p.id]">Wait...</span>
                  </button>
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
    }

    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 { font-size: 1.6rem; color: var(--text-primary); }
      p { color: var(--text-muted); font-size: 0.9rem; }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;

      .metric-card {
        display: flex;
        align-items: center;
        gap: 16px;

        .icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;

          &.blue { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
          &.purple { background: rgba(139, 92, 246, 0.2); color: #A78BFA; }
          &.amber { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
          &.green { background: rgba(16, 185, 129, 0.2); color: #34D399; }
        }

        .content {
          display: flex;
          flex-direction: column;
          .label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
          .value { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }
        }
      }
    }

    .user-role-breakdown {
      h3 { font-size: 1.1rem; margin-bottom: 20px; }

      .role-bars {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;

        .role-stat {
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;

          .role-title { font-weight: 600; color: var(--text-secondary); }
          .role-count { font-size: 1.4rem; font-weight: 800; color: var(--accent-primary); }
        }
      }
    }
  `]
})
export class CEODashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);
  users = signal<any[]>([]);

  ngOnInit() {
    this.loadDashboard();
    
    this.api.get('/users').subscribe({
      next: (res: any) => {
        const emps = Array.isArray(res) ? res.filter((u: any) => u.role?.name === 'EMPLOYEE' || u.role_id) : [];
        this.users.set(emps);
      }
    });

    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED') {
        this.loadDashboard();
      }
    });
  }

  loadDashboard() {
    this.api.get('/dashboards/ceo').subscribe({
      next: res => this.stats.set(res)
    });
  }

  assignProject(projectId: string, employeeId: string | null) {
    this.api.patch('/projects/' + projectId + '/assign', { assigned_to_id: employeeId }).subscribe({
      next: () => {
        this.loadDashboard();
      }
    });
  }

  isDownloading: { [key: string]: boolean } = {};
  downloadReport(projectId: string, projectName: string) {
    this.isDownloading[projectId] = true;
    this.api.downloadBlob(`/projects/${projectId}/export-pdf`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project_Report_${projectName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloading[projectId] = false;
      },
      error: (err) => {
        console.error('Failed to download PDF', err);
        alert('Failed to download project report.');
        this.isDownloading[projectId] = false;
      }
    });
  }
}
