import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar></app-sidebar>
      <div class="main-wrapper">
        <app-topbar></app-topbar>
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
        <footer class="app-footer">
          <p>Created by Mehedi Hasan &copy; {{ currentYear }} | Enterprise Task Manager</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
    }

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .page-content {
      margin-left: 260px;
      padding: 32px;
      flex: 1;
      transition: margin-left 0.3s ease;
    }

    @media (max-width: 1024px) {
      .page-content {
        margin-left: 80px;
        padding: 24px;
      }
    }

    .app-footer {
      margin-left: 260px;
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid var(--border-color);
      background: rgba(13, 19, 34, 0.4);
      color: var(--text-muted);
      font-size: 0.85rem;
      transition: margin-left 0.3s ease;
    }

    @media (max-width: 1024px) {
      .app-footer {
        margin-left: 80px;
      }
    }
  `]
})
export class LayoutComponent {
  currentYear = new Date().getFullYear();
}
