import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  connect(token?: string) {
    const serverUrl = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        // Server forcefully disconnected, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, 1000 * this.reconnectAttempts);
    }
  }

  // Task related events
  onTaskUpdate(callback: (task: any) => void) {
    this.socket?.on('task:updated', callback);
  }

  onTaskCreate(callback: (task: any) => void) {
    this.socket?.on('task:created', callback);
  }

  onTaskDelete(callback: (taskId: string) => void) {
    this.socket?.on('task:deleted', callback);
  }

  // Column related events
  onColumnsUpdate(callback: (columns: any[]) => void) {
    this.socket?.on('columns:updated', callback);
  }

  // Join/leave project rooms for targeted updates
  joinProject(projectId: string) {
    this.socket?.emit('join:project', projectId);
  }

  leaveProject(projectId: string) {
    this.socket?.emit('leave:project', projectId);
  }

  // Emit task status change for real-time updates
  emitTaskStatusChange(taskId: string, newStatus: string, projectId?: string) {
    this.socket?.emit('task:status:change', { taskId, newStatus, projectId });
  }

  // Clean up all listeners
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
