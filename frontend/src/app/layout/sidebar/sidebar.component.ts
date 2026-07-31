import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <div class="logo-icon">
          <span class="material-symbols-outlined">dataset</span>
        </div>
        <div class="brand-text">
          <h3>Enterprise</h3>
          <span>Task Manager</span>
        </div>
      </div>

      <div class="user-profile-badge">
        <div class="avatar">{{ userInitials() }}</div>
        <div class="info">
          <p class="name">{{ auth.currentUser()?.first_name }} {{ auth.currentUser()?.last_name }}</p>
          <span class="badge badge-role">{{ auth.userRole() }}</span>
        </div>
      </div>

      <nav class="nav-menu">
        <div class="nav-section-title">MAIN MENU</div>
        
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </a>

        <a routerLink="/projects" routerLinkActive="active" class="nav-item">
          <span class="material-symbols-outlined">folder</span>
          <span>Projects</span>
        </a>

        <a routerLink="/tasks" routerLinkActive="active" class="nav-item">
          <span class="material-symbols-outlined">task_alt</span>
          <span>Task Board</span>
        </a>

        <!-- Admin & CEO items -->
        <ng-container *ngIf="auth.hasRole(['CEO', 'ADMIN'])">
          <div class="nav-section-title">ADMINISTRATION</div>

          <a routerLink="/users" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">group</span>
            <span>User Management</span>
          </a>

          <a *ngIf="auth.userRole() === 'CEO'" routerLink="/organizations" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">corporate_fare</span>
            <span>Organizations</span>
          </a>
        </ng-container>

        <div class="nav-section-title">ANALYTICS & REPORTS</div>

        <a routerLink="/reports" routerLinkActive="active" class="nav-item">
          <span class="material-symbols-outlined">analytics</span>
          <span>Reports & Exporters</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" (click)="auth.logout()">
          <span class="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);

      .logo-icon {
        width: 42px;
        height: 42px;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .brand-text {
        h3 { font-size: 1.1rem; color: var(--text-primary); line-height: 1.2; }
        span { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      }
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 20px 0;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid var(--border-color);

      .avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--accent-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #fff;
      }

      .info {
        .name { font-size: 0.85rem; font-weight: 600; }
      }
    }

    .nav-menu {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .nav-section-title {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        margin: 16px 8px 6px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover, &.active {
          background: var(--bg-card-hover);
          color: var(--text-primary);

          .material-symbols-outlined { color: var(--accent-primary); }
        }
      }
    }

    .sidebar-footer {
      padding-top: 16px;
      border-top: 1px solid var(--border-color);

      .logout-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: transparent;
        border: none;
        color: var(--text-secondary);
        border-radius: 8px;
        cursor: pointer;
        font-family: var(--font-primary);
        font-size: 0.9rem;

        &:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-danger);
        }
      }
    }

    /* Responsive Sidebar Collapsed View */
    @media (max-width: 1024px) {
      .sidebar {
        width: 80px;
        padding: 24px 8px;
        align-items: center;
        transition: width 0.3s ease;
      }
      .brand {
        flex-direction: column;
        padding-bottom: 16px;
        .brand-text { display: none; }
      }
      .user-profile-badge {
        flex-direction: column;
        padding: 8px;
        .info { display: none; }
      }
      .nav-menu {
        align-items: center;
        width: 100%;
        .nav-section-title { display: none; }
        .nav-item {
          padding: 12px;
          justify-content: center;
          span:not(.material-symbols-outlined) { display: none; }
        }
      }
      .sidebar-footer {
        width: 100%;
        .logout-btn {
          justify-content: center;
          padding: 12px;
          span:not(.material-symbols-outlined) { display: none; }
        }
      }
    }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);

  userInitials(): string {
    const user = this.auth.currentUser();
    if (!user) return 'U';
    return `${user.first_name[0]}${user.last_name[0]}`;
  }
}
