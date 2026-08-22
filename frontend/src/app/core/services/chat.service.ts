import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id: number;
  user_id: string;
  message_text: string;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private socket: WebSocket | null = null;
  
  messages = signal<ChatMessage[]>([]);
  isConnected = signal<boolean>(false);
  unreadCount = signal<number>(0);

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = `ws://localhost:8000/api/v1/ws/chat?token=${token}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected.set(true);
      this.fetchHistory();
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'chat_message') {
          this.messages.update(msgs => [...msgs, payload.data]);
          if (this.router.url !== '/chat') {
            this.unreadCount.update(c => c + 1);
          }
        }
      } catch (e) {
        console.error('Error parsing websocket message', e);
      }
    };

    this.socket.onclose = () => {
      this.isConnected.set(false);
      // Optional: Auto reconnect
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  fetchHistory() {
    this.api.get<ChatMessage[]>('/chat/messages').subscribe(data => {
      this.messages.set(data);
    });
  }

  resetUnreadCount() {
    this.unreadCount.set(0);
  }

  sendMessage(text: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ message_text: text }));
    }
  }
}
