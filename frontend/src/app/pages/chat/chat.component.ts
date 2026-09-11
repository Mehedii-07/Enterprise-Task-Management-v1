import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="chat-container glass-card">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="header-left">
          <div class="chat-channel-badge">
            <span class="channel-hash">#</span>
            <span class="material-symbols-outlined channel-icon">forum</span>
          </div>
          <div class="header-details">
            <div class="title-row">
              <h2>Global Team Chat</h2>
              <span class="channel-tag">General</span>
            </div>
            <div class="status-row">
              <span class="status-indicator" [class.online]="chatService.isConnected()">
                <span class="pulse-dot"></span>
                {{ chatService.isConnected() ? 'Connected • Live Sync' : 'Reconnecting...' }}
              </span>
              <span class="bullet">&bull;</span>
              <span class="message-counter">
                <span class="material-symbols-outlined mini-icon">chat</span>
                {{ chatService.messages().length }} Messages
              </span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <!-- Search Bar Toggle / Input -->
          <div class="search-box" [class.active]="isSearching">
            <span class="material-symbols-outlined search-icon" (click)="toggleSearch()">search</span>
            <input 
              *ngIf="isSearching"
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Search in chat..." 
              class="search-input"
              #searchInputEl
              (keydown.escape)="toggleSearch()">
            <span *ngIf="isSearching && searchQuery" class="material-symbols-outlined clear-search" (click)="searchQuery = ''">close</span>
          </div>

          <!-- Refresh History Button -->
          <button type="button" class="btn-icon" (click)="refreshChat()" title="Refresh Chat History">
            <span class="material-symbols-outlined" [class.spin]="isRefreshing">refresh</span>
          </button>
        </div>
      </div>

      <!-- Search Results Banner -->
      <div class="search-results-banner" *ngIf="isSearching && searchQuery.trim()">
        <span>
          <span class="material-symbols-outlined icon">filter_list</span>
          Found <strong>{{ getFilteredMessages().length }}</strong> matching message(s) for "<em>{{ searchQuery }}</em>"
        </span>
        <button type="button" class="btn-link" (click)="searchQuery = ''">Clear</button>
      </div>

      <!-- Chat Messages Scroll Container -->
      <div class="chat-messages" #scrollContainer (scroll)="onScroll($event)">
        <!-- Empty State -->
        <div class="empty-chat-state" *ngIf="chatService.messages().length === 0">
          <div class="empty-icon-wrap">
            <span class="material-symbols-outlined">waving_hand</span>
          </div>
          <h3>Welcome to Global Team Chat!</h3>
          <p>No messages here yet. Be the first to start the conversation and collaborate with your team in real time.</p>
          <div class="quick-prompts">
            <button type="button" class="prompt-chip" *ngFor="let p of quickPrompts" (click)="sendQuickPrompt(p)">
              {{ p }}
            </button>
          </div>
        </div>

        <!-- Messages Loop with Date Dividers -->
        <ng-container *ngFor="let msg of getFilteredMessages(); let i = index">
          <!-- Date Separator Divider -->
          <div class="date-divider" *ngIf="shouldShowDateDivider(i)">
            <div class="divider-line"></div>
            <div class="date-pill">
              <span class="material-symbols-outlined pill-icon">calendar_today</span>
              <span>{{ getDateDividerLabel(msg.created_at) }}</span>
            </div>
            <div class="divider-line"></div>
          </div>

          <!-- Message Row -->
          <div class="message-wrapper" 
               [class.own-message]="isOwnMessage(msg)"
               [attr.id]="'msg-' + msg.id">
            
            <!-- Other User Avatar (Left) -->
            <div class="avatar-wrap" *ngIf="!isOwnMessage(msg)">
              <img *ngIf="msg.user?.avatar_url && !isAvatarBroken(msg.user_id)" 
                   [src]="getAvatarUrl(msg.user?.avatar_url)" 
                   [alt]="msg.user?.first_name || 'User'"
                   class="avatar-img"
                   (error)="handleAvatarError(msg.user_id)">
              <div *ngIf="!msg.user?.avatar_url || isAvatarBroken(msg.user_id)" 
                   class="avatar-fallback"
                   [style.background]="getUserGradient(msg.user?.first_name || 'User')">
                {{ getInitials(msg.user) }}
              </div>
              <span class="avatar-online-dot"></span>
            </div>
            
            <!-- Message Content Body -->
            <div class="message-content">
              <!-- Message Meta Header -->
              <div class="message-meta" [class.own-meta]="isOwnMessage(msg)">
                <span class="sender-name" *ngIf="!isOwnMessage(msg)">
                  {{ msg.user?.first_name }} {{ msg.user?.last_name }}
                </span>
                <span class="sender-name own-label" *ngIf="isOwnMessage(msg)">
                  You
                </span>
                <span class="timestamp" [title]="msg.created_at | date:'full'">
                  <span class="material-symbols-outlined time-icon">schedule</span>
                  {{ formatMessageTimestamp(msg.created_at) }}
                </span>
              </div>
              
              <!-- Bubble with Quick Action Bar on Hover -->
              <div class="bubble-container">
                <div class="bubble">
                  {{ msg.message_text }}
                </div>

                <!-- Interactive Floating Reactions & Actions Toolbar -->
                <div class="message-toolbar">
                  <button type="button" 
                          class="toolbar-btn" 
                          *ngFor="let emoji of quickReactions" 
                          (click)="toggleReaction(msg.id, emoji)"
                          [title]="'React with ' + emoji">
                    {{ emoji }}
                  </button>
                  <button type="button" 
                          class="toolbar-btn copy-btn" 
                          (click)="copyMessage(msg)" 
                          title="Copy Message Text">
                    <span class="material-symbols-outlined">
                      {{ copiedMsgId === msg.id ? 'check' : 'content_copy' }}
                    </span>
                  </button>
                </div>
              </div>

              <!-- Reactions Display Row -->
              <div class="reactions-row" *ngIf="getReactionsFor(msg.id).length > 0">
                <button type="button" 
                        class="reaction-badge" 
                        *ngFor="let r of getReactionsFor(msg.id)"
                        [class.active]="hasUserReacted(msg.id, r.emoji)"
                        (click)="toggleReaction(msg.id, r.emoji)">
                  <span class="emoji">{{ r.emoji }}</span>
                  <span class="count">{{ r.count }}</span>
                </button>
              </div>
            </div>

            <!-- Own User Avatar (Right) -->
            <div class="avatar-wrap own-avatar-wrap" *ngIf="isOwnMessage(msg)">
              <img *ngIf="auth.currentUser()?.avatar_url && !isAvatarBroken(auth.currentUser()?.id || '')" 
                   [src]="getAvatarUrl(auth.currentUser()?.avatar_url)" 
                   [alt]="auth.currentUser()?.first_name || 'You'"
                   class="avatar-img"
                   (error)="handleAvatarError(auth.currentUser()?.id || '')">
              <div *ngIf="!auth.currentUser()?.avatar_url || isAvatarBroken(auth.currentUser()?.id || '')" 
                   class="avatar-fallback own-fallback"
                   [style.background]="getUserGradient(auth.currentUser()?.first_name || 'You')">
                {{ getInitials(auth.currentUser()) }}
              </div>
              <span class="avatar-online-dot"></span>
            </div>

          </div>
        </ng-container>
      </div>

      <!-- Floating Jump to Bottom Button -->
      <button type="button" 
              class="scroll-bottom-btn" 
              *ngIf="showScrollBottom" 
              (click)="scrollToBottom(true)"
              title="Jump to latest messages">
        <span class="material-symbols-outlined">arrow_downward</span>
        <span>Latest messages</span>
      </button>

      <!-- Interactive Input Area -->
      <div class="chat-input-area">
        <!-- Floating Emoji Picker Popover -->
        <div class="emoji-picker-tray glass-card" *ngIf="showEmojiPicker">
          <div class="tray-header">
            <span>Quick Emojis</span>
            <button type="button" class="close-tray" (click)="showEmojiPicker = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="emoji-grid">
            <button type="button" 
                    class="emoji-item" 
                    *ngFor="let em of extendedEmojis" 
                    (click)="insertEmoji(em)">
              {{ em }}
            </button>
          </div>
        </div>

        <form (ngSubmit)="sendMessage()" class="input-form">
          <!-- Emoji Toggle Button -->
          <button type="button" 
                  class="btn-input-action emoji-toggle-btn" 
                  (click)="showEmojiPicker = !showEmojiPicker"
                  [class.active]="showEmojiPicker"
                  title="Insert emoji">
            <span class="material-symbols-outlined">sentiment_satisfied</span>
          </button>

          <!-- Text Input -->
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="message" 
            placeholder="Type your message to the team... (Press Enter to send)" 
            autocomplete="off"
            class="form-control message-input"
            #messageInputEl
            [disabled]="!chatService.isConnected()">
          
          <!-- Send Button -->
          <button type="submit" 
                  class="send-btn" 
                  [disabled]="!newMessage.trim() || !chatService.isConnected()"
                  title="Send message">
            <span class="material-symbols-outlined">send</span>
          </button>
        </form>

        <!-- Quick suggestion prompt pills underneath input -->
        <div class="input-helpers" *ngIf="!newMessage.trim()">
          <span class="helper-label">Quick actions:</span>
          <button type="button" class="helper-pill" *ngFor="let p of quickPrompts.slice(0, 3)" (click)="sendQuickPrompt(p)">
            {{ p }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 180px);
      min-height: 520px;
      max-height: 900px;
      background: var(--bg-card);
      border-radius: 20px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
      position: relative;
    }

    /* Header */
    .chat-header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;

      .header-left {
        display: flex;
        align-items: center;
        gap: 14px;

        .chat-channel-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-primary), #0284C7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
          position: relative;

          .channel-hash {
            font-size: 1.1rem;
            font-weight: 800;
            display: none;
          }
          .channel-icon {
            font-size: 24px;
          }
        }

        .header-details {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .title-row {
            display: flex;
            align-items: center;
            gap: 8px;

            h2 {
              margin: 0;
              font-size: 1.15rem;
              color: var(--text-primary);
              font-weight: 700;
              letter-spacing: -0.01em;
            }

            .channel-tag {
              font-size: 0.7rem;
              padding: 2px 8px;
              border-radius: 6px;
              background: rgba(14, 165, 233, 0.15);
              color: var(--accent-primary);
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          }

          .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.78rem;
            color: var(--text-muted);

            .status-indicator {
              display: flex;
              align-items: center;
              gap: 6px;

              .pulse-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #EF4444;
              }

              &.online {
                color: #10B981;
                font-weight: 500;
                .pulse-dot {
                  background: #10B981;
                  box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
                  animation: pulseDot 2s infinite;
                }
              }
            }

            .bullet { opacity: 0.4; }

            .message-counter {
              display: flex;
              align-items: center;
              gap: 4px;
              .mini-icon { font-size: 14px; }
            }
          }
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;

        .search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 6px 12px;
          transition: all 0.25s ease;

          .search-icon {
            font-size: 18px;
            color: var(--text-muted);
            cursor: pointer;
            &:hover { color: var(--accent-primary); }
          }

          .search-input {
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 0.82rem;
            width: 150px;
            outline: none;
            &::placeholder { color: var(--text-muted); }
          }

          .clear-search {
            font-size: 16px;
            color: var(--text-muted);
            cursor: pointer;
            &:hover { color: #EF4444; }
          }

          &.active {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
          }
        }

        .btn-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            color: var(--accent-primary);
            border-color: var(--accent-primary);
            background: rgba(14, 165, 233, 0.08);
          }

          .material-symbols-outlined { font-size: 20px; }
          .spin { animation: spinAnim 1s linear infinite; }
        }
      }
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }

    @keyframes spinAnim {
      to { transform: rotate(360deg); }
    }

    /* Search Results Banner */
    .search-results-banner {
      background: rgba(14, 165, 233, 0.1);
      border-bottom: 1px solid rgba(14, 165, 233, 0.2);
      padding: 8px 24px;
      font-size: 0.82rem;
      color: var(--text-primary);
      display: flex;
      justify-content: space-between;
      align-items: center;

      span {
        display: flex;
        align-items: center;
        gap: 6px;
        .icon { font-size: 16px; color: var(--accent-primary); }
      }

      .btn-link {
        background: transparent;
        border: none;
        color: var(--accent-primary);
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 600;
        text-decoration: underline;
      }
    }

    /* Messages Area */
    .chat-messages {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }

    /* Empty State */
    .empty-chat-state {
      margin: auto;
      text-align: center;
      max-width: 440px;
      padding: 40px 20px;

      .empty-icon-wrap {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        background: rgba(14, 165, 233, 0.1);
        color: var(--accent-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;

        .material-symbols-outlined { font-size: 32px; }
      }

      h3 {
        font-size: 1.25rem;
        color: var(--text-primary);
        margin-bottom: 8px;
        font-weight: 700;
      }

      p {
        font-size: 0.88rem;
        color: var(--text-muted);
        line-height: 1.5;
        margin-bottom: 24px;
      }

      .quick-prompts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;

        .prompt-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 0.82rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: #fff;
            transform: translateY(-1px);
          }
        }
      }
    }

    /* Date Separator Divider */
    .date-divider {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 16px 0 12px;
      user-select: none;

      .divider-line {
        flex: 1;
        height: 1px;
        background: var(--border-color);
      }

      .date-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-color);
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 0.74rem;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;

        .pill-icon { font-size: 13px; color: var(--accent-primary); }
      }
    }

    /* Message Wrapper */
    .message-wrapper {
      display: flex;
      gap: 12px;
      max-width: 82%;
      position: relative;
      transition: transform 0.15s ease;

      /* Avatar */
      .avatar-wrap {
        position: relative;
        flex-shrink: 0;
        align-self: flex-end;
        margin-bottom: 2px;

        .avatar-img {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          display: block;
        }

        .avatar-fallback {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.12);
          text-transform: uppercase;
        }

        .avatar-online-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10B981;
          border: 2px solid var(--bg-card);
        }

        &.own-avatar-wrap {
          .avatar-img, .avatar-fallback {
            border-color: rgba(14, 165, 233, 0.4);
          }
        }
      }

      /* Content */
      .message-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        .message-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.76rem;
          padding: 0 4px;

          .sender-name {
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: -0.01em;

            &.own-label {
              color: var(--accent-primary);
            }
          }

          .timestamp {
            color: var(--text-muted);
            font-size: 0.72rem;
            display: flex;
            align-items: center;
            gap: 3px;

            .time-icon { font-size: 13px; opacity: 0.7; }
          }

          &.own-meta {
            justify-content: flex-end;
          }
        }

        /* Bubble Container with Hover Toolbar */
        .bubble-container {
          position: relative;

          .bubble {
            padding: 12px 18px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            border-radius: 18px;
            border-bottom-left-radius: 4px;
            font-size: 0.92rem;
            line-height: 1.55;
            word-break: break-word;
            border: 1px solid rgba(255, 255, 255, 0.07);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            position: relative;
          }

          /* Floating Reaction Toolbar */
          .message-toolbar {
            position: absolute;
            top: -26px;
            right: 8px;
            display: none;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 3px 6px;
            gap: 4px;
            align-items: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            z-index: 10;

            .toolbar-btn {
              background: transparent;
              border: none;
              font-size: 0.95rem;
              padding: 2px 6px;
              border-radius: 8px;
              cursor: pointer;
              transition: transform 0.15s;

              &:hover {
                transform: scale(1.3);
                background: rgba(255, 255, 255, 0.1);
              }

              &.copy-btn {
                color: var(--text-muted);
                display: flex;
                align-items: center;
                .material-symbols-outlined { font-size: 16px; }
                &:hover { color: var(--accent-primary); }
              }
            }
          }

          &:hover .message-toolbar {
            display: flex;
          }
        }

        /* Reactions Row */
        .reactions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
          padding: 0 4px;

          .reaction-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 0.75rem;
            cursor: pointer;
            color: var(--text-primary);
            transition: all 0.2s;

            .emoji { font-size: 0.85rem; }
            .count { font-weight: 700; font-size: 0.75rem; }

            &:hover {
              background: rgba(14, 165, 233, 0.15);
              border-color: var(--accent-primary);
            }

            &.active {
              background: rgba(14, 165, 233, 0.25);
              border-color: var(--accent-primary);
              color: var(--accent-primary);
            }
          }
        }
      }

      /* Own Message Styling (Right Aligned) */
      &.own-message {
        align-self: flex-end;
        flex-direction: row-reverse;

        .message-content {
          align-items: flex-end;

          .bubble {
            background: linear-gradient(135deg, #0284C7, #0EA5E9);
            color: #ffffff;
            border-bottom-right-radius: 4px;
            border-bottom-left-radius: 18px;
            border: none;
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25);
          }

          .message-toolbar {
            right: auto;
            left: 8px;
          }
        }
      }
    }

    /* Floating Scroll-to-Bottom Button */
    .scroll-bottom-btn {
      position: absolute;
      bottom: 84px;
      right: 28px;
      background: linear-gradient(135deg, var(--accent-primary), #0284C7);
      color: #fff;
      border: none;
      border-radius: 24px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(14, 165, 233, 0.35);
      z-index: 20;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(14, 165, 233, 0.45);
      }

      .material-symbols-outlined { font-size: 16px; }
    }

    /* Input Area */
    .chat-input-area {
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(12px);
      position: relative;
      flex-shrink: 0;

      /* Emoji Tray Popover */
      .emoji-picker-tray {
        position: absolute;
        bottom: 74px;
        left: 24px;
        width: 320px;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 12px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(20px);
        z-index: 30;

        .tray-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);

          .close-tray {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0;
            &:hover { color: var(--text-primary); }
            .material-symbols-outlined { font-size: 16px; }
          }
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;

          .emoji-item {
            background: transparent;
            border: none;
            font-size: 1.35rem;
            padding: 6px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
              transform: scale(1.2);
            }
          }
        }
      }

      .input-form {
        display: flex;
        gap: 10px;
        align-items: center;

        .btn-input-action {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;

          &:hover, &.active {
            color: var(--accent-primary);
            border-color: var(--accent-primary);
            background: rgba(14, 165, 233, 0.1);
          }

          .material-symbols-outlined { font-size: 22px; }
        }

        .message-input {
          flex: 1;
          background: var(--bg-body);
          border: 1px solid var(--border-color);
          padding: 13px 20px;
          border-radius: 14px;
          color: var(--text-primary);
          font-size: 0.92rem;
          transition: all 0.2s;

          &:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
          }

          &::placeholder {
            color: var(--text-muted);
          }
        }

        .send-btn {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-primary), #0284C7);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);

          &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
          }

          &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            box-shadow: none;
          }

          .material-symbols-outlined { font-size: 20px; }
        }
      }

      .input-helpers {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        overflow-x: auto;
        padding-bottom: 2px;

        .helper-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .helper-pill {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 3px 10px;
          font-size: 0.74rem;
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;

          &:hover {
            background: rgba(14, 165, 233, 0.1);
            border-color: var(--accent-primary);
            color: var(--accent-primary);
          }
        }
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .chat-container {
        height: calc(100dvh - 140px);
        min-height: 400px;
        border-radius: 14px;
      }
      .chat-header {
        padding: 12px 16px;
        .header-left .chat-channel-badge { width: 36px; height: 36px; .channel-icon { font-size: 20px; } }
        .header-left .header-details .title-row h2 { font-size: 1rem; }
        .header-actions .search-box .search-input { width: 100px; }
      }
      .chat-messages {
        padding: 16px 12px;
        gap: 12px;
      }
      .message-wrapper {
        max-width: 92%;
        .avatar-wrap .avatar-img, .avatar-wrap .avatar-fallback { width: 32px; height: 32px; font-size: 0.75rem; }
        .message-content .bubble { font-size: 0.86rem; padding: 10px 14px; }
      }
      .chat-input-area {
        padding: 12px 14px;
        .input-helpers { display: none; }
        .emoji-picker-tray { left: 12px; right: 12px; width: auto; }
      }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  auth = inject(AuthService);
  
  newMessage = '';
  searchQuery = '';
  isSearching = false;
  isRefreshing = false;
  showEmojiPicker = false;
  showScrollBottom = false;
  copiedMsgId: number | null = null;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('messageInputEl') private messageInputEl!: ElementRef;

  // Set of broken avatar user_ids to trigger fallback initials
  brokenAvatars = new Set<string>();

  // In-memory reactions: { [msgId]: { [emoji]: count } }
  reactionsMap: { [msgId: number]: { [emoji: string]: number } } = {};
  userReactions: { [msgId: number]: Set<string> } = {};

  quickReactions = ['👍', '❤️', '🔥', '🚀', '🎉', '😄'];
  extendedEmojis = [
    '👍', '🙌', '❤️', '🔥', '🚀', '💡', 
    '✅', '🎉', '👏', '😄', '🤝', '👀', 
    '💯', '🎯', '⭐', '⚡', '💬', '📌'
  ];

  quickPrompts = [
    '👋 Say Hello',
    '🚀 Project Update',
    '🤝 Quick Team Sync',
    '✅ Task Completed'
  ];

  private shouldAutoScroll = true;

  ngOnInit() {
    this.chatService.resetUnreadCount();
    this.chatService.fetchHistory();
    this.initDefaultReactions();
  }

  ngOnDestroy() {
    // Connection is globally managed
  }

  ngAfterViewChecked() {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.showEmojiPicker && !target.closest('.emoji-picker-tray') && !target.closest('.emoji-toggle-btn')) {
      this.showEmojiPicker = false;
    }
  }

  onScroll(event: Event) {
    const el = this.scrollContainer.nativeElement;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user is scrolled up more than 150px, show "Jump to bottom" button
    this.showScrollBottom = distanceToBottom > 150;
    this.shouldAutoScroll = distanceToBottom < 80;
  }

  scrollToBottom(force: boolean = false): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        if (force) {
          this.showScrollBottom = false;
          this.shouldAutoScroll = true;
        }
      }
    } catch(err) { }
  }

  refreshChat() {
    this.isRefreshing = true;
    this.chatService.fetchHistory();
    setTimeout(() => {
      this.isRefreshing = false;
      this.scrollToBottom(true);
    }, 600);
  }

  toggleSearch() {
    this.isSearching = !this.isSearching;
    if (!this.isSearching) {
      this.searchQuery = '';
    }
  }

  getFilteredMessages(): ChatMessage[] {
    const all = this.chatService.messages();
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter(m => 
      (m.message_text && m.message_text.toLowerCase().includes(q)) ||
      (m.user?.first_name && m.user.first_name.toLowerCase().includes(q)) ||
      (m.user?.last_name && m.user.last_name.toLowerCase().includes(q))
    );
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const currentId = this.auth.currentUser()?.id;
    return Boolean(currentId && msg.user_id === currentId);
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (text) {
      this.chatService.sendMessage(text);
      this.newMessage = '';
      this.showEmojiPicker = false;
      this.shouldAutoScroll = true;
      setTimeout(() => this.scrollToBottom(true), 100);
    }
  }

  sendQuickPrompt(prompt: string) {
    let cleanText = prompt.replace(/^[\p{Emoji}\s]+/u, '').trim();
    if (prompt.includes('Say Hello')) {
      cleanText = 'Hello team! 👋';
    } else if (prompt.includes('Project Update')) {
      cleanText = 'Quick project update: Everything is moving forward on schedule 🚀';
    } else if (prompt.includes('Team Sync')) {
      cleanText = 'Hey everyone, let us have a quick progress sync 🤝';
    } else if (prompt.includes('Task Completed')) {
      cleanText = 'All assigned tasks and subtasks for this sprint have been completed! ✅';
    }
    this.chatService.sendMessage(cleanText);
    this.shouldAutoScroll = true;
    setTimeout(() => this.scrollToBottom(true), 100);
  }

  insertEmoji(emoji: string) {
    this.newMessage += (this.newMessage ? ' ' : '') + emoji;
    this.showEmojiPicker = false;
    if (this.messageInputEl) {
      this.messageInputEl.nativeElement.focus();
    }
  }

  copyMessage(msg: ChatMessage) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(msg.message_text).then(() => {
      this.copiedMsgId = msg.id;
      setTimeout(() => {
        if (this.copiedMsgId === msg.id) {
          this.copiedMsgId = null;
        }
      }, 2000);
    });
  }

  /* Date Helpers */
  shouldShowDateDivider(index: number): boolean {
    const messages = this.getFilteredMessages();
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (!prev?.created_at || !curr?.created_at) return false;

    const prevDate = new Date(prev.created_at).toDateString();
    const currDate = new Date(curr.created_at).toDateString();
    return prevDate !== currDate;
  }

  getDateDividerLabel(dateStr: string): string {
    if (!dateStr) return 'Today';
    const msgDate = new Date(dateStr);
    const now = new Date();

    if (this.isSameDay(msgDate, now)) {
      return 'Today';
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(msgDate, yesterday)) {
      return 'Yesterday';
    }

    // Format: e.g. Friday, Sep 5, 2026
    return msgDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatMessageTimestamp(dateStr: string): string {
    if (!dateStr) return '';
    const msgDate = new Date(dateStr);
    const now = new Date();

    const timeStr = msgDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (this.isSameDay(msgDate, now)) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(msgDate, yesterday)) {
      return `Yesterday, ${timeStr}`;
    }

    const dateFormatted = msgDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${dateFormatted} • ${timeStr}`;
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /* Avatar Helpers */
  getAvatarUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  }

  handleAvatarError(userId?: string) {
    if (userId) {
      this.brokenAvatars.add(userId);
    }
  }

  isAvatarBroken(userId?: string): boolean {
    return !userId || this.brokenAvatars.has(userId);
  }

  getInitials(user?: any): string {
    if (!user) return 'U';
    const first = (user.first_name || '')[0] || '';
    const last = (user.last_name || '')[0] || '';
    return (first + last).toUpperCase() || 'U';
  }

  getUserGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #0EA5E9, #3B82F6)',
      'linear-gradient(135deg, #10B981, #059669)',
      'linear-gradient(135deg, #F59E0B, #D97706)',
      'linear-gradient(135deg, #8B5CF6, #6D28D9)',
      'linear-gradient(135deg, #EC4899, #BE185D)',
      'linear-gradient(135deg, #06B6D4, #0891B2)'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  }

  /* Reactions Helpers */
  private initDefaultReactions() {
    // Seed some initial friendly reactions if empty
    this.reactionsMap = {};
  }

  toggleReaction(msgId: number, emoji: string) {
    if (!this.reactionsMap[msgId]) {
      this.reactionsMap[msgId] = {};
    }
    if (!this.userReactions[msgId]) {
      this.userReactions[msgId] = new Set<string>();
    }

    const userSet = this.userReactions[msgId];
    if (userSet.has(emoji)) {
      // Remove reaction
      userSet.delete(emoji);
      this.reactionsMap[msgId][emoji] = Math.max(0, (this.reactionsMap[msgId][emoji] || 1) - 1);
      if (this.reactionsMap[msgId][emoji] === 0) {
        delete this.reactionsMap[msgId][emoji];
      }
    } else {
      // Add reaction
      userSet.add(emoji);
      this.reactionsMap[msgId][emoji] = (this.reactionsMap[msgId][emoji] || 0) + 1;
    }
  }

  hasUserReacted(msgId: number, emoji: string): boolean {
    return Boolean(this.userReactions[msgId]?.has(emoji));
  }

  getReactionsFor(msgId: number): { emoji: string; count: number }[] {
    const map = this.reactionsMap[msgId];
    if (!map) return [];
    return Object.keys(map)
      .filter(e => map[e] > 0)
      .map(emoji => ({ emoji, count: map[emoji] }));
  }
}
