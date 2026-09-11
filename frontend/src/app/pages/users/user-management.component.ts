import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-page">
      <!-- Page Header -->
      <div class="page-header glass-card">
        <div class="header-left">
          <div class="header-icon-badge">
            <span class="material-symbols-outlined">manage_accounts</span>
          </div>
          <div>
            <h2>User & Workforce Management</h2>
            <p>Manage Employee Roles, Job Titles, Access Permissions & Company Accounts</p>
          </div>
        </div>

        <div class="header-actions">
          <!-- Search input -->
          <div class="search-input-wrap">
            <span class="material-symbols-outlined search-icon">search</span>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Search by name, email, job title, role..." 
              class="search-input" />
            <span *ngIf="searchQuery" class="material-symbols-outlined clear-btn" (click)="searchQuery = ''">close</span>
          </div>

          <button class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-symbols-outlined">person_add</span>
            <span>Add New User</span>
          </button>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="users-table-card glass-card">
        <div class="card-toolbar">
          <span class="results-count">
            Showing <strong>{{ getFilteredUsers().length }}</strong> of {{ users().length }} team members
          </span>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Job Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of getFilteredUsers()">
                <td>
                  <div class="user-cell">
                    <img *ngIf="user.avatar_url" [src]="user.avatar_url" alt="Avatar" class="avatar-img">
                    <div *ngIf="!user.avatar_url" class="avatar" [style.background]="getUserGradient(user.first_name)">
                      {{ (user.first_name[0] || '') + (user.last_name[0] || '') }}
                    </div>
                    <div class="name-col">
                      <span class="name">{{ user.first_name }} {{ user.last_name }}</span>
                    </div>
                  </div>
                </td>
                <td class="email-cell">{{ user.email }}</td>
                <td>
                  <span class="badge" [ngClass]="getRoleBadgeClass(user.role?.name)">
                    {{ getRoleDisplayName(user.role?.name) }}
                  </span>
                </td>
                <td>
                  <span class="job-title-pill" *ngIf="user.job_title">
                    <span class="material-symbols-outlined job-icon">badge</span>
                    <span>{{ user.job_title }}</span>
                  </span>
                  <span class="job-title-pill empty" *ngIf="!user.job_title">
                    <span class="material-symbols-outlined job-icon">help_outline</span>
                    <span>Not Specified</span>
                  </span>
                </td>
                <td>
                  <span class="status-indicator" [class.active]="user.is_active">
                    <span class="status-dot"></span>
                    {{ user.is_active ? 'Active' : 'Suspended' }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" (click)="openEditModal(user)" title="Edit User & Job Title">
                      <span class="material-symbols-outlined">edit</span>
                      <span>Edit</span>
                    </button>
                    <button class="btn btn-sm btn-toggle" 
                            [class.btn-suspend]="user.is_active" 
                            [class.btn-activate]="!user.is_active"
                            (click)="toggleSuspend(user)" 
                            [title]="user.is_active ? 'Suspend Account' : 'Activate Account'">
                      <span class="material-symbols-outlined">{{ user.is_active ? 'block' : 'check_circle' }}</span>
                      <span>{{ user.is_active ? 'Suspend' : 'Activate' }}</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr *ngIf="getFilteredUsers().length === 0">
                <td colspan="6" class="no-results-cell">
                  <span class="material-symbols-outlined">person_search</span>
                  <p>No team members match your filter criteria.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create New User Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-card glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined title-icon">person_add</span>
              <h3>Create New User</h3>
            </div>
            <button type="button" class="close-modal-btn" (click)="showCreateModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form (ngSubmit)="createUser()" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newUser.first_name" name="first_name" placeholder="John" required />
              </div>
              <div class="form-group">
                <label>Last Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="newUser.last_name" name="last_name" placeholder="Doe" required />
              </div>
            </div>

            <div class="form-group">
              <label>Email Address <span class="required">*</span></label>
              <input type="email" [(ngModel)]="newUser.email" name="email" placeholder="john.doe@company.com" required />
            </div>

            <!-- Defined Job Title Field -->
            <div class="form-group">
              <label>
                Job Title <span class="required">*</span>
              </label>
              <input type="text" 
                     [(ngModel)]="newUser.job_title" 
                     name="job_title" 
                     placeholder="e.g. Senior Software Engineer, UI/UX Designer, QA Lead..." 
                     required />
              
              <!-- Quick Suggestions -->
              <div class="title-suggestions">
                <span class="suggestions-label">Suggestions:</span>
                <div class="chip-row">
                  <button type="button" 
                          class="suggestion-chip" 
                          *ngFor="let t of suggestedJobTitles" 
                          (click)="newUser.job_title = t">
                    {{ t }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Role <span class="required">*</span></label>
                <select [(ngModel)]="newUser.role_id" name="role_id" required>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="PROJECT_LEAD">Project / Team Lead</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div class="form-group">
                <label>Initial Password <span class="required">*</span></label>
                <input type="password" [(ngModel)]="newUser.password" name="password" placeholder="Min. 8 characters" required />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="!isCreateFormValid()">
                <span class="material-symbols-outlined">how_to_reg</span>
                <span>Create User</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div class="modal-backdrop" *ngIf="showEditModal && editingUser" (click)="showEditModal = false">
        <div class="modal-card glass-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="material-symbols-outlined title-icon">edit</span>
              <h3>Edit User: {{ editingUser.first_name }} {{ editingUser.last_name }}</h3>
            </div>
            <button type="button" class="close-modal-btn" (click)="showEditModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form (ngSubmit)="saveUserEdit()" class="modal-form">
            <div class="form-group">
              <label>Email Address</label>
              <input type="text" [value]="editingUser.email" disabled class="input-disabled" />
              <small class="helper-text">Email address is permanent and cannot be altered.</small>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>First Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="editingUser.first_name" name="edit_first_name" required />
              </div>
              <div class="form-group">
                <label>Last Name <span class="required">*</span></label>
                <input type="text" [(ngModel)]="editingUser.last_name" name="edit_last_name" required />
              </div>
            </div>

            <!-- Defined Job Title Field in Edit Modal -->
            <div class="form-group">
              <label>Job Title <span class="required">*</span></label>
              <input type="text" 
                     [(ngModel)]="editingUser.job_title" 
                     name="edit_job_title" 
                     placeholder="e.g. Senior Software Engineer..." 
                     required />
              
              <div class="title-suggestions">
                <span class="suggestions-label">Suggestions:</span>
                <div class="chip-row">
                  <button type="button" 
                          class="suggestion-chip" 
                          *ngFor="let t of suggestedJobTitles" 
                          (click)="editingUser.job_title = t">
                    {{ t }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Role <span class="required">*</span></label>
                <select [(ngModel)]="editingUser.role_id" name="edit_role_id" required>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="PROJECT_LEAD">Project / Team Lead</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="editingUser.phone_number" name="edit_phone_number" placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showEditModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <span class="material-symbols-outlined">save</span>
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-page { display: flex; flex-direction: column; gap: 24px; }
    
    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      gap: 16px;
      flex-wrap: wrap;

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .header-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent-primary), #0284C7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);

          .material-symbols-outlined { font-size: 26px; }
        }

        h2 { font-size: 1.35rem; font-weight: 700; margin-bottom: 2px; }
        p { font-size: 0.85rem; color: var(--text-muted); }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;

        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px 14px;
          min-width: 280px;
          transition: all 0.2s;

          &:focus-within {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
          }

          .search-icon { font-size: 18px; color: var(--text-muted); }
          .clear-btn { font-size: 16px; color: var(--text-muted); cursor: pointer; &:hover { color: #EF4444; } }

          .search-input {
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 0.84rem;
            width: 100%;
            outline: none;
            &::placeholder { color: var(--text-muted); }
          }
        }
      }
    }

    /* Users Table Card */
    .users-table-card {
      border-radius: 16px;
      overflow: hidden;
      padding: 0;

      .card-toolbar {
        padding: 14px 20px;
        border-bottom: 1px solid var(--border-color);
        font-size: 0.8rem;
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.01);
      }
    }

    .table {
      margin: 0;

      th {
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--text-muted);
        font-weight: 700;
        padding: 14px 20px;
        border-bottom: 1px solid var(--border-color);
        background: rgba(255, 255, 255, 0.02);
      }

      td {
        padding: 14px 20px;
        vertical-align: middle;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 0.88rem;
      }
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;

      .avatar-img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.82rem;
        text-transform: uppercase;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .name-col {
        display: flex;
        flex-direction: column;
        .name { font-weight: 600; color: var(--text-primary); }
      }
    }

    .email-cell {
      color: var(--text-muted);
      font-family: monospace;
      font-size: 0.82rem;
    }

    /* Role Badges */
    .badge {
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      display: inline-block;

      &.badge-admin { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
      &.badge-lead { background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); }
      &.badge-emp { background: rgba(14, 165, 233, 0.15); color: #0EA5E9; border: 1px solid rgba(14, 165, 233, 0.3); }
      &.badge-ceo { background: rgba(139, 92, 246, 0.15); color: #8B5CF6; border: 1px solid rgba(139, 92, 246, 0.3); }
    }

    /* Job Title Pill */
    .job-title-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-primary);

      .job-icon { font-size: 15px; color: var(--accent-primary); }

      &.empty {
        color: var(--text-muted);
        font-style: italic;
        background: transparent;
        border-style: dashed;
        .job-icon { color: var(--text-muted); }
      }
    }

    /* Status Indicator */
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #EF4444;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #EF4444;
      }

      &.active {
        color: #10B981;
        .status-dot {
          background: #10B981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
        }
      }
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;

      .btn-edit {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 4px;

        &:hover {
          background: rgba(14, 165, 233, 0.1);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .material-symbols-outlined { font-size: 14px; }
      }

      .btn-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        .material-symbols-outlined { font-size: 14px; }

        &.btn-suspend {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #EF4444;
          &:hover { background: rgba(239, 68, 68, 0.2); }
        }

        &.btn-activate {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #10B981;
          &:hover { background: rgba(16, 185, 129, 0.2); }
        }
      }
    }

    .no-results-cell {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      .material-symbols-outlined { font-size: 40px; opacity: 0.4; display: block; margin-bottom: 8px; }
      p { font-size: 0.88rem; }
    }

    /* Modals */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1100;
      padding: 16px;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-color);

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;

          .title-icon { font-size: 22px; color: var(--accent-primary); }
          h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          &:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); }
        }
      }

      .modal-form {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .form-row {
          display: flex;
          gap: 12px;
          .form-group { flex: 1; margin-bottom: 0; }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;

          label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);

            .required { color: #EF4444; margin-left: 2px; }
          }

          input, select {
            background: var(--bg-body);
            border: 1px solid var(--border-color);
            padding: 10px 14px;
            border-radius: 10px;
            color: var(--text-primary);
            font-size: 0.88rem;
            outline: none;
            transition: all 0.2s;

            &:focus {
              border-color: var(--accent-primary);
              box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
            }
          }

          .input-disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: rgba(255, 255, 255, 0.02);
          }

          .helper-text {
            font-size: 0.72rem;
            color: var(--text-muted);
          }
        }

        /* Title Suggestion Chips */
        .title-suggestions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;

          .suggestions-label {
            font-size: 0.7rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }

          .chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;

            .suggestion-chip {
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid var(--border-color);
              border-radius: 14px;
              padding: 3px 10px;
              font-size: 0.72rem;
              color: var(--text-secondary);
              cursor: pointer;
              transition: all 0.15s;

              &:hover {
                background: rgba(14, 165, 233, 0.12);
                border-color: var(--accent-primary);
                color: var(--accent-primary);
              }
            }
          }
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);

          button {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            padding: 9px 18px;
            border-radius: 10px;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 14px;

        .header-actions {
          flex-direction: column;
          align-items: stretch;

          .search-input-wrap { min-width: 100%; }
          button { width: 100%; justify-content: center; }
        }
      }

      .modal-form .form-row {
        flex-direction: column;
        gap: 16px;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  api = inject(ApiService);
  users = signal<User[]>([]);
  searchQuery = '';
  showCreateModal = false;
  showEditModal = false;

  suggestedJobTitles = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Engineer',
    'UI/UX Designer',
    'QA Engineer',
    'Product Manager',
    'Project Lead',
    'DevOps Specialist',
    'Business Analyst'
  ];

  newUser = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    job_title: '',
    role_id: 'EMPLOYEE'
  };

  editingUser: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    job_title: string;
    phone_number: string;
    role_id: string;
  } | null = null;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.get<User[]>('/users').subscribe({
      next: res => this.users.set(res)
    });
  }

  getFilteredUsers(): User[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role?.name || '').toLowerCase();
      const title = (u.job_title || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || title.includes(q);
    });
  }

  openCreateModal() {
    this.resetNewUser();
    this.showCreateModal = true;
  }

  isCreateFormValid(): boolean {
    return Boolean(
      this.newUser.first_name.trim() &&
      this.newUser.last_name.trim() &&
      this.newUser.email.trim() &&
      this.newUser.password.trim() &&
      this.newUser.job_title.trim() &&
      this.newUser.role_id
    );
  }

  createUser() {
    if (!this.isCreateFormValid()) return;

    this.api.post('/users', this.newUser).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.resetNewUser();
        this.loadUsers();
      },
      error: (err) => {
        alert('Failed to create user: ' + (err.error?.detail || err.message));
      }
    });
  }

  openEditModal(user: User) {
    this.editingUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      job_title: user.job_title || '',
      phone_number: user.phone_number || '',
      role_id: user.role?.name || 'EMPLOYEE'
    };
    this.showEditModal = true;
  }

  saveUserEdit() {
    if (!this.editingUser) return;

    const payload = {
      first_name: this.editingUser.first_name,
      last_name: this.editingUser.last_name,
      job_title: this.editingUser.job_title,
      phone_number: this.editingUser.phone_number,
      role_id: this.editingUser.role_id
    };

    this.api.put(`/users/${this.editingUser.id}`, payload).subscribe({
      next: () => {
        this.showEditModal = false;
        this.editingUser = null;
        this.loadUsers();
      },
      error: (err) => {
        alert('Failed to update user: ' + (err.error?.detail || err.message));
      }
    });
  }

  toggleSuspend(user: User) {
    const action = user.is_active ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.first_name} ${user.last_name}'s account?`)) return;

    this.api.put(`/users/${user.id}`, { is_active: !user.is_active }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert('Failed to update user status: ' + (err.error?.detail || err.message))
    });
  }

  resetNewUser() {
    this.newUser = {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      job_title: '',
      role_id: 'EMPLOYEE'
    };
  }

  getRoleBadgeClass(roleName?: string): string {
    const r = (roleName || '').toUpperCase();
    if (r.includes('ADMIN')) return 'badge-admin';
    if (r.includes('LEAD')) return 'badge-lead';
    if (r.includes('CEO')) return 'badge-ceo';
    return 'badge-emp';
  }

  getRoleDisplayName(roleName?: string): string {
    const r = (roleName || '').toUpperCase();
    if (r === 'PROJECT_LEAD' || r === 'TEAM_LEAD') return 'Team Lead';
    return roleName || 'Employee';
  }

  getUserGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #0EA5E9, #3B82F6)',
      'linear-gradient(135deg, #10B981, #059669)',
      'linear-gradient(135deg, #F59E0B, #D97706)',
      'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      'linear-gradient(135deg, #EC4899, #BE185D)'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  }
}
