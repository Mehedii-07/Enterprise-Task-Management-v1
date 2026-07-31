import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page">
      <div class="header-banner glass-card">
        <div>
          <h2>My Personal Work Dashboard</h2>
          <p>Real-time Tasks Assigned by CEO/Admin, Work Hours, Productivity & Progress</p>
        </div>
        <span class="badge badge-role">EMPLOYEE WORKSPACE</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass-card">
          <span class="label">TODO</span>
          <span class="value">{{ stats()?.todo_count || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">IN PROGRESS</span>
          <span class="value text-primary">{{ stats()?.in_progress_count || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">REVIEW</span>
          <span class="value text-warning">{{ stats()?.review_count || 0 }}</span>
        </div>

        <div class="metric-card glass-card">
          <span class="label">TESTING</span>
          <span class="value text-info">{{ stats()?.testing_count || 0 }}</span>
        </div>
      </div>

      <!-- My Active Workspace -->
      <div class="workspace-section glass-card">
        <div class="section-header">
          <h3>
            <span class="material-symbols-outlined icon">work</span>
            <span>My Active Tasks & Projects</span>
          </h3>
          <button (click)="loadDashboard()" class="btn btn-secondary btn-sm">
            <span class="material-symbols-outlined">refresh</span>
            <span>Refresh Data</span>
          </button>
        </div>

        <!-- Assigned Projects Sub-section -->
        <div *ngIf="stats()?.assigned_projects?.length > 0" class="subsection">
          <h4 class="subsection-title">Assigned Projects</h4>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Project Code</th>
                  <th>Project Name</th>
                  <th>Phase</th>
                  <th>Project Progress</th>
                  <th>Milestones Checklist</th>
                  <th style="text-align: right;">Report</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of stats()?.assigned_projects">
                  <td class="font-bold text-primary">{{ p.code }}</td>
                  <td>{{ p.name }}</td>
                  <td>
                    <span class="badge" style="display: block; margin-bottom: 6px;" [ngClass]="'badge-' + (p.phase || 'PLANNING').toLowerCase().replace(' ', '-')">{{ p.phase || 'Planning' }}</span>
                    <select
                      [ngModel]="p.phase"
                      (ngModelChange)="updateProjectPhase(p, $event)"
                      class="status-select" style="width: 100%;">
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Testing">Testing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td style="min-width: 150px;">
                    <div class="progress-section">
                      <div class="progress-header" style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                        <span>Completion</span>
                        <span class="font-bold text-primary">{{ p.progress_percentage || 0 }}%</span>
                      </div>
                      <div class="progress-bar-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill" [style.width.%]="p.progress_percentage || 0" style="height: 100%; background: var(--accent-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
                      </div>
                    </div>
                  </td>
                  <td style="min-width: 250px;">
                    <div class="milestones-checklist">
                      <div *ngIf="!p.milestones || p.milestones.length === 0" class="text-muted" style="font-size: 0.8rem; font-style: italic;">No milestones defined.</div>
                      <div *ngFor="let m of p.milestones" class="milestone-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <input type="checkbox" [checked]="m.is_completed" (change)="toggleMilestone(p, m, $event)" style="cursor: pointer;" />
                        <span [class.completed]="m.is_completed" style="font-size: 0.85rem;">{{ m.title }}</span>
                      </div>
                    </div>
                  </td>
                  <td style="text-align: right;">
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

        <!-- Assigned Tasks Sub-section -->
        <div class="subsection" [style.margin-top]="stats()?.assigned_projects?.length > 0 ? '32px' : '0'">
          <h4 class="subsection-title">Active Tasks</h4>
          <div *ngIf="tasks().length === 0" class="empty-state">
            <span class="material-symbols-outlined">task</span>
            <p>No active tasks assigned yet. Projects & tasks created by CEO will appear here automatically.</p>
          </div>

          <div *ngIf="tasks().length > 0" class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Task Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Update Status</th>
                  <th>Log Hours</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let task of tasks()">
                  <td><span class="badge badge-role">{{ getProjectCode(task.project_id) }}</span></td>
                  <td class="font-bold">{{ task.title }}</td>
                  <td>
                    <span class="badge" [ngClass]="'priority-' + (task.priority || 'LOW').toLowerCase()">
                      {{ task.priority }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="'status-' + (task.status || 'TODO').toLowerCase()">
                      {{ task.status }}
                    </span>
                  </td>
                  <td>
                    <select
                      [ngModel]="task.status"
                      (ngModelChange)="updateTaskStatus(task, $event)"
                      class="status-select">
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="REVIEW">REVIEW</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </td>
                  <td>
                    <button (click)="logWorkHours(task)" class="btn btn-secondary btn-sm">
                      <span class="material-symbols-outlined">schedule</span>
                      <span>Log Work</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Team Contribution Section -->
      <div class="team-contribution glass-card" *ngIf="stats()?.team_contribution">
        <h3>Team Contribution & Organization Progress</h3>
        <div class="contrib-grid">
          <div class="contrib-item">
            <span class="c-label">Total Organization Tasks</span>
            <span class="c-val">{{ stats().team_contribution.total_team_tasks }}</span>
          </div>
          <div class="contrib-item">
            <span class="c-label">Organization Completed Tasks</span>
            <span class="c-val">{{ stats().team_contribution.completed_team_tasks }}</span>
          </div>
          <div class="contrib-item">
            <span class="c-label">Overall Organization Progress</span>
            <span class="c-val text-primary">{{ stats().team_contribution.team_progress_percentage }}%</span>
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
        .text-success { color: var(--accent-success); }
        .text-primary { color: var(--accent-primary); }
      }
    }
    .workspace-section {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        h3 { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
      }
      .subsection {
        .subsection-title {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--text-muted);
        .material-symbols-outlined { font-size: 48px; opacity: 0.5; margin-bottom: 12px; }
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); }
      }
      .status-select {
        background: var(--bg-main);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .btn-sm { padding: 4px 10px; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; }
      .text-primary { color: var(--accent-primary); }
    }
    .team-contribution {
      h3 { font-size: 1.1rem; margin-bottom: 16px; }
      .contrib-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        .contrib-item {
          padding: 16px;
          border-radius: 12px;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          .c-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
          .c-val { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-top: 4px; }
          .text-primary { color: var(--accent-primary); }
        }
      }
    }
    .completed { text-decoration: line-through; color: var(--text-muted); opacity: 0.7; }
  `]
})
export class EmployeeDashboardComponent implements OnInit {
  api = inject(ApiService);
  ws = inject(WebsocketService);
  stats = signal<any>(null);
  tasks = signal<any[]>([]);

  ngOnInit() {
    this.loadDashboard();
    
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (msg.event === 'TASK_CREATED' || msg.event === 'TASK_UPDATED' || msg.event === 'PROJECT_UPDATED' || msg.event === 'PROJECT_ASSIGNED' || msg.event === 'MILESTONE_TOGGLED' || msg.event === 'PROJECT_DELETED') {
        this.loadDashboard();
      }
    });
  }

  loadDashboard() {
    this.api.get<any>('/dashboards/employee').subscribe({
      next: res => {
        this.stats.set(res);
        if (res && res.recent_tasks) {
          this.tasks.set(res.recent_tasks);
        }
      }
    });
  }

  getProjectCode(projectId: string): string {
    if (!this.stats() || !this.stats().assigned_projects) return 'PRJ';
    const p = this.stats().assigned_projects.find((proj: any) => proj.id === projectId);
    return p ? p.code : 'PRJ';
  }

  updateTaskStatus(task: any, newStatus: string) {
    this.api.put('/tasks/' + task.id, { status: newStatus }).subscribe({
      next: () => {
        task.status = newStatus;
        this.loadDashboard();
      }
    });
  }

  updateProjectPhase(project: any, newPhase: string) {
    this.api.put('/projects/' + project.id, { phase: newPhase }).subscribe({
      next: () => {
        project.phase = newPhase;
        this.loadDashboard();
      }
    });
  }

  toggleMilestone(project: any, milestone: any, event: any) {
    const isCompleted = event.target.checked;
    this.api.patch('/projects/' + project.id + '/milestones/' + milestone.id, {
      is_completed: isCompleted,
      project_phase: project.phase
    }).subscribe({
      next: () => {
        this.loadDashboard();
      }
    });
  }

  logWorkHours(task: any) {
    const hours = prompt('Enter logged hours for task "' + task.title + '":', '2.5');
    if (hours && !isNaN(Number(hours))) {
      this.api.post('/tasks/work-logs', {
        task_id: task.id,
        hours_logged: Number(hours),
        description: 'Worked on task ' + task.title
      }).subscribe({
        next: () => this.loadDashboard()
      });
    }
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
        alert('Failed to download project report. You might not have permission.');
        this.isDownloading[projectId] = false;
      }
    });
  }

  addSubtask(taskId: string, inputElement: HTMLInputElement) {
    const title = inputElement.value.trim();
    if (!title) return;
    this.api.post(`/tasks/${taskId}/subtasks`, { title: title, is_completed: false }).subscribe({
      next: () => {
        inputElement.value = '';
        this.loadDashboard();
      }
    });
  }

  toggleSubtask(taskId: string, subtask: any, event: any) {
    const isCompleted = event.target.checked;
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { is_completed: isCompleted }).subscribe({
      next: () => this.loadDashboard()
    });
  }

  updateSubtaskFeedback(taskId: string, subtask: any, event: any) {
    const feedback = event.target.value.trim();
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { feedback: feedback }).subscribe({
      next: () => this.loadDashboard()
    });
  }
}
