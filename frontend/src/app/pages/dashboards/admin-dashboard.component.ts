import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';

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

        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Total Revenue</span>
            <span class="value" style="color: #10B981;">{{ (stats()?.total_revenue || 0) | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="content">
            <span class="label">Remaining Budget</span>
            <span class="value" style="color: #FBBF24;">{{ (stats()?.total_remaining_budget || 0) | currency:'USD':'symbol':'1.0-0' }}</span>
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

      <!-- Financial Chart & Productivity Board Grid -->
      <div class="dashboard-bottom-grid">
        <!-- Financial Chart -->
        <div class="financial-chart-container glass-card" *ngIf="analytics()?.financial_chart">
          <h3>Project Budget & Revenue (Monthly)</h3>
          
          <div *ngIf="analytics().financial_chart.length === 0" class="empty-state">
            No financial data available yet.
          </div>
          
          <div class="css-bar-chart" *ngIf="analytics().financial_chart.length > 0">
            <div class="chart-y-axis">
              <span>Budget</span>
              <span>0</span>
            </div>
            <div class="chart-bars">
              <div class="bar-group" *ngFor="let m of analytics().financial_chart">
                <div class="bar-wrapper" [title]="'Total Revenue: $' + m.revenue + '\nCompleted: $' + m.completed_revenue">
                  <div class="bar total-bar" [style.height.%]="getBarHeight(m.revenue)" style="position: absolute; bottom: 0; width: 100%; background: rgba(59, 130, 246, 0.3); border-radius: 4px;"></div>
                  <div class="bar completed-bar" [style.height.%]="getBarHeight(m.completed_revenue)" style="position: absolute; bottom: 0; width: 100%; background: #10B981; border-radius: 4px;"></div>
                </div>
                <span class="bar-label">{{ m.month }}</span>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="color-box" style="background: rgba(59, 130, 246, 0.3);"></span> Total Budget</span>
              <span class="legend-item"><span class="color-box" style="background: #10B981;"></span> Completed Revenue</span>
            </div>
          </div>
        </div>

        <!-- Employee Productivity Board -->
        <div class="productivity-board glass-card" *ngIf="analytics()?.employee_productivity">
          <h3>Employee Productivity Board</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Completed / Assigned</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let emp of analytics().employee_productivity">
                  <td>
                    <div style="font-weight: 600;">{{ emp.name }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">{{ emp.job_title || 'Employee' }}</div>
                  </td>
                  <td>{{ emp.completed }} / {{ emp.total_assigned }}</td>
                  <td style="width: 120px;">
                    <div class="progress-section">
                      <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                        <span>Rate</span>
                        <span class="font-bold text-primary">{{ emp.completion_rate }}%</span>
                      </div>
                      <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill" [style.width.%]="emp.completion_rate" style="height: 100%; background: var(--accent-primary); border-radius: 4px;"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="analytics().employee_productivity.length === 0" class="empty-state">
              No employees found.
            </div>
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
    
    .dashboard-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 10px;
    }
    
    h3 { font-size: 1.1rem; margin-bottom: 16px; }
    
    .empty-state {
      padding: 30px;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
    }
    
    .css-bar-chart {
      display: flex;
      flex-direction: column;
      height: 250px;
      position: relative;
      padding-left: 50px;
      padding-bottom: 40px;
      
      .chart-y-axis {
        position: absolute;
        left: 0; top: 0; bottom: 40px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--text-muted);
        border-right: 1px solid var(--border-color);
        padding-right: 8px;
        align-items: flex-end;
      }
      
      .chart-bars {
        display: flex;
        flex: 1;
        align-items: flex-end;
        justify-content: space-around;
        border-bottom: 1px solid var(--border-color);
        padding-top: 20px;
        
        .bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 40px;
          height: 100%;
          
          .bar-wrapper {
            position: relative;
            width: 100%;
            flex: 1;
          }
          
          .bar-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 8px;
          }
        }
      }
      
      .chart-legend {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 16px;
        font-size: 0.75rem;
        color: var(--text-muted);
        
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .color-box { width: 12px; height: 12px; border-radius: 2px; }
      }
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
      th { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); }
    }
    .text-primary { color: var(--accent-primary); }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);
  analytics = signal<any>(null);

  ngOnInit() {
    this.loadDashboard();
    this.loadAnalytics();
    
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED' || msg.event === 'PROJECT_DELETED') {
        this.loadDashboard();
        this.loadAnalytics();
      }
    });
  }

  loadDashboard() {
    this.api.get('/dashboards/admin').subscribe({
      next: res => this.stats.set(res)
    });
  }

  loadAnalytics() {
    this.api.get('/analytics/admin').subscribe({
      next: res => this.analytics.set(res)
    });
  }
  
  getBarHeight(value: number): number {
    const data = this.analytics()?.financial_chart;
    if (!data || data.length === 0) return 0;
    
    let max = Math.max(...data.map((d: any) => Math.max(d.revenue, d.completed_revenue)));
    if (max === 0) max = 100;
    
    return (value / max) * 100;
  }
}
