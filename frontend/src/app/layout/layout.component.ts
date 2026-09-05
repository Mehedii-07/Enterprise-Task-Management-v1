import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { ChatService } from '../core/services/chat.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-layout">
      <app-sidebar [mobileOpen]="sidebarOpen" (closeMobile)="sidebarOpen = false"></app-sidebar>
      
      <div class="main-wrapper">
        <app-topbar (toggleSidebar)="sidebarOpen = !sidebarOpen"></app-topbar>
        
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
        
        <footer class="app-footer">
          <p>Created by Mehedi Hasan &copy; {{ currentYear }} | Enterprise Task Manager</p>
        </footer>
      </div>

      <!-- Floating Chat Button -->
      <div class="floating-chat-btn" (click)="goToChat()" *ngIf="router.url !== '/chat'">
        <div class="icon-wrapper">
          <span class="material-symbols-outlined">forum</span>
        </div>
        <div class="badge" *ngIf="chatService.unreadCount() > 0">
          {{ chatService.unreadCount() > 99 ? '99+' : chatService.unreadCount() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      position: relative;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
    }

    .page-content {
      margin-left: 260px;
      padding: 32px;
      flex: 1;
      min-width: 0;
      transition: margin-left 0.3s ease, padding 0.3s ease;
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

    @media (max-width: 1366px) {
      .page-content {
        padding: 24px 20px;
      }
      .app-footer {
        padding: 16px 20px;
      }
    }

    @media (max-width: 1024px) {
      .page-content {
        margin-left: 80px;
        padding: 20px 16px;
      }
      .app-footer {
        margin-left: 80px;
      }
    }

    @media (max-width: 768px) {
      .page-content {
        margin-left: 0;
        padding: 16px 12px;
        width: 100%;
      }
      .app-footer {
        margin-left: 0;
        padding: 16px 12px;
        font-size: 0.75rem;
      }
    }

    .floating-chat-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
      z-index: 85;
      
      &:hover {
        transform: scale(1.08) translateY(-3px);
        box-shadow: 0 15px 30px rgba(59, 130, 246, 0.6);
      }

      @media (max-width: 640px) {
        bottom: 16px;
        right: 16px;
        width: 44px;
        height: 44px;
      }
      
      .icon-wrapper {
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .material-symbols-outlined {
          font-size: 26px;
        }
      }

      .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--accent-danger);
        color: white;
        font-size: 0.7rem;
        font-weight: bold;
        padding: 3px 6px;
        border-radius: 20px;
        border: 2px solid var(--bg-card);
        box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
        animation: pulse-badge 2s infinite;
      }
    }

    @keyframes pulse-badge {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  chatService = inject(ChatService);
  router = inject(Router);
  sidebarOpen = false;

  ngOnInit() {
    this.chatService.connect();
  }

  ngOnDestroy() {
    this.chatService.disconnect();
  }

  goToChat() {
    this.router.navigate(['/chat']);
  }
}
