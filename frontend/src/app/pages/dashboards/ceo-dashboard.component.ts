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

      <!-- Top Primary Metrics Grid -->
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

        <div class="metric-card glass-card">
          <div class="icon-wrapper green" style="background: rgba(16, 185, 129, 0.2); color: #34D399;">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <div class="content">
            <span class="label">Total Revenue</span>
            <span class="value">{{ (stats()?.total_revenue || 0) | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
        </div>

        <div class="metric-card glass-card">
          <div class="icon-wrapper amber" style="background: rgba(245, 158, 11, 0.2); color: #FBBF24;">
            <span class="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div class="content">
            <span class="label">Remaining Budget</span>
            <span class="value">{{ (stats()?.total_remaining_budget || 0) | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
        </div>
      </div>

      <!-- Executive Project Analytics KPI Ribbon -->
      <div class="project-kpi-ribbon glass-card" *ngIf="analytics()?.summary">
        <div class="kpi-item">
          <div class="kpi-icon blue">
            <span class="material-symbols-outlined">insights</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Average Project Progress</span>
            <span class="kpi-value text-primary">{{ analytics().summary.avg_progress }}%</span>
            <span class="kpi-subtext">{{ analytics().summary.total_projects }} Total Project(s)</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon green">
            <span class="material-symbols-outlined">checklist_rtl</span>
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
              All Deliverables Complete
            </span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones > 0">{{ analytics().summary.completed_tasks }} / {{ analytics().summary.total_tasks }} tasks done</span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks > 0">Task Milestone Tracking</span>
            <span class="kpi-subtext" *ngIf="analytics().summary.total_milestones === 0 && analytics().summary.total_tasks === 0">No pending items</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon teal">
            <span class="material-symbols-outlined">verified</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">On Track Projects</span>
            <span class="kpi-value text-success">{{ analytics().project_health?.on_track || 0 }}</span>
            <span class="kpi-subtext">{{ analytics().project_health?.completed || 0 }} completed · {{ analytics().project_health?.active_on_track || 0 }} on schedule</span>
          </div>
        </div>

        <div class="kpi-item">
          <div class="kpi-icon red">
            <span class="material-symbols-outlined">crisis_alert</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Overdue Projects</span>
            <span class="kpi-value text-danger">{{ analytics().project_health?.overdue || 0 }}</span>
            <span class="kpi-subtext" *ngIf="analytics().project_health?.overdue === 0">Zero overdue projects</span>
            <span class="kpi-subtext text-danger" *ngIf="analytics().project_health?.overdue > 0">Requires attention</span>
          </div>
        </div>
      </div>

      <!-- Executive Project Analytics 2-Column Grid -->
      <div class="project-analytics-grid">
        <!-- Interactive Monthly Budget & Revenue Trends Chart -->
        <div class="financial-chart-container glass-card" *ngIf="analytics()?.financial_chart">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon blue-icon">monitoring</span>
              <div>
                <h3>Project Budget & Revenue (Monthly Trends)</h3>
                <span class="sub-caption">Interactive enterprise budget allocation vs completed revenue</span>
              </div>
            </div>

            <!-- View Switcher & Filters -->
            <div class="interactive-controls">
              <!-- Mode Toggle -->
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

            <!-- Chart Legend -->
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
                  <span class="badge badge-role">{{ selectedMonth().month }} Enterprise Portfolio</span>
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

        <!-- Project Phase Distribution & Priority Breakdown -->
        <div class="phase-distribution-card glass-card" *ngIf="analytics()?.phase_distribution">
          <div class="section-title-wrap">
            <div class="title-left">
              <span class="material-symbols-outlined icon purple-icon">donut_large</span>
              <div>
                <h3>Project Phase Distribution</h3>
                <span class="sub-caption">Current stage across all enterprise projects</span>
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
                <span class="sub-caption">Enterprise workforce project completion efficiency</span>
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
              <span class="v-label">Total Enterprise Projects</span>
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

      <!-- Role Distribution Breakdown -->
      <div class="user-role-breakdown glass-card">
        <h3>Role Distribution Across Enterprise</h3>
        <div class="role-bars">
          <div class="role-stat">
            <span class="role-title">Company Admins</span>
            <span class="role-count">{{ stats()?.total_admins || 0 }}</span>
          </div>
          <div class="role-stat">
            <span class="role-title">Project Leads</span>
            <span class="role-count">{{ stats()?.total_team_leads || 0 }}</span>
          </div>
          <div class="role-stat">
            <span class="role-title">Employees</span>
            <span class="role-count">{{ stats()?.total_employees || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Active Projects Status & Assignment Table -->
      <div class="projects-section glass-card" *ngIf="stats()?.active_projects?.length > 0">
        <div class="section-header" style="margin-bottom: 16px;">
          <h3 style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem;">
            <span class="material-symbols-outlined icon">monitoring</span>
            <span>Phase-wise Project Completion Integration</span>
          </h3>
          <button (click)="openCreateEmployeeModal()" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 18px;">person_add</span>
            New Employee
          </button>
        </div>
        <div class="table-responsive">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Project Code</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Project Name</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Assigned Employee</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Status</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Phase-wise Project Completion Integration</th>
                <th style="padding: 12px 16px; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Report</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of stats()?.active_projects">
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <span class="badge" style="background: rgba(0,0,0,0.06); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">{{ p.code }}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-weight: 500;">{{ p.name }}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <div class="custom-select-wrapper" style="position: relative;">
                    <div class="select-trigger" (click)="toggleDropdown(p.id)" style="background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                      <span>{{ getAssignedMemberNames(p) }}</span>
                      <span class="material-symbols-outlined" style="font-size: 16px;">expand_more</span>
                    </div>
                    <div class="dropdown-menu" *ngIf="openDropdowns[p.id]" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 50; margin-top: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                      <label *ngFor="let u of users()" style="display: flex; align-items: center; padding: 8px 12px; cursor: pointer;" class="dropdown-item">
                        <input type="checkbox" [checked]="getAssignedMemberIds(p).includes(u.id)" (change)="toggleMember(p, u.id)" style="margin-right: 8px; accent-color: var(--accent-primary);">
                        <span style="font-size: 0.85rem; color: var(--text-primary);">{{ u.first_name }} {{ u.last_name }}</span>
                      </label>
                    </div>
                  </div>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color);">
                  <span class="badge" [class]="'badge-' + (p.status || 'ACTIVE').toLowerCase()">{{ p.status }}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); min-width: 150px;">
                  <div class="progress-section">
                    <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                      <span>Implementation %</span>
                      <span class="font-bold" style="color: var(--accent-primary);">{{ p.progress_percentage || 0 }}%</span>
                    </div>
                    <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden;">
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

      <!-- Create Employee Modal -->
      <div class="modal-overlay" *ngIf="showCreateEmployeeModal">
        <div class="modal-content glass-card" style="width: 400px;">
          <h3 style="margin-bottom: 20px;">Create New Employee</h3>
          
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div>
              <label style="display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted);">First Name</label>
              <input type="text" [(ngModel)]="newEmployee.first_name" (keyup.enter)="createEmployee()" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary);">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted);">Last Name</label>
              <input type="text" [(ngModel)]="newEmployee.last_name" (keyup.enter)="createEmployee()" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary);">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted);">Email</label>
              <input type="email" [(ngModel)]="newEmployee.email" (keyup.enter)="createEmployee()" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary);">
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; margin-bottom: 4px; color: var(--text-muted);">Assign to Project (Optional)</label>
              <select [(ngModel)]="newEmployee.project_id" style="width: 100%; padding: 8px; border-radius: 6px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary);">
                <option [ngValue]="null">-- None --</option>
                <option *ngFor="let p of stats()?.active_projects" [value]="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn btn-secondary" (click)="showCreateEmployeeModal = false">Cancel</button>
            <button class="btn btn-primary" (click)="createEmployee()" [disabled]="!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email">Create</button>
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

      h2 { font-size: 1.6rem; color: var(--text-primary); }
      p { color: var(--text-muted); font-size: 0.9rem; }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;

      .metric-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 20px;
        min-width: 0;
        box-sizing: border-box;

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
          .value { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

    .project-analytics-grid {
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

    .user-role-breakdown {
      h3 { font-size: 1.1rem; margin-bottom: 16px; }

      .role-bars {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        min-width: 0;
        box-sizing: border-box;

        .role-stat {
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-width: 0;

          .role-title { font-weight: 600; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .role-count { font-size: 1.4rem; font-weight: 800; color: var(--accent-primary); margin-left: 8px; }
        }
      }
    }

    .projects-section {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
    }
    
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: var(--bg-card);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .dropdown-item:hover {
      background: rgba(0,0,0,0.04);
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
      .project-analytics-grid {
        grid-template-columns: 1fr;
      }
      .user-role-breakdown .role-bars {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
      .user-role-breakdown .role-bars {
        grid-template-columns: 1fr;
      }
      .projects-section .section-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    @media (max-width: 560px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      .modal-content {
        width: 95vw;
        padding: 16px;
      }
    }
  `]
})
export class CEODashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);
  analytics = signal<any>(null);
  users = signal<any[]>([]);

  // Interactive View States
  chartViewMode = signal<'chart' | 'table'>('chart');
  chartMetricFilter = signal<'ALL' | 'BUDGET' | 'REVENUE'>('ALL');
  selectedMonth = signal<any>(null);

  ngOnInit() {
    this.loadDashboard();
    this.loadAnalytics();
    
    this.api.get('/users').subscribe({
      next: (res: any) => {
        const emps = Array.isArray(res) ? res.filter((u: any) => u.role?.name === 'EMPLOYEE' || u.role_id) : [];
        this.users.set(emps);
      }
    });

    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED' || msg.event === 'PROJECT_DELETED') {
        this.loadDashboard();
        this.loadAnalytics();
      }
    });
  }

  loadDashboard() {
    this.api.get('/dashboards/ceo').subscribe({
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

  getAssignedMemberIds(project: any): string[] {
    if (!project || !project.members) return [];
    return project.members
      .filter((m: any) => m.role_in_project === 'MEMBER')
      .map((m: any) => m.user_id);
  }

  getAssignedMemberNames(project: any): string {
    if (!project || !project.members) return 'Unassigned';
    const members = project.members.filter((m: any) => m.role_in_project === 'MEMBER');
    if (members.length === 0) return 'Unassigned';
    if (members.length === 1) return (members[0].user?.first_name || '') + ' ' + (members[0].user?.last_name || '');
    if (members.length === 2) return (members[0].user?.first_name || '') + ' & ' + (members[1].user?.first_name || '');
    return (members[0].user?.first_name || '') + ' + ' + (members.length - 1) + ' others';
  }

  assignProject(projectId: string, employeeIds: string[]) {
    this.api.patch('/projects/' + projectId + '/assign', { member_ids: employeeIds }).subscribe({
      next: () => {
        this.loadDashboard();
        this.loadAnalytics();
      }
    });
  }

  openDropdowns: { [key: string]: boolean } = {};
  
  toggleDropdown(projectId: string) {
    for (let key in this.openDropdowns) {
      if (key !== projectId) this.openDropdowns[key] = false;
    }
    this.openDropdowns[projectId] = !this.openDropdowns[projectId];
  }

  toggleMember(project: any, userId: string) {
    let currentIds = this.getAssignedMemberIds(project);
    if (currentIds.includes(userId)) {
      currentIds = currentIds.filter((id: string) => id !== userId);
    } else {
      currentIds.push(userId);
    }
    this.assignProject(project.id, currentIds);
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

  showCreateEmployeeModal = false;
  newEmployee = {
    first_name: '',
    last_name: '',
    email: '',
    password: 'Password123!',
    role_id: 'EMPLOYEE',
    project_id: null as string | null
  };

  openCreateEmployeeModal() {
    this.newEmployee = {
      first_name: '',
      last_name: '',
      email: '',
      password: 'Password123!',
      role_id: 'EMPLOYEE',
      project_id: null
    };
    this.showCreateEmployeeModal = true;
  }

  createEmployee() {
    if (!this.newEmployee.first_name || !this.newEmployee.last_name || !this.newEmployee.email) return;
    this.api.post('/users', {
      email: this.newEmployee.email,
      password: this.newEmployee.password,
      first_name: this.newEmployee.first_name,
      last_name: this.newEmployee.last_name,
      role_id: 'EMPLOYEE'
    }).subscribe({
      next: (user: any) => {
        if (this.newEmployee.project_id) {
          this.assignProject(this.newEmployee.project_id, [user.id]);
        } else {
          this.loadDashboard();
          this.loadAnalytics();
        }
        this.showCreateEmployeeModal = false;
        
        // Refresh users list
        this.api.get('/users').subscribe({
          next: (res: any) => {
            const emps = Array.isArray(res) ? res.filter((u: any) => u.role?.name === 'EMPLOYEE' || u.role_id) : [];
            this.users.set(emps);
          }
        });
      },
      error: (err) => alert('Failed to create employee: ' + (err.error?.detail || err.message))
    });
  }
}
