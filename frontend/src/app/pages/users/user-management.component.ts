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
      <div class="page-header glass-card">
        <div>
          <h2>User & Workforce Management</h2>
          <p>Manage Employee Roles, Access Permissions & Company Accounts</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal = true">
          <span class="material-symbols-outlined">person_add</span>
          <span>Add New User</span>
        </button>
      </div>

      <div class="users-table-card glass-card">
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
              <tr *ngFor="let user of users()">
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ user.first_name[0] }}{{ user.last_name[0] }}</div>
                    <span class="name">{{ user.first_name }} {{ user.last_name }}</span>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge badge-role">{{ user.role.name }}</span>
                </td>
                <td>{{ user.job_title || 'N/A' }}</td>
                <td>
                  <span class="status-indicator" [class.active]="user.is_active">
                    {{ user.is_active ? 'Active' : 'Suspended' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="toggleSuspend(user)">
                    {{ user.is_active ? 'Suspend' : 'Activate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create User Modal -->
      <div class="modal-backdrop" *ngIf="showCreateModal">
        <div class="modal-card glass-card">
          <h3>Create New User</h3>
          <form (ngSubmit)="createUser()">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" [(ngModel)]="newUser.first_name" name="first_name" required />
            </div>

            <div class="form-group">
              <label>Last Name</label>
              <input type="text" [(ngModel)]="newUser.last_name" name="last_name" required />
            </div>

            <div class="form-group">
              <label>Email Address</label>
              <input type="email" [(ngModel)]="newUser.email" name="email" required />
            </div>

            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="newUser.password" name="password" required />
            </div>

            <div class="form-group">
              <label>Role</label>
              <select [(ngModel)]="newUser.role_id" name="role_id" required>
                <option value="ADMIN">ADMIN</option>
                <option value="TEAM_LEAD">TEAM LEAD</option>
                <option value="EMPLOYEE">EMPLOYEE</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn btn-primary">Create User</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; }
    .user-cell { display: flex; align-items: center; gap: 12px;
      .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
      .name { font-weight: 600; }
    }
    .status-indicator {
      font-size: 0.8rem; font-weight: 600; color: var(--accent-danger);
      &.active { color: var(--accent-success); }
    }
    .btn-sm { padding: 4px 10px; font-size: 0.75rem; }

    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card { width: 100%; max-width: 460px;
      h3 { font-size: 1.3rem; margin-bottom: 20px; }
      .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  api = inject(ApiService);
  users = signal<User[]>([]);
  showCreateModal = false;

  newUser = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: 'EMPLOYEE'
  };

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.get<User[]>('/users').subscribe({
      next: res => this.users.set(res)
    });
  }

  createUser() {
    this.api.post('/users', this.newUser).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadUsers();
      }
    });
  }

  toggleSuspend(user: User) {
    this.api.put(`/users/${user.id}`, { is_active: !user.is_active }).subscribe({
      next: () => this.loadUsers()
    });
  }
}
