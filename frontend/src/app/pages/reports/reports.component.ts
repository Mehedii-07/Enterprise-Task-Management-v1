import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <div class="page-header glass-card">
        <div>
          <h2>Project PDF Reports</h2>
          <p>Generate and download formal branded PDF performance reports for your projects.</p>
        </div>
      </div>

      <!-- Quick Project PDF Export Card -->
      <div class="glass-card download-card">
        <div class="card-header">
          <div class="icon-wrapper">
            <span class="material-symbols-outlined">picture_as_pdf</span>
          </div>
          <div>
            <h3>Download Project PDF Report</h3>
            <p>Exports branded PDF report including project executive summary, assigned lead, team members, milestone checklist, and task completion metrics.</p>
          </div>
        </div>

        <div class="export-controls">
          <div class="select-wrapper">
            <select [(ngModel)]="selectedProjectId" class="project-select">
              <option value="">-- Select a Project to Export --</option>
              <option *ngFor="let p of projects()" [value]="p.id">{{ p.name }} ({{ p.code }})</option>
            </select>
          </div>

          <button 
            class="btn btn-primary btn-download" 
            (click)="downloadSelectedProjectPdf()" 
            [disabled]="!selectedProjectId || isDownloading[selectedProjectId]">
            <span class="material-symbols-outlined">download</span>
            <span>{{ isDownloading[selectedProjectId] ? 'Generating PDF...' : 'Download PDF Report' }}</span>
          </button>
        </div>
      </div>

      <!-- All Projects PDF Table Card -->
      <div class="glass-card table-card">
        <div class="table-card-header">
          <h3>Active Projects & PDF Export</h3>
          <span class="badge badge-count">{{ projects().length }} Projects</span>
        </div>

        <div *ngIf="loading" class="loading-state">
          <span class="material-symbols-outlined spin">sync</span>
          <p>Loading projects...</p>
        </div>

        <div *ngIf="!loading && projects().length === 0" class="empty-state">
          <span class="material-symbols-outlined">folder_off</span>
          <p>No projects available for report export.</p>
        </div>

        <div class="table-responsive" *ngIf="!loading && projects().length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project Code</th>
                <th>Project Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of projects()">
                <td>
                  <span class="badge badge-code">{{ p.code }}</span>
                </td>
                <td class="font-bold">{{ p.name }}</td>
                <td>
                  <span class="badge status-badge" [ngClass]="'status-' + (p.status || 'active').toLowerCase()">
                    {{ p.status }}
                  </span>
                </td>
                <td>
                  <div class="progress-wrap">
                    <span class="progress-pct">{{ p.progress_percentage || 0 }}%</span>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="p.progress_percentage || 0"></div>
                    </div>
                  </div>
                </td>
                <td style="text-align: right;">
                  <button 
                    class="btn btn-secondary btn-sm" 
                    (click)="downloadProjectPdf(p.id, p.name)" 
                    [disabled]="isDownloading[p.id]">
                    <span class="material-symbols-outlined">download</span>
                    <span>{{ isDownloading[p.id] ? 'Wait...' : 'Download PDF' }}</span>
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
    .reports-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 24px 28px;

      h2 {
        font-size: 1.5rem;
        margin-bottom: 4px;
      }
      p {
        color: var(--text-muted);
        font-size: 0.9rem;
      }
    }

    .download-card {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 28px;

      .card-header {
        display: flex;
        align-items: center;
        gap: 16px;

        .icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-symbols-outlined {
            font-size: 30px;
          }
        }

        h3 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        p {
          color: var(--text-muted);
          font-size: 0.85rem;
          line-height: 1.4;
        }
      }

      .export-controls {
        display: flex;
        gap: 14px;
        align-items: center;
        flex-wrap: wrap;

        .select-wrapper {
          flex: 1;
          min-width: 260px;
        }

        .project-select {
          width: 100%;
          padding: 11px 16px;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;

          &:focus {
            border-color: var(--accent-primary);
          }
        }

        .btn-download {
          padding: 11px 22px;
          white-space: nowrap;
        }
      }
    }

    .table-card {
      padding: 24px 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;

      .table-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;

        h3 {
          font-size: 1.15rem;
        }

        .badge-count {
          background: var(--bg-card-hover);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
      }
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;

      .material-symbols-outlined {
        font-size: 40px;
        opacity: 0.5;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 1s linear infinite;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }

      th {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--text-muted);
        letter-spacing: 0.5px;
      }

      td.font-bold {
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .badge-code {
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;

      &.status-active, &.status-in_progress {
        background: rgba(14, 165, 233, 0.15);
        color: #0EA5E9;
      }
      &.status-completed {
        background: rgba(16, 185, 129, 0.15);
        color: #10B981;
      }
      &.status-planning, &.status-on_hold {
        background: rgba(245, 158, 11, 0.15);
        color: #F59E0B;
      }
    }

    .progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;

      .progress-pct {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--accent-primary);
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 4px;
          transition: width 0.3s ease;
        }
      }
    }

    .btn-sm {
      padding: 6px 14px;
      font-size: 0.8rem;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .download-card .card-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .download-card .export-controls {
        flex-direction: column;
        align-items: stretch;
      }
      .download-card .btn-download {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  projects = signal<Project[]>([]);
  selectedProjectId: string = '';
  isDownloading: { [key: string]: boolean } = {};
  loading = true;

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loading = true;
    this.api.get<Project[]>('/projects').subscribe({
      next: (data) => {
        this.projects.set(data || []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.loading = false;
      }
    });
  }

  downloadSelectedProjectPdf() {
    if (!this.selectedProjectId) return;
    const project = this.projects().find(p => p.id === this.selectedProjectId);
    const projectName = project ? project.name : 'Project';
    this.downloadProjectPdf(this.selectedProjectId, projectName);
  }

  downloadProjectPdf(projectId: string, projectName: string) {
    this.isDownloading[projectId] = true;
    this.api.downloadBlob(`/projects/${projectId}/export-pdf`).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedName = projectName.replace(/\s+/g, '_');
        a.download = `Project_Report_${sanitizedName}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isDownloading[projectId] = false;
      },
      error: (err) => {
        console.error('Failed to download PDF', err);
        alert('Failed to download project PDF report.');
        this.isDownloading[projectId] = false;
      }
    });
  }
}
