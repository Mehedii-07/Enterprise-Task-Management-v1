import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <div class="header-banner glass-card">
        <div>
          <h2>Organization Admin Dashboard</h2>
          <p>Company Performance, Workforce Analytics & Project Overview</p>
        </div>
        <span class="badge badge-role">ORGANIZATION ADMIN</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Total Employees</span>
            <span class="value">{{ stats()?.total_employees || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Team Leads</span>
            <span class="value">{{ stats()?.total_team_leads || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Active Projects</span>
            <span class="value">{{ stats()?.active_projects || 0 }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Completed Projects</span>
            <span class="value">{{ stats()?.completed_projects || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="status-summary glass-card" *ngIf="stats()?.tasks_by_status">
        <h3>Tasks by Status Overview</h3>
        <div class="status-grid">
          <div class="status-item todo">
            <span class="st-name">TODO</span>
            <span class="st-val">{{ stats().tasks_by_status.TODO }}</span>
          </div>
          <div class="status-item in-progress">
            <span class="st-name">IN PROGRESS</span>
            <span class="st-val">{{ stats().tasks_by_status.IN_PROGRESS }}</span>
          </div>
          <div class="status-item review">
            <span class="st-name">REVIEW</span>
            <span class="st-val">{{ stats().tasks_by_status.REVIEW }}</span>
          </div>
          <div class="status-item completed">
            <span class="st-name">COMPLETED</span>
            <span class="st-val">{{ stats().tasks_by_status.COMPLETED }}</span>
          </div>
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
    .status-summary {
      h3 { font-size: 1.1rem; margin-bottom: 16px; }
      .status-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        .status-item {
          padding: 16px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          .st-name { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
          .st-val { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-top: 4px; }
        }
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(ApiService);
  stats = signal<any>(null);

  ngOnInit() {
    this.api.get('/dashboards/admin').subscribe({
      next: res => this.stats.set(res)
    });
  }
}
