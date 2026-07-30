import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface WsMessage {
  event: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket!: WebSocket;
  public messages$ = new Subject<WsMessage>();
  private reconnectInterval = 5000;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    this.socket = new WebSocket('ws://localhost:8000/api/v1/ws/events');

    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      this.isConnecting = false;
    };

    this.socket.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        this.messages$.next(data);
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed. Reconnecting...');
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.socket.close();
    };
  }
}
