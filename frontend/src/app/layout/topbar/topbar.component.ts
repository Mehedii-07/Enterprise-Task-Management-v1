import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="topbar">
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input 
          type="text" 
          placeholder="Global search across users, tasks, projects..." 
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
        />
        <div class="search-results-dropdown" *ngIf="searchResults().length > 0">
          <div class="search-result-item" *ngFor="let item of searchResults()">
            <span class="type-tag">{{ item.type }}</span>
            <div class="details">
              <span class="title">{{ item.title }}</span>
              <span class="subtitle">{{ item.subtitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-actions">
        <div class="notification-wrapper">
          <button class="icon-btn">
            <span class="material-symbols-outlined">notifications</span>
            <span class="unread-dot"></span>
          </button>
        </div>

        <div class="user-menu">
          <span class="role-badge badge badge-role">{{ auth.userRole() }}</span>
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

        &:focus { border-color: var(--accent-primary); }
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

      .icon-btn {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;

        .unread-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: var(--accent-danger);
          border-radius: 50%;
        }
      }
    }
  `]
})
export class TopbarComponent {
  api = inject(ApiService);
  auth = inject(AuthService);

  searchQuery = '';
  searchResults = signal<any[]>([]);

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
}
