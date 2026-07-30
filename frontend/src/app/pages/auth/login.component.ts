import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card glass-card">
        <div class="brand-header">
          <div class="logo">
            <span class="material-symbols-outlined">dataset</span>
          </div>
          <h2>Enterprise Task Manager</h2>
          <p>Multi-tenant SaaS Workspace Login</p>
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>Work Email</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="ceo@enterprise.com" />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" />
          </div>

          <div *ngIf="errorMessage" class="error-alert">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="loading">
            <span class="material-symbols-outlined">login</span>
            <span>{{ loading ? 'Signing in...' : 'Sign In to Workspace' }}</span>
          </button>
        </form>

        <div class="demo-logins">
          <p class="demo-title">QUICK DEMO ACCESSIBILITY LOGIN (1-CLICK)</p>
          <div class="demo-grid">
            <button (click)="quickLogin('ceo@enterprise.com', 'CeoSuperAdmin123!')" class="demo-btn ceo">
              <span class="role">CEO</span>
              <span class="email">Super Admin</span>
            </button>

            <button (click)="quickLogin('admin@enterprise.com', 'Admin123!')" class="demo-btn admin">
              <span class="role">Admin</span>
              <span class="email">Company Admin</span>
            </button>

            <button (click)="quickLogin('lead@enterprise.com', 'Lead123!')" class="demo-btn lead">
              <span class="role">Team Lead</span>
              <span class="email">Engineering Lead</span>
            </button>

            <button (click)="quickLogin('emp@enterprise.com', 'Emp123!')" class="demo-btn emp">
              <span class="role">Employee</span>
              <span class="email">Charlie Worker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top right, #1F2937 0%, #0B0F19 60%);
      padding: 20px;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;

      .brand-header {
        text-align: center;
        margin-bottom: 30px;

        .logo {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #fff;

          .material-symbols-outlined { font-size: 32px; }
        }

        h2 { font-size: 1.5rem; color: var(--text-primary); margin-bottom: 4px; }
        p { font-size: 0.85rem; color: var(--text-muted); }
      }

      .w-full { width: 100%; justify-content: center; margin-top: 10px; }

      .error-alert {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid var(--accent-danger);
        color: #F87171;
        padding: 10px;
        border-radius: 8px;
        font-size: 0.85rem;
        margin-bottom: 16px;
      }
    }

    .demo-logins {
      margin-top: 30px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);

      .demo-title {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        text-align: center;
        margin-bottom: 14px;
      }

      .demo-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;

        .demo-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--accent-primary);
            background: rgba(59, 130, 246, 0.1);
          }

          .role { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }
          .email { font-size: 0.7rem; color: var(--text-muted); }
        }
      }
    }
  `]
})
export class LoginComponent {
  auth = inject(AuthService);
  router = inject(Router);

  email = 'ceo@enterprise.com';
  password = 'CeoSuperAdmin123!';
  errorMessage = '';
  loading = false;

  onLogin() {
    this.loading = true;
    this.errorMessage = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Invalid email or password.';
      }
    });
  }

  quickLogin(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.onLogin();
  }
}
