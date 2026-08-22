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
      <!-- Animated Background Elements -->
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>

      <div class="auth-card glass-card-3d">
        <div class="brand-header">
          <div class="logo">
            <img src="/pj.webp" alt="Logo" class="custom-logo-img" />
          </div>
          <h2>Enterprise Task Manager</h2>
          <p>Multi-tenant SaaS Workspace Login</p>
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label>Work Email</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="ceo@enterprise.com" class="input-3d" />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" class="input-3d" />
          </div>

          <div *ngIf="errorMessage" class="error-alert">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-3d w-full" [disabled]="loading">
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
      background: #0B0F19 url('/background photo.webp') no-repeat center center;
      background-size: cover;
      padding: 20px;
      position: relative;
      overflow: hidden;
      perspective: 1000px; /* Base perspective for 3D elements */
    }

    /* Animated 3D Background Shapes */
    .bg-shape {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      z-index: 0;
      animation: float 20s infinite alternate ease-in-out;
    }

    .shape-1 {
      width: 400px;
      height: 400px;
      background: rgba(59, 130, 246, 0.4); /* Blue */
      top: -10%;
      left: -10%;
      animation-delay: 0s;
    }

    .shape-2 {
      width: 500px;
      height: 500px;
      background: rgba(139, 92, 246, 0.3); /* Purple */
      bottom: -20%;
      right: -10%;
      animation-duration: 25s;
    }

    .shape-3 {
      width: 300px;
      height: 300px;
      background: rgba(14, 165, 233, 0.3); /* Light Blue */
      top: 40%;
      left: 60%;
      animation-duration: 18s;
      animation-delay: -5s;
    }

    @keyframes float {
      0% { transform: translate(0, 0) scale(1) rotate(0deg); }
      33% { transform: translate(50px, -50px) scale(1.1) rotate(10deg); }
      66% { transform: translate(-30px, 40px) scale(0.9) rotate(-5deg); }
      100% { transform: translate(20px, 20px) scale(1) rotate(0deg); }
    }

    .glass-card-3d {
      width: 100%;
      max-width: 460px;
      padding: 40px;
      position: relative;
      z-index: 10;
      
      /* Enhanced 3D Glassmorphism */
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      
      /* Multi-layered shadow for 3D depth */
      box-shadow: 
        20px 20px 40px rgba(0, 0, 0, 0.4),
        inset 0px 0px 0px 1px rgba(255, 255, 255, 0.05),
        inset 2px 2px 10px rgba(255, 255, 255, 0.1);
      
      transform-style: preserve-3d;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .glass-card-3d:hover {
      transform: translateY(-2px);
      box-shadow: 
        25px 25px 50px rgba(0, 0, 0, 0.5),
        inset 0px 0px 0px 1px rgba(255, 255, 255, 0.05),
        inset 2px 2px 15px rgba(255, 255, 255, 0.15);
    }

    .brand-header {
      text-align: center;
      margin-bottom: 30px;
      transform: translateZ(30px); /* 3D pop effect */

      .logo {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #3B82F6, #8B5CF6);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        color: #fff;
        box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3), inset 2px 2px 5px rgba(255,255,255,0.3);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        overflow: hidden;
      }
      
      .logo .custom-logo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .logo:hover {
        transform: scale(1.1) rotate(5deg);
      }

      h2 { font-size: 1.6rem; color: #fff; margin-bottom: 6px; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
      p { font-size: 0.9rem; color: #9CA3AF; }
    }

    .form-group {
      margin-bottom: 20px;
      transform: translateZ(20px);
      
      label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.85rem;
        color: #D1D5DB;
        font-weight: 500;
      }
    }

    .input-3d {
      width: 100%;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(255,255,255,0.05);
      outline: none;
    }

    .input-3d:focus {
      background: rgba(0, 0, 0, 0.4);
      border-color: #3B82F6;
      box-shadow: inset 3px 3px 6px rgba(0,0,0,0.4), 0 0 15px rgba(59, 130, 246, 0.3);
      transform: translateZ(5px);
    }

    .btn-3d {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      overflow: hidden;
      transform: translateZ(25px);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 
        0 6px 15px rgba(37, 99, 235, 0.4),
        inset 1px 1px 1px rgba(255,255,255,0.3),
        0 2px 0 #1D4ED8; /* Solid bottom border for 3D button effect */
    }

    .btn-3d:hover {
      transform: translateZ(25px) translateY(-2px);
      box-shadow: 
        0 8px 20px rgba(37, 99, 235, 0.5),
        inset 1px 1px 1px rgba(255,255,255,0.4),
        0 4px 0 #1D4ED8;
    }
    
    .btn-3d:active {
      transform: translateZ(25px) translateY(2px);
      box-shadow: 
        0 2px 5px rgba(37, 99, 235, 0.5),
        inset 1px 1px 1px rgba(255,255,255,0.2),
        0 0 0 #1D4ED8;
    }

    .w-full { width: 100%; margin-top: 10px; }

    .error-alert {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #FCA5A5;
      padding: 12px;
      border-radius: 10px;
      font-size: 0.85rem;
      margin-bottom: 20px;
      transform: translateZ(15px);
      backdrop-filter: blur(4px);
    }

    .demo-logins {
      margin-top: 35px;
      padding-top: 25px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      transform: translateZ(15px);

      .demo-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: #6B7280;
        letter-spacing: 0.1em;
        text-align: center;
        margin-bottom: 18px;
        text-transform: uppercase;
      }

      .demo-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .demo-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);

          &:hover {
            border-color: rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 15px rgba(0,0,0,0.2);
          }

          .role { font-size: 0.85rem; font-weight: 700; color: #F3F4F6; margin-bottom: 2px; }
          .email { font-size: 0.7rem; color: #9CA3AF; }
        }
        
        .demo-btn.ceo:hover { border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.1); }
        .demo-btn.admin:hover { border-color: rgba(59, 130, 246, 0.5); background: rgba(59, 130, 246, 0.1); }
        .demo-btn.lead:hover { border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.1); }
        .demo-btn.emp:hover { border-color: rgba(245, 158, 11, 0.5); background: rgba(245, 158, 11, 0.1); }
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
