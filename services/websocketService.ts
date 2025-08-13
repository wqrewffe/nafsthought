import { Post } from '../types';

type WebSocketCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, WebSocketCallback[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    // Replace with your WebSocket server URL
    this.socket = new WebSocket('wss://your-websocket-server.com');

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        this.notifyListeners(type, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      setTimeout(() => this.connect(), 5000);
    };
  }

  public subscribe(type: string, callback: WebSocketCallback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);

    return () => this.unsubscribe(type, callback);
  }

  private unsubscribe(type: string, callback: WebSocketCallback) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyListeners(type: string, data: any) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  public send(type: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }
}

export const websocketService = new WebSocketService();
