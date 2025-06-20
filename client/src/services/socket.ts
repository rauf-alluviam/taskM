import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectionTimeout: NodeJS.Timeout | null = null;
    connect(token?: string) {
    const serverUrl = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5001';
    
    console.log('🔌 Attempting to connect to socket server:', serverUrl);
    console.log('🔧 Environment check:', {
      VITE_SOCKET_URL: (import.meta as any).env.VITE_SOCKET_URL,
      VITE_API_URL: (import.meta as any).env.VITE_API_URL,
      serverUrl,
      token: token ? 'present' : 'missing'
    });
    
    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Disconnect existing connection if any
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      this.reconnectAttempts = 0;
      // Clear connection timeout on successful connect
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        // Server forcefully disconnected, try to reconnect after delay
        this.connectionTimeout = setTimeout(() => {
          this.socket?.connect();
        }, 2000);
      }
    });    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      console.error('🔧 Debug info:', {
        serverUrl,
        errorType: (error as any).type || 'unknown',
        errorMessage: error.message,
        description: (error as any).description || 'No description'
      });
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure the server is running on:', serverUrl);
      console.error('   2. Check if server allows CORS from client origin');
      console.error('   3. Verify server socket.io is properly configured');
      this.handleReconnect();
    });

    return this.socket;
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      this.connectionTimeout = setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Socket connection failed.');
      console.error('💡 Please check if the server is running and accessible.');
    }
  }

  // Test connection method for debugging
  async testConnection(): Promise<boolean> {
    const serverUrl = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5001';
    console.log('🧪 Testing connection to:', serverUrl);
    
    try {
      // Try a simple fetch to the server first
      const response = await fetch(serverUrl.replace('/socket.io', '') + '/api/health');
      if (response.ok) {
        console.log('✅ Server HTTP endpoint is reachable');
        return true;
      } else {
        console.error('❌ Server HTTP endpoint returned:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Cannot reach server:', error);
      return false;
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
