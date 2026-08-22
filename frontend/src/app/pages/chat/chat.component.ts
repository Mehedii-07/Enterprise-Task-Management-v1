import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-info">
          <div class="chat-logo-icon">
            <span class="material-symbols-outlined">forum</span>
          </div>
          <div class="header-title">
            <h2>Global Team Chat</h2>
            <span class="status-indicator" [class.online]="chatService.isConnected()">
              {{ chatService.isConnected() ? 'Connected' : 'Reconnecting...' }}
            </span>
          </div>
        </div>
      </div>

      <div class="chat-messages" #scrollContainer>
        <div class="message-wrapper" 
             *ngFor="let msg of chatService.messages()"
             [class.own-message]="msg.user_id === auth.currentUser()?.id">
          
          <div class="avatar" *ngIf="msg.user_id !== auth.currentUser()?.id">
            {{ (msg.user?.first_name?.[0] || '') + (msg.user?.last_name?.[0] || 'U') }}
          </div>
          
          <div class="message-content">
            <div class="message-meta" *ngIf="msg.user_id !== auth.currentUser()?.id">
              <span class="sender-name">{{ msg.user?.first_name }} {{ msg.user?.last_name }}</span>
              <span class="timestamp">{{ msg.created_at | date:'shortTime' }}</span>
            </div>
            
            <div class="bubble">
              {{ msg.message_text }}
            </div>
            
            <div class="message-meta own-meta" *ngIf="msg.user_id === auth.currentUser()?.id">
              <span class="timestamp">{{ msg.created_at | date:'shortTime' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <form (ngSubmit)="sendMessage()" class="input-form">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="message" 
            placeholder="Type your message..." 
            autocomplete="off"
            class="form-control"
            [disabled]="!chatService.isConnected()">
          
          <button type="submit" class="btn btn-primary send-btn" [disabled]="!newMessage.trim() || !chatService.isConnected()">
            <span class="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 40px); /* Adjust based on your layout padding */
      max-height: 800px;
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .chat-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.02);

      .header-info {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .chat-logo-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          
          .material-symbols-outlined {
            font-size: 24px;
          }
        }

        .header-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
          
          h2 { margin: 0; font-size: 1.2rem; color: var(--text-primary); font-weight: 600; line-height: 1.1; }
          
          .status-indicator {
            font-size: 0.8rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;

            &::before {
              content: '';
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--text-muted);
            }

            &.online {
              color: var(--accent-success);
              &::before { background: var(--accent-success); box-shadow: 0 0 8px var(--accent-success); }
            }
          }
        }
      }
    }

    .chat-messages {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .message-wrapper {
      display: flex;
      gap: 12px;
      max-width: 80%;

      &.own-message {
        align-self: flex-end;
        flex-direction: row-reverse;

        .bubble {
          background: var(--accent-primary);
          color: #fff;
          border-bottom-right-radius: 4px;
          border-bottom-left-radius: 16px;
        }
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--bg-card-hover);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.85rem;
        flex-shrink: 0;
        border: 1px solid var(--border-color);
      }

      .message-content {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .message-meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.75rem;

          .sender-name { font-weight: 600; color: var(--text-secondary); }
          .timestamp { color: var(--text-muted); }

          &.own-meta { justify-content: flex-end; }
        }

        .bubble {
          padding: 12px 16px;
          background: var(--bg-card-hover);
          color: var(--text-primary);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          font-size: 0.95rem;
          line-height: 1.5;
          word-break: break-word;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
      }
    }

    .chat-input-area {
      padding: 20px 24px;
      border-top: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.02);

      .input-form {
        display: flex;
        gap: 12px;

        .form-control {
          flex: 1;
          background: var(--bg-body);
          border: 1px solid var(--border-color);
          padding: 14px 20px;
          border-radius: 24px;
          color: var(--text-primary);
          transition: all 0.2s;

          &:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        }

        .send-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;

          .material-symbols-outlined { font-size: 1.2rem; }
        }
      }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  auth = inject(AuthService);
  
  newMessage = '';
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngOnInit() {
    this.chatService.resetUnreadCount();
    this.chatService.fetchHistory();
  }

  ngOnDestroy() {
    // Connection is now managed globally by LayoutComponent
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
    }
  }
}
