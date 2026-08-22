import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <header class="topbar">
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input 
          type="text" 
          placeholder="Global search across users, tasks, projects..." 
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
          (keyup.enter)="onSearchEnter()"
        />
        <div class="search-results-dropdown" *ngIf="searchResults().length > 0">
          <div class="search-result-item" *ngFor="let item of searchResults()" (click)="navigateTo(item)">
            <span class="type-tag">{{ item.type }}</span>
            <div class="details">
              <span class="title">{{ item.title }}</span>
              <span class="subtitle">{{ item.subtitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="calendar-wrapper">
          <button class="icon-btn btn-3d-interactive" (click)="toggleCalendar()">
            <span class="material-symbols-outlined">calendar_month</span>
            <span class="unread-dot pulse-animation" *ngIf="projectsToday() > 0"></span>
          </button>
          
          <!-- 3D Calendar Dropdown -->
          <div class="calendar-dropdown glass-dropdown-3d" [class.open]="calendarOpen()">
            <div class="dropdown-header">
              <button class="icon-btn-small" (click)="prevMonth()"><span class="material-symbols-outlined">chevron_left</span></button>
              <h3>{{ currentMonthName }} {{ currentYear }}</h3>
              <button class="icon-btn-small" (click)="nextMonth()"><span class="material-symbols-outlined">chevron_right</span></button>
            </div>
            
            <div class="calendar-body">
              <div class="calendar-weekdays">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div class="calendar-grid">
                <div *ngFor="let day of calendarDays" class="calendar-day" [class.empty]="!day.date" [class.today]="day.isToday">
                  <span *ngIf="day.date" class="date-num">{{ day.date?.getDate() }}</span>
                  <div class="indicators" *ngIf="day.date">
                    <span class="dot assign-dot" *ngIf="day.hasAssign" [title]="day.assignProjects"></span>
                    <span class="dot delivery-dot" *ngIf="day.hasDelivery" [title]="day.deliveryProjects"></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="calendar-legend">
              <div class="legend-item"><span class="dot assign-dot"></span> Assigned</div>
              <div class="legend-item"><span class="dot delivery-dot"></span> Due</div>
            </div>
          </div>
        </div>

        <div class="notification-wrapper">
          <button class="icon-btn btn-3d-interactive" (click)="toggleNotifications()">
            <span class="material-symbols-outlined">notifications</span>
            <span class="unread-dot pulse-animation" *ngIf="unreadCount() > 0"></span>
          </button>
          
          <!-- 3D Notification Dropdown -->
          <div class="notification-dropdown glass-dropdown-3d" [class.open]="notificationsOpen()">
            <div class="dropdown-header">
              <h3>Notifications <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span></h3>
              <button class="mark-read-btn" (click)="markAllRead()" *ngIf="unreadCount() > 0">Mark all as read</button>
            </div>
            
            <div class="notification-list">
              <div class="no-notifications" *ngIf="notifications().length === 0">
                <p>No new notifications</p>
              </div>

              <div class="notification-item" *ngFor="let notif of notifications()" [class.unread]="!notif.read" (click)="markRead(notif)">
                <div class="notif-icon" [ngClass]="getIconClass(notif.type)">
                  <span class="material-symbols-outlined">{{ getIcon(notif.type) }}</span>
                </div>
                <div class="notif-content">
                  <p class="notif-text" [innerHTML]="notif.message"></p>
                  <span class="notif-time">{{ notif.time | date:'shortTime' }}</span>
                </div>
              </div>
            </div>
            
            <div class="dropdown-footer">
              <button>View All Activity</button>
            </div>
          </div>
        </div>

        <div class="user-menu">
          <span class="role-badge badge badge-role btn-3d-interactive">{{ auth.userRole() }}</span>
          
          <div class="user-dropdown-wrapper">
            <button class="avatar-btn btn-3d-interactive" (click)="toggleUserDropdown()">
              <img *ngIf="auth.currentUser()?.avatar_url" [src]="auth.currentUser()?.avatar_url" alt="Avatar">
              <span *ngIf="!auth.currentUser()?.avatar_url" class="material-symbols-outlined">person</span>
            </button>
            
            <div class="user-dropdown glass-dropdown-3d" [class.open]="userDropdownOpen()">
              <div class="dropdown-header">
                <div class="user-info">
                  <h4>{{ auth.currentUser()?.first_name }} {{ auth.currentUser()?.last_name }}</h4>
                  <p>{{ auth.currentUser()?.email }}</p>
                </div>
              </div>
              <div class="dropdown-body">
                <a routerLink="/profile" class="dropdown-item" (click)="userDropdownOpen.set(false)">
                  <span class="material-symbols-outlined">person</span>
                  Profile Settings
                </a>
                <a (click)="logout()" class="dropdown-item logout">
                  <span class="material-symbols-outlined">logout</span>
                  Sign Out
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      height: 70px;
      margin-left: 260px;
      padding: 0 32px;
      background: rgba(13, 19, 34, 0.7);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
      perspective: 1000px;
    }

    .search-box {
      position: relative;
      width: 420px;

      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
      }

      input {
        width: 100%;
        padding: 10px 16px 10px 44px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        color: var(--text-primary);
        font-size: 0.9rem;
        outline: none;
        transition: all 0.3s ease;
        box-shadow: inset 2px 2px 5px rgba(0,0,0,0.2);

        &:focus { 
          border-color: var(--accent-primary); 
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.3), 0 0 10px rgba(59, 130, 246, 0.2);
        }
      }

      .search-results-dropdown {
        position: absolute;
        top: 48px;
        left: 0;
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        max-height: 350px;
        overflow-y: auto;
        padding: 8px;

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;

          &:hover { background: var(--bg-card-hover); }

          .type-tag {
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            background: var(--accent-primary);
            color: #fff;
          }

          .details {
            display: flex;
            flex-direction: column;
            .title { font-size: 0.85rem; font-weight: 600; }
            .subtitle { font-size: 0.75rem; color: var(--text-muted); }
          }
        }
      }
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 20px;
      
      .notification-wrapper {
        position: relative;
      }

      .btn-3d-interactive {
        background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 
          0 4px 6px rgba(0, 0, 0, 0.3),
          inset 1px 1px 1px rgba(255, 255, 255, 0.1),
          0 2px 0 rgba(0,0,0,0.5);
          
        &:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 6px 12px rgba(0, 0, 0, 0.4),
            inset 1px 1px 2px rgba(255, 255, 255, 0.2),
            0 4px 0 rgba(0,0,0,0.5);
          border-color: var(--accent-primary);
        }
        
        &:active {
          transform: translateY(2px);
          box-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.4),
            inset 1px 1px 3px rgba(0, 0, 0, 0.5),
            0 0 0 rgba(0,0,0,0.5);
        }
      }

      .icon-btn {
        width: 42px;
        height: 42px;
        border-radius: 12px;

        .unread-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--accent-danger);
          border-radius: 50%;
          border: 2px solid #0B0F19;
        }
        
        .pulse-animation {
          animation: pulse 2s infinite;
        }
      }
      
      .role-badge {
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    
    /* 3D Notification Dropdown */
    .glass-dropdown-3d {
      position: absolute;
      top: 60px;
      right: 0;
      width: 380px;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      
      /* 3D Transform Origin */
      transform-origin: top right;
      transform: scale(0.9) rotateX(-15deg) translateY(-10px);
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      box-shadow: 
        10px 20px 40px rgba(0, 0, 0, 0.6),
        inset 0px 0px 0px 1px rgba(255, 255, 255, 0.05),
        inset 2px 2px 10px rgba(255, 255, 255, 0.05);
        
      &.open {
        transform: scale(1) rotateX(0deg) translateY(0);
        opacity: 1;
        visibility: visible;
      }
      
      .dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        
        .user-info {
          h4 { margin: 0; font-size: 1rem; color: #fff; font-weight: 600; }
          p { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        }
        
        h3 {
          font-size: 1.1rem;
          color: #fff;
          font-weight: 600;
          margin: 0;
        }
        
        .mark-read-btn {
          background: none;
          border: none;
          color: var(--accent-primary);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
          
          &:hover { color: #60A5FA; }
        }
      }
      
      .notification-list {
        max-height: 400px;
        overflow-y: auto;
        
        .no-notifications {
          padding: 30px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        
        /* Custom scrollbar */
        &::-webkit-scrollbar { width: 6px; }
        &::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      }
      
      .notification-item {
        display: flex;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        
        &.unread {
          background: rgba(59, 130, 246, 0.05);
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--accent-primary);
          }
        }
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px); /* Slight 3D slide effect on hover */
        }
        
        .notif-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2), inset 1px 1px 2px rgba(255,255,255,0.2);
          
          &.bg-blue { background: linear-gradient(135deg, #3B82F6, #2563EB); }
          &.bg-green { background: linear-gradient(135deg, #10B981, #059669); }
          &.bg-purple { background: linear-gradient(135deg, #8B5CF6, #6D28D9); }
          
          span { font-size: 20px; }
        }
        
        .notif-content {
          .notif-text {
            font-size: 0.85rem;
            color: #D1D5DB;
            margin: 0 0 6px 0;
            line-height: 1.4;
            
            strong { color: #fff; }
            em { color: #9CA3AF; font-style: normal; font-weight: 500; }
          }
          
          .notif-time {
            font-size: 0.7rem;
            color: #6B7280;
            font-weight: 500;
          }
        }
      }
      
      .dropdown-footer {
        padding: 12px;
        text-align: center;
        
        button {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
          
          &:hover { color: #fff; }
        }
      }
    }
    
    .user-menu {
      display: flex;
      gap: 12px;
      align-items: center;
      
      .user-dropdown-wrapper {
        position: relative;
        perspective: 1000px;
      }
      
      .avatar-btn {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        padding: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.2);
        
        img { width: 100%; height: 100%; object-fit: cover; }
        span { color: #fff; }
      }
      
      .user-dropdown {
        width: 250px;
        
        .dropdown-body {
          padding: 8px 0;
          
          .dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            color: var(--text-primary);
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover {
              background: rgba(255, 255, 255, 0.05);
              padding-left: 24px;
            }
            
            &.logout {
              color: var(--accent-danger);
              border-top: 1px solid rgba(255, 255, 255, 0.05);
              margin-top: 4px;
            }
          }
        }
      }
    }
    
    /* Calendar styles */
    .calendar-wrapper {
      position: relative;
    }
    .calendar-dropdown {
      width: 320px;
    }
    .calendar-dropdown .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .icon-btn-small {
      background: none; border: none; color: var(--text-primary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      padding: 4px; border-radius: 4px;
    }
    .icon-btn-small:hover { background: rgba(255,255,255,0.1); }
    .calendar-body { padding: 12px; }
    .calendar-weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr);
      text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
      margin-bottom: 8px;
    }
    .calendar-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
    }
    .calendar-day {
      aspect-ratio: 1; border-radius: 6px;
      display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
      padding: 4px; font-size: 0.85rem;
      background: rgba(255,255,255,0.03); transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
    }
    .calendar-day:not(.empty):hover {
      background: rgba(255,255,255,0.1); transform: translateY(-2px);
    }
    .calendar-day.empty { background: transparent; cursor: default; }
    .calendar-day.today {
      background: rgba(59, 130, 246, 0.15); border: 1px solid var(--accent-primary);
    }
    .calendar-day.today .date-num { color: var(--accent-primary); font-weight: 700; }
    .indicators { display: flex; gap: 4px; margin-top: 4px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .assign-dot { background: var(--accent-primary); box-shadow: 0 0 4px var(--accent-primary); }
    .delivery-dot { background: #EF4444; box-shadow: 0 0 4px #EF4444; }
    
    .calendar-legend {
      display: flex; justify-content: center; gap: 16px;
      padding: 10px; border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 0.75rem; color: var(--text-muted);
    }
    .calendar-legend .legend-item { display: flex; align-items: center; gap: 6px; }
  `]
})
export class TopbarComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  ws = inject(WebsocketService);
  router = inject(Router);

  searchQuery = '';
  searchResults = signal<any[]>([]);
  notificationsOpen = signal<boolean>(false);
  userDropdownOpen = signal<boolean>(false);
  calendarOpen = signal<boolean>(false);
  projectsToday = signal<number>(0);

  projects: any[] = [];
  calendarDays: any[] = [];
  currentMonth: Date = new Date();

  get currentMonthName() {
    return this.currentMonth.toLocaleString('default', { month: 'long' });
  }

  get currentYear() {
    return this.currentMonth.getFullYear();
  }

  notifications = signal<any[]>([
    { id: 1, type: 'assignment', message: '<strong>System</strong>: Welcome to Enterprise Task Manager!', time: new Date(), read: false }
  ]);

  unreadCount = signal<number>(1);
  private sub?: Subscription;

  ngOnInit() {
    this.loadProjects();
    this.generateCalendar();
    this.sub = this.ws.messages$.subscribe(msg => {
      let newNotif = null;

      // Target-based notification filtering
      if (msg['target_user_ids'] && Array.isArray(msg['target_user_ids'])) {
        const myId = this.auth.currentUser()?.id;
        if (!myId || !msg['target_user_ids'].includes(myId)) {
          return;
        }
      }

      if (msg.event === 'task_assigned' || msg.event === 'project_assigned') {
        newNotif = {
          id: Date.now(),
          type: 'assignment',
          message: msg['message'] || `New assignment: <strong>${msg['title'] || 'A task'}</strong>`,
          time: new Date(),
          read: false
        };
      } else if (msg.event === 'task_updated' || msg.event === 'subtask_completed' || msg.event === 'subtask_created') {
        newNotif = {
          id: Date.now(),
          type: 'update',
          message: msg['message'] || `Update on: <strong>${msg['title'] || 'A task'}</strong>`,
          time: new Date(),
          read: false
        };
      } else if (msg.event === 'task_comment') {
        newNotif = {
          id: Date.now(),
          type: 'comment',
          message: `New comment on: <strong>${msg['title'] || 'A task'}</strong>`,
          time: new Date(),
          read: false
        };
      }

      if (newNotif) {
        this.notifications.update(n => [newNotif, ...n].slice(0, 20));
        this.updateUnreadCount();
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  onSearch() {
    if (this.searchQuery.trim().length > 1) {
      this.api.get<any[]>('/system/search', { q: this.searchQuery }).subscribe({
        next: results => this.searchResults.set(results),
        error: () => this.searchResults.set([])
      });
    } else {
      this.searchResults.set([]);
    }
  }

  onSearchEnter() {
    if (this.searchResults().length > 0) {
      this.navigateTo(this.searchResults()[0]);
    }
  }

  navigateTo(item: any) {
    this.searchQuery = '';
    this.searchResults.set([]);
    if (item.type === 'PROJECT') {
      this.router.navigate(['/projects']);
    } else if (item.type === 'TASK') {
      this.router.navigate(['/tasks']);
    } else if (item.type === 'USER') {
      this.router.navigate(['/team']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleNotifications() {
    this.notificationsOpen.update(val => !val);
    if (this.notificationsOpen()) {
      this.userDropdownOpen.set(false);
      this.calendarOpen.set(false);
    }
  }

  toggleUserDropdown() {
    this.userDropdownOpen.update(val => !val);
    if (this.userDropdownOpen()) {
      this.notificationsOpen.set(false);
      this.calendarOpen.set(false);
    }
  }

  toggleCalendar() {
    this.calendarOpen.update(val => !val);
    if (this.calendarOpen()) {
      this.notificationsOpen.set(false);
      this.userDropdownOpen.set(false);
    }
  }

  logout() {
    this.auth.logout();
  }

  markRead(notif: any) {
    if (!notif.read) {
      this.notifications.update(n => n.map(item => item.id === notif.id ? { ...item, read: true } : item));
      this.updateUnreadCount();
    }
  }

  markAllRead() {
    this.notifications.update(n => n.map(item => ({ ...item, read: true })));
    this.updateUnreadCount();
  }

  private updateUnreadCount() {
    this.unreadCount.set(this.notifications().filter(n => !n.read).length);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'assignment': return 'bg-blue';
      case 'update': return 'bg-green';
      case 'comment': return 'bg-purple';
      default: return 'bg-blue';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'assignment': return 'task';
      case 'update': return 'check_circle';
      case 'comment': return 'forum';
      default: return 'notifications';
    }
  }

  loadProjects() {
    this.api.get<any[]>('/projects').subscribe({
      next: res => {
        this.projects = res;
        this.generateCalendar();
        this.checkTodayProjects();
      }
    });
  }

  checkTodayProjects() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    this.projects.forEach(p => {
      if (p.assign_date) {
        const ad = new Date(p.assign_date);
        ad.setHours(0, 0, 0, 0);
        if (ad.getTime() === today.getTime()) count++;
      }
      if (p.delivery_time) {
        const dd = new Date(p.delivery_time);
        dd.setHours(0, 0, 0, 0);
        if (dd.getTime() === today.getTime()) count++;
      }
    });
    this.projectsToday.set(count);
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ date: null });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);

      let hasAssign = false;
      let hasDelivery = false;
      let assignProjects = '';
      let deliveryProjects = '';

      this.projects.forEach(p => {
        if (p.assign_date) {
          const ad = new Date(p.assign_date);
          if (ad.getFullYear() === year && ad.getMonth() === month && ad.getDate() === i) {
            hasAssign = true;
            assignProjects += p.name + '\\n';
          }
        }
        if (p.delivery_time) {
          const dd = new Date(p.delivery_time);
          if (dd.getFullYear() === year && dd.getMonth() === month && dd.getDate() === i) {
            hasDelivery = true;
            deliveryProjects += p.name + '\\n';
          }
        }
      });

      this.calendarDays.push({
        date: d,
        isToday: d.getTime() === today.getTime(),
        hasAssign,
        hasDelivery,
        assignProjects: assignProjects ? 'Assigned:\\n' + assignProjects : '',
        deliveryProjects: deliveryProjects ? 'Due:\\n' + deliveryProjects : ''
      });
    }
  }
}
