import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reports-page">
      <div class="page-header glass-card">
        <div>
          <h2>Enterprise Reports & Data Exporters</h2>
          <p>Generate & Export PDF, Excel, and CSV Compliance & Performance Reports</p>
        </div>
      </div>

      <div class="reports-grid">
        <div class="report-card glass-card">
          <div class="icon-wrapper green">
            <span class="material-symbols-outlined">table_view</span>
          </div>
          <h3>Tasks Export (Excel .xlsx)</h3>
          <p>Export all project tasks, priorities, estimated vs actual hours, and assignee details into Excel spreadsheet.</p>
          <button (click)="downloadReport('http://localhost:8000/api/v1/reports/tasks/excel', 'tasks_export.xlsx')" class="btn btn-primary" [disabled]="isDownloading">
            <span class="material-symbols-outlined">download</span>
            <span>Download Excel</span>
          </button>
        </div>

        <div class="report-card glass-card">
          <div class="icon-wrapper blue">
            <span class="material-symbols-outlined">csv</span>
          </div>
          <h3>Tasks Export (CSV)</h3>
          <p>Export raw task records in standard CSV format for BI tools, Tableau, or Power BI processing.</p>
          <button (click)="downloadReport('http://localhost:8000/api/v1/reports/tasks/csv', 'tasks_export.csv')" class="btn btn-secondary" [disabled]="isDownloading">
            <span class="material-symbols-outlined">download</span>
            <span>Download CSV</span>
          </button>
        </div>

        <div class="report-card glass-card">
          <div class="icon-wrapper purple">
            <span class="material-symbols-outlined">history_toggle_off</span>
          </div>
          <h3>Work Logs Export (CSV)</h3>
          <p>Export employee time entries, logged working hours, task descriptions, and date timestamps.</p>
          <button (click)="downloadReport('http://localhost:8000/api/v1/reports/work-logs/csv', 'work_logs.csv')" class="btn btn-secondary" [disabled]="isDownloading">
            <span class="material-symbols-outlined">download</span>
            <span>Export Work Logs</span>
          </button>
        </div>

        <div class="report-card glass-card">
          <div class="icon-wrapper orange">
            <span class="material-symbols-outlined">analytics</span>
          </div>
          <h3>Project Progress (Excel .xlsx)</h3>
          <p>Download detailed project progress reports including budget, task completion, and manager details.</p>
          <button (click)="downloadReport('http://localhost:8000/api/v1/reports/projects/progress/excel', 'project_progress.xlsx')" class="btn btn-primary" [disabled]="isDownloading">
            <span class="material-symbols-outlined">download</span>
            <span>Download Progress Excel</span>
          </button>
        </div>

        <div class="report-card glass-card">
          <div class="icon-wrapper red">
            <span class="material-symbols-outlined">insights</span>
          </div>
          <h3>Project Progress (CSV)</h3>
          <p>Download project progress summary in CSV format for quick data imports.</p>
          <button (click)="downloadReport('http://localhost:8000/api/v1/reports/projects/progress/csv', 'project_progress.csv')" class="btn btn-secondary" [disabled]="isDownloading">
            <span class="material-symbols-outlined">download</span>
            <span>Download Progress CSV</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page { display: flex; flex-direction: column; gap: 24px; }
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;

      .report-card {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;

          &.green { background: rgba(16, 185, 129, 0.2); color: #34D399; }
          &.blue { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
          &.purple { background: rgba(139, 92, 246, 0.2); color: #A78BFA; }
          &.orange { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }
          &.red { background: rgba(239, 68, 68, 0.2); color: #F87171; }
        }

        h3 { font-size: 1.2rem; }
        p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; flex: 1; }
      }
    }
  `]
})
export class ReportsComponent {
  http = inject(HttpClient);
  isDownloading = false;

  downloadReport(url: string, filename: string) {
    this.isDownloading = true;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Download failed', err);
        alert('Failed to download report. Ensure you have the correct permissions.');
        this.isDownloading = false;
      }
    });
  }
}
