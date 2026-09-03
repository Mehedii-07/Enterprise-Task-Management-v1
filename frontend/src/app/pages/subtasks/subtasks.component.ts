import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebsocketService, WsMessage } from '../../core/services/websocket.service';
import { Task, Subtask } from '../../core/models/task.model';
import { Project } from '../../core/models/project.model';

interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
  expanded: boolean;
}

@Component({
  selector: 'app-subtasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="subtasks-page">
      <!-- Page Header -->
      <div class="page-header glass-card">
        <div>
          <h2>
            <span class="material-symbols-outlined">checklist</span>
            Task Breakdown & Subtasks
          </h2>
          <p *ngIf="isEmployee()">Mark subtasks as done and add your progress notes. Your updates reflect in real-time for the whole team.</p>
          <p *ngIf="!isEmployee()">Create and manage subtask breakdowns. Employees track their progress here. Updates sync in real-time & appear in PDF reports.</p>
        </div>
        <div class="header-stats">
          <div class="stat-chip">
            <span class="material-symbols-outlined">task_alt</span>
            <span>{{ totalSubtasks }} Subtasks</span>
          </div>
          <div class="stat-chip done">
            <span class="material-symbols-outlined">check_circle</span>
            <span>{{ completedSubtasks }} Done</span>
          </div>
          <div class="stat-chip pending">
            <span class="material-symbols-outlined">pending</span>
            <span>{{ totalSubtasks - completedSubtasks }} Pending</span>
          </div>
          <div class="stat-chip overall">
            <span class="material-symbols-outlined">donut_large</span>
            <span>{{ overallProgress }}% Overall</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state glass-card">
        <span class="material-symbols-outlined spin">sync</span>
        <p>Loading project breakdown...</p>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && projectGroups().length === 0" class="empty-state glass-card">
        <span class="material-symbols-outlined">assignment</span>
        <h3>No Projects Found</h3>
        <p>Projects and task breakdowns will appear here once created and assigned.</p>
      </div>

      <!-- Project Groups -->
      <div class="project-group glass-card" *ngFor="let group of projectGroups()">
        <!-- Project Header (clickable to expand/collapse) -->
        <div class="project-header" (click)="group.expanded = !group.expanded">
          <div class="project-info">
            <span class="project-code">{{ group.project.code }}</span>
            <div>
              <h3>{{ group.project.name }}</h3>
              <p class="project-meta">
                {{ group.tasks.length }} Tasks &bull;
                {{ getSubtaskCount(group) }} Subtasks &bull;
                {{ getDoneSubtasksForGroup(group) }} Completed
              </p>
            </div>
          </div>
          <div class="project-header-right">
            <!-- Dynamic Progress Ring -->
            <div class="progress-ring-wrap" [title]="getProjectProgress(group) + '% complete'">
              <svg class="progress-svg" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" class="ring-bg"/>
                <circle cx="20" cy="20" r="16" class="ring-fill"
                  [style.strokeDasharray]="getProgressDash(group)"
                  [style.stroke]="getProgressColor(group)"/>
              </svg>
              <span class="ring-label" [style.color]="getProgressColor(group)">{{ getProjectProgress(group) }}%</span>
            </div>
            <span class="expand-icon material-symbols-outlined" [class.rotated]="group.expanded">expand_more</span>
          </div>
        </div>

        <!-- Full Progress Bar -->
        <div class="project-progress-bar">
          <div class="progress-fill"
            [style.width.%]="getProjectProgress(group)"
            [style.background]="getProgressColor(group)">
          </div>
        </div>

        <!-- Progress Label -->
        <div class="progress-label-row" *ngIf="getSubtaskCount(group) > 0">
          <span>{{ getDoneSubtasksForGroup(group) }} / {{ getSubtaskCount(group) }} subtasks complete</span>
          <span class="pct-label" [style.color]="getProgressColor(group)">{{ getProjectProgress(group) }}%</span>
        </div>

        <!-- Tasks & Subtasks (expanded) -->
        <div class="tasks-container" *ngIf="group.expanded">
          <div *ngIf="group.tasks.length === 0" class="no-tasks">
            <span class="material-symbols-outlined">inbox</span>
            <p>No tasks in this project yet. Create one to start adding subtasks.</p>
          </div>

          <!-- Quick Add Task for CEO/Admin/Team Lead -->
          <div class="quick-add-task" *ngIf="canCreateSubtask()">
            <input 
              type="text" 
              #newTaskInput 
              placeholder="+ Quick add new task to this project (Press Enter)"
              (keyup.enter)="createTask(group.project.id, newTaskInput)"
            >
            <button (click)="createTask(group.project.id, newTaskInput)">Add Task</button>
          </div>

          <div class="task-block" *ngFor="let task of group.tasks">
            <div class="task-header">
              <div class="task-info">
                <span class="material-symbols-outlined task-icon">task</span>
                <div>
                  <h4>{{ task.title }}</h4>
                  <span class="task-meta">
                    <span class="badge" [ngClass]="'priority-' + task.priority.toLowerCase()">{{ task.priority }}</span>
                    <span class="badge" [ngClass]="'status-' + task.status.toLowerCase()">{{ task.status }}</span>
                    <span *ngIf="task.assignee" class="assignee-chip">
                      <img *ngIf="task.assignee.avatar_url" [src]="task.assignee.avatar_url" alt="Avatar" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;">
                      <span *ngIf="!task.assignee.avatar_url" class="material-symbols-outlined">person</span>
                      {{ task.assignee.first_name }} {{ task.assignee.last_name }}
                    </span>
                  </span>
                </div>
              </div>
              <!-- Per-task progress -->
              <div class="task-subtask-progress">
                <button 
                  *ngIf="task.status !== 'COMPLETED'" 
                  class="btn-complete-task" 
                  (click)="completeTask(task)"
                  title="Mark entire task as COMPLETED"
                >
                  <span class="material-symbols-outlined">done_all</span>
                  Complete Task
                </button>
                <div class="st-progress-info">
                  <span class="st-count" [style.color]="getTaskProgressColor(task)">
                    {{ getDoneSubtasks(task) }}/{{ task.subtasks?.length || 0 }}
                  </span>
                  <div class="mini-progress">
                    <div class="mini-fill"
                      [style.width.%]="getTaskSubtaskPct(task)"
                      [style.background]="getTaskProgressColor(task)">
                    </div>
                  </div>
                  <span class="mini-pct" [style.color]="getTaskProgressColor(task)">{{ getTaskSubtaskPct(task) }}%</span>
                </div>
              </div>
            </div>

            <!-- Subtasks -->
            <div class="subtask-list">
              <div class="subtask-item" *ngFor="let st of task.subtasks" [class.completed]="st.is_completed">
                <div class="subtask-left">
                  <!-- Checkbox: Employees can mark done, Leads/CEO can also toggle -->
                  <input
                    type="checkbox"
                    [checked]="st.is_completed"
                    (change)="toggleSubtask(task.id, st, $event)"
                    class="subtask-check"
                  >
                  <div class="subtask-content">
                    <span class="subtask-title" [class.done-title]="st.is_completed">{{ st.title }}</span>

                    <!-- Feedback: Employees write, Leads/CEO read -->
                    <textarea
                      *ngIf="isEmployee()"
                      placeholder="Write your progress notes / feedback..."
                      class="feedback-input"
                      [ngModel]="st.feedback"
                      (blur)="saveFeedback(task.id, st, $event)"
                    ></textarea>

                    <div *ngIf="!isEmployee() && st.feedback" class="feedback-display">
                      <span class="material-symbols-outlined">comment</span>
                      <span>{{ st.feedback }}</span>
                    </div>
                    <div *ngIf="!isEmployee() && !st.feedback && st.is_completed" class="feedback-display muted">
                      <span class="material-symbols-outlined">check</span>
                      <span>Marked done — no feedback provided</span>
                    </div>
                  </div>
                </div>
                <span class="st-status-badge" [class.done]="st.is_completed">
                  {{ st.is_completed ? '✓ Done' : 'Pending' }}
                </span>
              </div>

              <div *ngIf="!task.subtasks || task.subtasks.length === 0" class="no-subtasks">
                <span class="material-symbols-outlined">segment</span>
                <span>No breakdown steps yet.</span>
                <span *ngIf="canCreateSubtask()"> Add one below.</span>
              </div>

              <!-- Add Subtask Input — CEO / Admin / Team Lead only -->
              <div class="add-subtask-row" *ngIf="canCreateSubtask()">
                <span class="material-symbols-outlined add-icon">add_circle</span>
                <input
                  type="text"
                  #stInput
                  placeholder="Add a new breakdown step and press Enter..."
                  class="add-st-input"
                  (keyup.enter)="addSubtask(task.id, stInput)"
                >
                <button class="btn-add-st" (click)="addSubtask(task.id, stInput)">Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .subtasks-page { display: flex; flex-direction: column; gap: 20px; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;
      h2 { display: flex; align-items: center; gap: 10px; font-size: 1.4rem; margin-bottom: 6px;
           .material-symbols-outlined { color: var(--accent-primary); font-size: 28px; } }
      p { color: var(--text-muted); font-size: 0.875rem; max-width: 480px; }
    }

    .header-stats { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .stat-chip {
      display: flex; align-items: center; gap: 6px; padding: 7px 14px;
      border-radius: 20px; font-size: 0.8rem; font-weight: 600;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border-color);
      .material-symbols-outlined { font-size: 16px; }
      &.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10B981; }
      &.pending { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #F59E0B; }
      &.overall { background: rgba(14,165,233,0.1); border-color: rgba(14,165,233,0.3); color: #0EA5E9; }
    }

    .loading-state, .empty-state {
      text-align: center; padding: 60px 24px; color: var(--text-muted);
      .material-symbols-outlined { font-size: 56px; opacity: 0.4; display: block; margin-bottom: 12px; }
      h3 { font-size: 1.1rem; margin-bottom: 8px; }
      p { font-size: 0.875rem; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1.2s linear infinite; display: block; }

    .project-group { border-radius: 16px; overflow: hidden; transition: box-shadow 0.2s ease;
      &:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.2); } }

    .project-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 20px; cursor: pointer; transition: background 0.2s ease;
      &:hover { background: rgba(255,255,255,0.03); }
    }

    .project-info { display: flex; align-items: center; gap: 14px;
      .project-code { padding: 4px 10px; background: var(--accent-primary); color: #fff; border-radius: 8px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
      h3 { font-size: 1rem; margin-bottom: 2px; }
      .project-meta { font-size: 0.75rem; color: var(--text-muted); }
    }

    .quick-add-task {
      display: flex; gap: 8px; margin-bottom: 16px;
      input {
        flex: 1; padding: 10px 14px; font-size: 0.85rem;
        background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
        border-radius: 8px; color: var(--text-primary);
        &:focus { outline: none; border-color: var(--accent-primary); }
      }
      button {
        padding: 0 16px; background: var(--accent-primary); color: #fff;
        border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
        &:hover { opacity: 0.9; }
      }
    }

    .project-header-right { display: flex; align-items: center; gap: 12px; }

    /* SVG Progress Ring */
    .progress-ring-wrap { position: relative; width: 52px; height: 52px; }
    .progress-svg { width: 52px; height: 52px; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 4; }
    .ring-fill { fill: none; stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 0.5s ease; }
    .ring-label {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 0.65rem; font-weight: 800; white-space: nowrap;
    }

    .expand-icon { transition: transform 0.25s ease; color: var(--text-muted); }
    .expand-icon.rotated { transform: rotate(180deg); }

    .project-progress-bar { height: 4px; background: rgba(255,255,255,0.05);
      .progress-fill { height: 100%; border-radius: 0; transition: width 0.5s ease; } }

    .progress-label-row {
      display: flex; justify-content: space-between; padding: 6px 20px;
      font-size: 0.75rem; color: var(--text-muted);
      .pct-label { font-weight: 700; }
    }

    .tasks-container { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }

    .no-tasks { display: flex; align-items: center; justify-content: center; gap: 8px;
      color: var(--text-muted); font-size: 0.875rem; font-style: italic; padding: 20px;
      .material-symbols-outlined { font-size: 18px; } }

    .task-block { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.02); }

    .task-header { display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; background: rgba(255,255,255,0.03); flex-wrap: wrap; gap: 12px; }

    .task-info { display: flex; align-items: flex-start; gap: 10px;
      .task-icon { color: var(--accent-primary); font-size: 20px; margin-top: 2px; }
      h4 { font-size: 0.95rem; margin-bottom: 6px; }
    }
    .task-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }

    .badge { padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; background: rgba(255,255,255,0.08); }
    .priority-critical { background: rgba(239,68,68,0.15); color: #EF4444; }
    .priority-high { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .priority-medium { background: rgba(14,165,233,0.15); color: #0EA5E9; }
    .priority-low { background: rgba(16,185,129,0.15); color: #10B981; }
    .status-completed { background: rgba(16,185,129,0.15); color: #10B981; }
    .status-in_progress { background: rgba(14,165,233,0.15); color: #0EA5E9; }
    .status-todo { background: rgba(107,114,128,0.15); color: #9CA3AF; }
    .status-review, .status-testing { background: rgba(245,158,11,0.15); color: #F59E0B; }

    .assignee-chip { display: flex; align-items: center; gap: 3px; font-size: 0.72rem; color: var(--accent-primary);
      .material-symbols-outlined { font-size: 13px; } }

    .task-subtask-progress { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    
    .btn-complete-task {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px;
      background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3);
      border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600;
      transition: all 0.2s ease;
      &:hover { background: rgba(16, 185, 129, 0.25); }
      .material-symbols-outlined { font-size: 16px; }
    }
    
    .st-progress-info { display: flex; align-items: center; gap: 6px; }
    
    .st-count { font-size: 0.78rem; font-weight: 700; }
    .mini-pct { font-size: 0.7rem; font-weight: 600; }
    .mini-progress { width: 110px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;
      .mini-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; } }

    .subtask-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }

    .subtask-item {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
      padding: 10px 12px; border-radius: 8px;
      background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);
      transition: background 0.2s ease;
      &.completed { background: rgba(16,185,129,0.04); border-color: rgba(16,185,129,0.2); }
      &:hover { background: rgba(255,255,255,0.04); }
    }

    .subtask-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; }
    .subtask-check { width: 17px; height: 17px; margin-top: 2px; cursor: pointer; accent-color: #10B981; flex-shrink: 0; }
    .subtask-content { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .subtask-title { font-size: 0.875rem; font-weight: 500; }
    .done-title { text-decoration: line-through; color: var(--text-muted); }

    .feedback-input {
      width: 100%; padding: 6px 10px; font-size: 0.78rem;
      background: var(--bg-main); border: 1px solid var(--border-color);
      border-radius: 6px; color: var(--text-primary); resize: vertical; min-height: 36px;
      font-family: var(--font-primary);
      &:focus { outline: none; border-color: var(--accent-primary); }
      &::placeholder { color: var(--text-muted); }
    }

    .feedback-display {
      display: flex; align-items: flex-start; gap: 6px; font-size: 0.78rem; color: var(--text-muted);
      font-style: italic; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 6px;
      .material-symbols-outlined { font-size: 14px; margin-top: 1px; flex-shrink: 0; }
      &.muted { opacity: 0.5; }
    }

    .st-status-badge {
      padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; white-space: nowrap;
      background: rgba(245,158,11,0.15); color: #F59E0B; flex-shrink: 0;
      &.done { background: rgba(16,185,129,0.15); color: #10B981; }
    }

    .no-subtasks { display: flex; align-items: center; gap: 8px; color: var(--text-muted);
      font-size: 0.8rem; font-style: italic; padding: 8px 0;
      .material-symbols-outlined { font-size: 16px; } }

    .add-subtask-row {
      display: flex; align-items: center; gap: 8px; margin-top: 10px;
      padding-top: 12px; border-top: 1px dashed var(--border-color);
    }
    .add-icon { color: var(--accent-primary); font-size: 20px; flex-shrink: 0; }
    .add-st-input {
      flex: 1; padding: 8px 12px; font-size: 0.85rem;
      background: var(--bg-main); border: 1px solid var(--border-color);
      border-radius: 8px; color: var(--text-primary); font-family: var(--font-primary);
      &:focus { outline: none; border-color: var(--accent-primary); }
      &::placeholder { color: var(--text-muted); }
    }
    .btn-add-st {
      padding: 8px 16px; background: var(--accent-primary); color: #fff;
      border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.85; }
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; }
      .task-header { flex-direction: column; align-items: flex-start; }
      .task-subtask-progress { align-items: flex-start; }
      .project-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    }
  `]
})
export class SubtasksComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  ws = inject(WebsocketService);

  projectGroups = signal<ProjectWithTasks[]>([]);
  loading = true;

  // Circumference of circle with r=16: 2*PI*16 ≈ 100.53
  private readonly CIRC = 100.53;

  get totalSubtasks(): number {
    return this.projectGroups().reduce((acc, g) =>
      acc + g.tasks.reduce((a, t) => a + (t.subtasks?.length || 0), 0), 0);
  }

  get completedSubtasks(): number {
    return this.projectGroups().reduce((acc, g) =>
      acc + g.tasks.reduce((a, t) => a + (t.subtasks?.filter(s => s.is_completed).length || 0), 0), 0);
  }

  get overallProgress(): number {
    if (this.totalSubtasks === 0) return 0;
    return Math.round((this.completedSubtasks / this.totalSubtasks) * 100);
  }

  ngOnInit() {
    this.loadData();
    this.ws.messages$.subscribe((msg: WsMessage) => {
      if (['TASK_CREATED', 'TASK_UPDATED', 'SUBTASK_UPDATED', 'PROJECT_DELETED'].includes(msg.event)) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.loading = true;
    this.api.get<Project[]>('/projects').subscribe({
      next: projects => {
        const allTasksLoaded: ProjectWithTasks[] = [];
        let pending = projects.length;

        if (pending === 0) { this.projectGroups.set([]); this.loading = false; return; }

        projects.forEach(project => {
          this.api.get<Task[]>(`/tasks?project_id=${project.id}`).subscribe({
            next: tasks => {
              // Preserve expanded state if already loaded
              const existing = this.projectGroups().find(g => g.project.id === project.id);
              allTasksLoaded.push({ project, tasks, expanded: existing ? existing.expanded : true });
              pending--;
              if (pending === 0) {
                this.projectGroups.set(allTasksLoaded.sort((a, b) =>
                  a.project.name.localeCompare(b.project.name)));
                this.loading = false;
              }
            },
            error: () => { pending--; if (pending === 0) this.loading = false; }
          });
        });
      },
      error: () => this.loading = false
    });
  }

  isEmployee(): boolean {
    return this.auth.hasRole(['EMPLOYEE']) && !this.auth.hasRole(['CEO', 'ADMIN', 'TEAM_LEAD']);
  }

  canCreateSubtask(): boolean {
    return this.auth.hasRole(['CEO', 'ADMIN', 'TEAM_LEAD']);
  }

  getSubtaskCount(group: ProjectWithTasks): number {
    return group.tasks.reduce((a, t) => a + (t.subtasks?.length || 0), 0);
  }

  getDoneSubtasks(task: Task): number {
    return task.subtasks?.filter(s => s.is_completed).length || 0;
  }

  getDoneSubtasksForGroup(group: ProjectWithTasks): number {
    return group.tasks.reduce((a, t) => a + this.getDoneSubtasks(t), 0);
  }

  getTaskSubtaskPct(task: Task): number {
    const total = task.subtasks?.length || 0;
    if (total === 0) return 0;
    return Math.round((this.getDoneSubtasks(task) / total) * 100);
  }

  getProjectProgress(group: ProjectWithTasks): number {
    const total = this.getSubtaskCount(group);
    if (total === 0) return 0;
    const done = this.getDoneSubtasksForGroup(group);
    return Math.round((done / total) * 100);
  }

  /** Returns stroke-dasharray for SVG ring based on progress % */
  getProgressDash(group: ProjectWithTasks): string {
    const pct = this.getProjectProgress(group);
    const filled = (pct / 100) * this.CIRC;
    return `${filled} ${this.CIRC}`;
  }

  /** Color changes: red → yellow → green as progress increases */
  getProgressColor(group: ProjectWithTasks): string {
    const pct = this.getProjectProgress(group);
    if (pct >= 100) return '#10B981'; // green
    if (pct >= 50) return '#0EA5E9';  // blue
    if (pct > 0) return '#F59E0B';    // yellow
    return '#EF4444';                 // red (not started)
  }

  getTaskProgressColor(task: Task): string {
    const pct = this.getTaskSubtaskPct(task);
    if (pct >= 100) return '#10B981';
    if (pct >= 50) return '#0EA5E9';
    if (pct > 0) return '#F59E0B';
    return '#6B7280';
  }

  completeTask(task: Task) {
    if (!confirm(`Mark task "${task.title}" as COMPLETED?`)) return;
    this.api.put(`/tasks/${task.id}`, { status: 'COMPLETED' }).subscribe({
      next: () => this.loadData(),
      error: (err) => alert('Failed to update task: ' + (err.error?.detail || err.message))
    });
  }

  createTask(projectId: string, inputEl: HTMLInputElement) {
    const title = inputEl.value.trim();
    if (!title) return;
    
    const newTask = {
      title,
      project_id: projectId,
      status: 'TODO',
      priority: 'MEDIUM',
      estimated_hours: 0,
      actual_hours: 0,
      label_ids: []
    };
    
    this.api.post('/tasks', newTask).subscribe({
      next: () => {
        inputEl.value = '';
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.detail || err?.message || 'Unknown error';
        alert(`Failed to create task: ${msg}`);
      }
    });
  }

  addSubtask(taskId: string, inputEl: HTMLInputElement) {
    const title = inputEl.value.trim();
    if (!title) return;
    this.api.post(`/tasks/${taskId}/subtasks`, { title, is_completed: false }).subscribe({
      next: () => { inputEl.value = ''; this.loadData(); },
      error: (err) => {
        const msg = err?.error?.detail || err?.message || 'Unknown error';
        alert(`Failed to add subtask: ${msg}`);
      }
    });
  }

  toggleSubtask(taskId: string, subtask: Subtask, event: any) {
    const is_completed = event.target.checked;
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { is_completed }).subscribe({
      next: () => this.loadData()
    });
  }

  saveFeedback(taskId: string, subtask: Subtask, event: any) {
    const feedback = event.target.value.trim();
    if (feedback === (subtask.feedback || '')) return;
    this.api.put(`/tasks/${taskId}/subtasks/${subtask.id}`, { feedback }).subscribe({
      next: () => this.loadData()
    });
  }
}
