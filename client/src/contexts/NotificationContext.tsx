import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { notificationAPI } from '../services/api';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCounter, setNotificationCounter] = useState(0);

  // Fetch notifications from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const backendNotifications = await notificationAPI.getAll();
        // Map backend notifications to local Notification type
        const mapped = backendNotifications.map((n: any) => ({
          id: n._id,
          type: n.type || 'info',
          title: n.message,
          message: n.data && n.data.details ? n.data.details : '',
        }));
        setNotifications(mapped);
      } catch (e) {
        // Optionally handle error
      }
    })();
  }, []);

  // Listen for real-time organization notifications
  useEffect(() => {
    import('../services/socket').then(({ socketService }) => {
      const handler = (notification: any) => {
        // If org broadcast, show in bell and as toast
        if (notification.isOrgBroadcast) {
          addNotification({
            type: notification.type || 'info',
            title: notification.message || 'New Organization Notification',
            message: notification.data && notification.data.details ? notification.data.details : '',
          });
        } else if (notification._id) {
          // User-specific notification (from DB)
          addNotification({
            type: notification.type || 'info',
            title: notification.message || 'New Notification',
            message: notification.data && notification.data.details ? notification.data.details : '',
          });
        }
      };
      socketService.onOrganizationNotification(handler);
      return () => {
        socketService.removeAllListeners();
      };
    });
  }, []);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    // Create unique ID using timestamp + counter + random string to ensure uniqueness
    const id = `${Date.now()}-${notificationCounter}-${Math.random().toString(36).substr(2, 9)}`;
    setNotificationCounter(prev => prev + 1);
    
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll,
    }}>
      {children}
      {/* NotificationContainer removed: only dropdown will show notifications */}
    </NotificationContext.Provider>
  );
};

// Note: Org-wide (broadcast) notifications are only removed locally. User-specific notifications are marked as read in the backend via /api/notifications/mark-seen.

export default NotificationProvider;
