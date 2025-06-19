import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token?: string) {
    const serverUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    
    this.socket = io(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
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
