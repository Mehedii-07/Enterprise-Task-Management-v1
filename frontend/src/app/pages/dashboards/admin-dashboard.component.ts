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

      <!-- Top Primary Metrics Grid -->
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

      <!-- Dedicated Project Analytics KPI Ribbon -->
      <div class="project-kpi-ribbon glass-card" *ngIf="analytics()?.summary">
        <div class="kpi-item">
          <div class="kpi-icon blue">
            <span class="material-symbols-outlined">analytics</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Average Project Progress</span>
            <span class="kpi-value text-primary">{{ analytics().summary.avg_progress }}%</span>
            <span class="kpi-subtext">{{ analytics().summary.total_projects }} Total Project(s)</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon green">
            <span class="material-symbols-outlined">flag</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Milestones & Deliverables</span>
            <span class="kpi-value" *ngIf="analytics().summary.total_milestones > 0">
              {{ analytics().summary.completed_milestones }} / {{ analytics().summary.total_milestones }} ({{ analytics().summary.milestone_completion_rate }}%)
            </span>
            <span class="kpi-value" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks > 0">
              {{ analytics().summary.completed_tasks }} / {{ analytics().summary.total_tasks }} Tasks ({{ analytics().summary.task_completion_rate }}%)
            </span>
            <span class="kpi-value" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks === 0">
              All Tasks Clear
            </span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones > 0">{{ analytics().summary.completed_tasks }} / {{ analytics().summary.total_tasks }} tasks done</span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks > 0">Task Milestone Progress</span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks === 0">No pending milestones</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon teal">
            <span class="material-symbols-outlined">check_circle</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">On Track Projects</span>
            <span class="kpi-value text-success">{{ analytics().project_health?.on_track || 0 }}</span>
            <span class="kpi-subtext">{{ analytics().project_health?.completed || 0 }} completed · {{ analytics().project_health?.active_on_track || 0 }} on schedule</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon red">
            <span class="material-symbols-outlined">warning</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Overdue Projects</span>
            <span class="kpi-value text-danger">{{ analytics().project_health?.overdue || 0 }}</span>
            <span class="kpi-subtext" *ngIf="analytics().project_health?.overdue === 0">Zero overdue projects</span>
            <span class="kpi-subtext text-danger" *ngIf="analytics().project_health?.overdue > 0">Requires attention</span>
          </div>
        </div>
      </div>

      <!-- Tasks by Status Overview -->
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

      <!-- Project Analytics 2x2 Grid -->
      <div class="dashboard-analytics-grid">
        <!-- Interactive Financial Chart -->
        <div class="financial-chart-container glass-card" *ngIf="analytics()?.financial_chart">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon blue-icon">stacked_bar_chart</span>
              <div>
                <h3>Project Budget & Revenue (Monthly Trends)</h3>
                <span class="sub-caption">Interactive breakdown of budget vs delivered revenue</span>
              </div>
            </div>

            <!-- Interactive View Controls -->
            <div class="interactive-controls">
              <!-- View Switcher -->
              <div class="pill-group">
                <button 
                  type="button"
                  class="pill-btn" 
                  [class.active]="chartViewMode() === 'chart'" 
                  (click)="setChartViewMode('chart')"
                  title="Switch to Interactive Chart View">
                  <span class="material-symbols-outlined" style="font-size: 15px;">bar_chart</span>
                  <span>Chart</span>
                </button>
                <button 
                  type="button"
                  class="pill-btn" 
                  [class.active]="chartViewMode() === 'table'" 
                  (click)="setChartViewMode('table')"
                  title="Switch to Table Breakdown View">
                  <span class="material-symbols-outlined" style="font-size: 15px;">table_chart</span>
                  <span>Table</span>
                </button>
              </div>

              <!-- Metric Filter -->
              <div class="pill-group" *ngIf="chartViewMode() === 'chart'">
                <button 
                  type="button"
                  class="pill-btn filter-pill" 
                  [class.active]="chartMetricFilter() === 'ALL'" 
                  (click)="setChartMetricFilter('ALL')">
                  All
                </button>
                <button 
                  type="button"
                  class="pill-btn filter-pill" 
                  [class.active]="chartMetricFilter() === 'BUDGET'" 
                  (click)="setChartMetricFilter('BUDGET')">
                  Budget
                </button>
                <button 
                  type="button"
                  class="pill-btn filter-pill" 
                  [class.active]="chartMetricFilter() === 'REVENUE'" 
                  (click)="setChartMetricFilter('REVENUE')">
                  Revenue
                </button>
              </div>
            </div>
          </div>
          
          <div *ngIf="analytics().financial_chart.length === 0" class="empty-state">
            <span class="material-symbols-outlined" style="font-size: 36px; color: var(--text-muted);">folder_off</span>
            <p>No financial trend data available yet.</p>
          </div>
          
          <!-- Mode 1: Interactive Bar Chart -->
          <div *ngIf="analytics().financial_chart.length > 0 && chartViewMode() === 'chart'" class="chart-content-wrap">
            <div class="css-bar-chart">
              <div class="chart-y-axis">
                <span>Budget</span>
                <span>0</span>
              </div>
              <div class="chart-bars">
                <div 
                  class="bar-group" 
                  *ngFor="let m of analytics().financial_chart"
                  [class.selected-group]="selectedMonth()?.month === m.month"
                  (click)="selectMonth(m)">
                  <div class="bar-wrapper">
                    <!-- Total Budget Bar -->
                    <div 
                      *ngIf="chartMetricFilter() === 'ALL' || chartMetricFilter() === 'BUDGET'"
                      class="bar total-bar" 
                      [style.height.%]="getBarHeight(m.revenue)" 
                      style="position: absolute; bottom: 0; width: 100%; background: rgba(14, 165, 233, 0.25); border-radius: 6px; transition: all 0.3s ease;">
                    </div>
                    <!-- Completed Revenue Bar -->
                    <div 
                      *ngIf="chartMetricFilter() === 'ALL' || chartMetricFilter() === 'REVENUE'"
                      class="bar completed-bar" 
                      [style.height.%]="getBarHeight(m.completed_revenue)" 
                      style="position: absolute; bottom: 0; width: 100%; background: #10B981; border-radius: 6px; transition: all 0.3s ease; box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);">
                    </div>

                    <!-- Interactive Tooltip on Hover -->
                    <div class="chart-tooltip">
                      <div class="tip-header">{{ m.month }}</div>
                      <div class="tip-row"><span class="tip-dot blue"></span> Budget: <strong>\${{ m.revenue | number:'1.0-0' }}</strong></div>
                      <div class="tip-row"><span class="tip-dot green"></span> Realized: <strong>\${{ m.completed_revenue | number:'1.0-0' }}</strong></div>
                      <div class="tip-row" *ngIf="m.active_revenue > 0"><span class="tip-dot amber"></span> Active: <strong>\${{ m.active_revenue | number:'1.0-0' }}</strong></div>
                      <div class="tip-rate">Realization: <strong>{{ m.realization_rate }}%</strong></div>
                      <div class="tip-action">Click to inspect projects</div>
                    </div>
                  </div>
                  <span class="bar-label" [class.active-label]="selectedMonth()?.month === m.month">{{ m.month }}</span>
                </div>
              </div>
            </div>

            <!-- Chart Legend & Hint -->
            <div class="chart-legend">
              <span class="legend-item" [class.faded]="chartMetricFilter() === 'REVENUE'" (click)="setChartMetricFilter(chartMetricFilter() === 'BUDGET' ? 'ALL' : 'BUDGET')">
                <span class="color-box" style="background: rgba(14, 165, 233, 0.4);"></span> 
                <span>Total Budget</span>
              </span>
              <span class="legend-item" [class.faded]="chartMetricFilter() === 'BUDGET'" (click)="setChartMetricFilter(chartMetricFilter() === 'REVENUE' ? 'ALL' : 'REVENUE')">
                <span class="color-box" style="background: #10B981;"></span> 
                <span>Completed Revenue</span>
              </span>
              <span class="hint-text">💡 Click any bar to inspect projects</span>
            </div>

            <!-- Selected Month Inspector Card -->
            <div class="month-inspector-card" *ngIf="selectedMonth()">
              <div class="inspector-header">
                <div class="ins-title">
                  <span class="badge badge-role">{{ selectedMonth().month }} Portfolio Breakdown</span>
                  <span class="ins-count">{{ selectedMonth().projects_count }} Project(s)</span>
                </div>
                <button class="close-ins-btn" (click)="selectedMonth.set(null)" title="Close Inspector">✕</button>
              </div>

              <div class="inspector-metrics">
                <div class="ins-metric">
                  <span class="ins-label">Allocated Budget</span>
                  <span class="ins-val text-primary">\${{ selectedMonth().revenue | number:'1.0-0' }}</span>
                </div>
                <div class="ins-metric">
                  <span class="ins-label">Delivered Revenue</span>
                  <span class="ins-val text-success">\${{ selectedMonth().completed_revenue | number:'1.0-0' }}</span>
                </div>
                <div class="ins-metric">
                  <span class="ins-label">In-Flight / Remaining</span>
                  <span class="ins-val" style="color: #F59E0B;">\${{ selectedMonth().active_revenue | number:'1.0-0' }}</span>
                </div>
                <div class="ins-metric">
                  <span class="ins-label">Realization Rate</span>
                  <span class="ins-val font-bold">{{ selectedMonth().realization_rate }}%</span>
                </div>
              </div>

              <!-- Projects list in selected month -->
              <div class="inspector-projects" *ngIf="selectedMonth().projects?.length > 0">
                <div class="ins-p-item" *ngFor="let p of selectedMonth().projects">
                  <div class="ins-p-left">
                    <span class="badge badge-code">{{ p.code }}</span>
                    <span class="ins-p-name font-bold">{{ p.name }}</span>
                    <span class="badge" [ngClass]="'badge-' + p.status.toLowerCase()">{{ p.status }}</span>
                  </div>
                  <div class="ins-p-right">
                    <span class="ins-p-budget font-bold">\${{ p.budget | number:'1.0-0' }}</span>
                    <div class="ins-p-progress">
                      <span>{{ p.progress_percentage }}%</span>
                      <div class="ins-mini-bar"><div class="ins-mini-fill" [style.width.%]="p.progress_percentage"></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mode 2: Interactive Table View -->
          <div *ngIf="analytics().financial_chart.length > 0 && chartViewMode() === 'table'" class="chart-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Budget</th>
                  <th>Completed Revenue</th>
                  <th>Active / In-Flight</th>
                  <th>Realization Rate</th>
                  <th>Projects</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of analytics().financial_chart" (click)="selectMonth(m)" [class.selected-tr]="selectedMonth()?.month === m.month" style="cursor: pointer;">
                  <td class="font-bold text-primary">{{ m.month }}</td>
                  <td>\${{ m.revenue | number:'1.0-0' }}</td>
                  <td class="text-success font-bold">\${{ m.completed_revenue | number:'1.0-0' }}</td>
                  <td style="color: #F59E0B;">\${{ m.active_revenue | number:'1.0-0' }}</td>
                  <td style="width: 140px;">
                    <div class="progress-section">
                      <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                        <span>{{ m.realization_rate }}%</span>
                      </div>
                      <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill" [style.width.%]="m.realization_rate" style="height: 100%; background: #10B981; border-radius: 4px;"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" style="background: rgba(0,0,0,0.06);">{{ m.projects_count }} projects</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Project Phase Distribution -->
        <div class="phase-distribution-card glass-card" *ngIf="analytics()?.phase_distribution">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon purple-icon">donut_small</span>
              <div>
                <h3>Project Phase Distribution</h3>
                <span class="sub-caption">Status & delivery stage across all projects</span>
              </div>
            </div>
          </div>

          <div class="phase-list">
            <div class="phase-row" *ngFor="let item of analytics().phase_distribution">
              <div class="phase-header">
                <span class="badge" [ngClass]="'phase-' + item.phase.toLowerCase().replace(' ', '-')">{{ item.phase }}</span>
                <span class="phase-stats"><strong>{{ item.count }}</strong> ({{ item.percentage }}%)</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" [style.width.%]="item.percentage" [ngClass]="'fill-' + item.phase.toLowerCase().replace(' ', '-')"></div>
              </div>
            </div>
          </div>

          <!-- Priority Matrix Quick Tags -->
          <div class="priority-summary-section" *ngIf="analytics()?.priority_distribution">
            <h4>Project Priority Breakdown</h4>
            <div class="priority-pills">
              <span class="pill pill-critical">CRITICAL: {{ analytics().priority_distribution.CRITICAL }}</span>
              <span class="pill pill-high">HIGH: {{ analytics().priority_distribution.HIGH }}</span>
              <span class="pill pill-medium">MEDIUM: {{ analytics().priority_distribution.MEDIUM }}</span>
              <span class="pill pill-low">LOW: {{ analytics().priority_distribution.LOW }}</span>
            </div>
          </div>
        </div>

        <!-- Employee Productivity Board -->
        <div class="productivity-board glass-card" *ngIf="analytics()?.employee_productivity">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon green-icon">leaderboard</span>
              <div>
                <h3>Employee Productivity Board</h3>
                <span class="sub-caption">Workforce project completion efficiency</span>
              </div>
            </div>
          </div>
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
                  <td style="width: 140px;">
                    <div class="progress-section">
                      <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                        <span>Rate</span>
                        <span class="font-bold text-primary">{{ emp.completion_rate }}%</span>
                      </div>
                      <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
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

        <!-- Project Delivery & Velocity Summary -->
        <div class="velocity-summary-card glass-card" *ngIf="analytics()?.summary">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon amber-icon">speed</span>
              <div>
                <h3>Project Execution & Delivery Metrics</h3>
                <span class="sub-caption">Enterprise milestone completion & capacity</span>
              </div>
            </div>
          </div>

          <div class="velocity-metrics-list">
            <div class="velocity-row">
              <span class="v-label">Total Organization Projects</span>
              <span class="v-val font-bold">{{ analytics().summary.total_projects }}</span>
            </div>
            <div class="velocity-row">
              <span class="v-label">Active Workload Projects</span>
              <span class="v-val text-primary font-bold">{{ analytics().summary.active_projects }}</span>
            </div>
            <div class="velocity-row">
              <span class="v-label">Completed Deliverables</span>
              <span class="v-val text-success font-bold">{{ analytics().summary.completed_projects }}</span>
            </div>
            <div class="velocity-row">
              <span class="v-label">Total Tasks in Projects</span>
              <span class="v-val font-bold">{{ analytics().summary.total_tasks }} ({{ analytics().summary.completed_tasks }} Done - {{ analytics().summary.task_completion_rate }}%)</span>
            </div>
            <div class="velocity-row">
              <span class="v-label">Total Allocated Budget</span>
              <span class="v-val font-bold">{{ analytics().summary.total_budget | currency:'USD':'symbol':'1.0-0' }}</span>
            </div>
            <div class="velocity-row">
              <span class="v-label">Delivered Revenue</span>
              <span class="v-val text-success font-bold">{{ analytics().summary.completed_revenue | currency:'USD':'symbol':'1.0-0' }}</span>
            </div>
          </div>
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;

      .metric-card {
        min-width: 0;
        box-sizing: border-box;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 14px;

        .icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;

          &.blue { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
          &.purple { background: rgba(139, 92, 246, 0.2); color: #A78BFA; }
          &.amber { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
          &.green { background: rgba(16, 185, 129, 0.2); color: #34D399; }
        }

        .content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;

          .label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .value { font-size: 1.4rem; font-weight: 800; color: var(--accent-primary); line-height: 1.2; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }
      }
    }

    .project-kpi-ribbon {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      padding: 18px 22px;
      box-sizing: border-box;
      min-width: 0;
      width: 100%;

      .kpi-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        min-width: 0;
        overflow: hidden;

        .kpi-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;

          &.blue { background: rgba(14, 165, 233, 0.15); color: #0EA5E9; }
          &.green { background: rgba(16, 185, 129, 0.15); color: #10B981; }
          &.teal { background: rgba(20, 184, 166, 0.15); color: #14B8A6; }
          &.red { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
        }

        .kpi-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          overflow: hidden;

          .kpi-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.03em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .kpi-value { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .kpi-subtext { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }
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
    
    .dashboard-analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;

      > div {
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
      }
    }

    .section-title-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;

      .title-left {
        display: flex;
        align-items: center;
        gap: 10px;

        .icon {
          font-size: 24px;
          &.blue-icon { color: #0EA5E9; }
          &.purple-icon { color: #8B5CF6; }
          &.green-icon { color: #10B981; }
          &.amber-icon { color: #F59E0B; }
        }
        h3 { font-size: 1.1rem; margin: 0; font-weight: 600; line-height: 1.2; }
        .sub-caption { font-size: 0.75rem; color: var(--text-muted); display: block; }
      }

      .interactive-controls {
        display: flex;
        align-items: center;
        gap: 8px;

        .pill-group {
          display: flex;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 2px;
          gap: 2px;

          .pill-btn {
            background: transparent;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;

            &:hover { color: var(--text-primary); }

            &.active {
              background: var(--bg-card);
              color: var(--accent-primary);
              box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            }
          }
        }
      }
    }
    
    .empty-state {
      padding: 36px;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
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
          width: 44px;
          height: 100%;
          cursor: pointer;
          transition: transform 0.2s ease;

          &:hover {
            transform: scale(1.04);
            .bar-label { color: var(--accent-primary); font-weight: 700; }
          }

          &.selected-group {
            .bar-wrapper {
              outline: 2px solid var(--accent-primary);
              outline-offset: 2px;
              border-radius: 6px;
            }
            .bar-label {
              color: var(--accent-primary);
              font-weight: 800;
            }
          }
          
          .bar-wrapper {
            position: relative;
            width: 100%;
            flex: 1;

            &:hover .chart-tooltip {
              opacity: 1;
              visibility: visible;
              transform: translateX(-50%) translateY(-6px);
            }
          }
          
          .bar-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 8px;
            transition: color 0.2s;
          }
        }
      }
      
      .chart-tooltip {
        position: absolute;
        bottom: 105%;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        background: #0F172A;
        color: #F8FAFC;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.75rem;
        white-space: nowrap;
        pointer-events: none;
        z-index: 50;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, transform 0.2s ease;

        .tip-header { font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2px; }
        .tip-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
          .tip-dot {
            width: 8px; height: 8px; border-radius: 50%;
            &.blue { background: #0EA5E9; }
            &.green { background: #10B981; }
            &.amber { background: #F59E0B; }
          }
        }
        .tip-rate { margin-top: 4px; color: #10B981; font-weight: 700; font-size: 0.7rem; }
        .tip-action { font-size: 0.65rem; color: #94A3B8; margin-top: 4px; font-style: italic; }
      }
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 18px;
      margin-top: 16px;
      font-size: 0.75rem;
      color: var(--text-muted);
      flex-wrap: wrap;
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
        transition: opacity 0.2s;

        &.faded { opacity: 0.4; text-decoration: line-through; }
      }
      .color-box { width: 12px; height: 12px; border-radius: 3px; }
      .hint-text { font-size: 0.72rem; color: var(--text-muted); margin-left: 8px; }
    }

    .month-inspector-card {
      margin-top: 20px;
      padding: 16px;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      animation: fadeIn 0.25s ease;

      .inspector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .ins-title {
          display: flex;
          align-items: center;
          gap: 10px;
          .ins-count { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        }

        .close-ins-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1rem;
          padding: 2px 6px;
          border-radius: 4px;
          &:hover { background: rgba(0,0,0,0.06); color: var(--text-primary); }
        }
      }

      .inspector-metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 14px;

        .ins-metric {
          background: var(--bg-card);
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;

          .ins-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
          .ins-val { font-size: 1rem; font-weight: 700; margin-top: 2px; }
        }
      }

      .inspector-projects {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .ins-p-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;

          .ins-p-left {
            display: flex;
            align-items: center;
            gap: 10px;
            .badge-code { background: rgba(0,0,0,0.06); font-size: 0.72rem; }
            .ins-p-name { font-size: 0.85rem; }
          }

          .ins-p-right {
            display: flex;
            align-items: center;
            gap: 16px;
            .ins-p-budget { font-size: 0.85rem; }
            .ins-p-progress {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.75rem;
              .ins-mini-bar {
                width: 60px; height: 6px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden;
                .ins-mini-fill { height: 100%; background: var(--accent-primary); }
              }
            }
          }
        }
      }
    }

    .chart-table-wrap {
      margin-top: 10px;
      .selected-tr { background: rgba(14, 165, 233, 0.08) !important; }
    }

    .phase-distribution-card {
      .phase-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .phase-row {
          .phase-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            margin-bottom: 6px;
            .phase-stats { font-size: 0.8rem; color: var(--text-muted); }
          }
          .progress-bar-container {
            width: 100%;
            height: 8px;
            background: rgba(0,0,0,0.06);
            border-radius: 4px;
            overflow: hidden;

            .progress-bar-fill {
              height: 100%;
              border-radius: 4px;
              transition: width 0.3s ease;

              &.fill-planning { background: #3B82F6; }
              &.fill-in-progress { background: #0EA5E9; }
              &.fill-testing { background: #8B5CF6; }
              &.fill-completed { background: #10B981; }
              &.fill-on-hold { background: #F59E0B; }
            }
          }
        }
      }

      .priority-summary-section {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color);

        h4 { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; font-weight: 600; }
        .priority-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;

          .pill {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;

            &.pill-critical { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
            &.pill-high { background: rgba(249, 115, 22, 0.15); color: #F97316; }
            &.pill-medium { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
            &.pill-low { background: rgba(59, 130, 246, 0.15); color: #3B82F6; }
          }
        }
      }
    }

    .velocity-summary-card {
      .velocity-metrics-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .velocity-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 8px;

          .v-label { font-size: 0.85rem; color: var(--text-secondary); }
          .v-val { font-size: 0.95rem; }
        }
      }
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
      th { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); }
    }
    .text-primary { color: var(--accent-primary); }
    .text-success { color: var(--accent-success); }
    .text-danger { color: var(--accent-danger); }
    .font-bold { font-weight: 700; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (min-width: 1850px) {
      .metrics-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }
    }

    @media (max-width: 1366px) {
      .project-kpi-ribbon {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 1200px) {
      .dashboard-analytics-grid {
        grid-template-columns: 1fr;
      }
      .status-summary .status-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 900px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .header-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .project-kpi-ribbon {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .status-summary .status-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);
  analytics = signal<any>(null);

  // Interactive View States
  chartViewMode = signal<'chart' | 'table'>('chart');
  chartMetricFilter = signal<'ALL' | 'BUDGET' | 'REVENUE'>('ALL');
  selectedMonth = signal<any>(null);

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

  selectMonth(m: any) {
    if (this.selectedMonth()?.month === m.month) {
      this.selectedMonth.set(null);
    } else {
      this.selectedMonth.set(m);
    }
  }

  setChartViewMode(mode: 'chart' | 'table') {
    this.chartViewMode.set(mode);
  }

  setChartMetricFilter(filter: 'ALL' | 'BUDGET' | 'REVENUE') {
    this.chartMetricFilter.set(filter);
  }
}
