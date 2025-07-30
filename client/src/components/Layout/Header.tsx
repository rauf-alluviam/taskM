import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ThemeToggleButton from '../UI/ThemeToggleButton';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { notificationAPI } from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
  onQuickTask: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onQuickTask }) => {
  const { logout } = useAuth();
  const { notifications, removeNotification, clearAll } = useNotification();
  const unreadCount = notifications.length;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [markAllSuccess, setMarkAllSuccess] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent<HTMLButtonElement>) => {

     console.log('Event fired:', e.type); // DEBUG
  console.log('Notifications length:', notifications.length); // DEBUG
  console.log('Button disabled?', notifications.length === 0); // DEBUG
  
  e.preventDefault();
  e.stopPropagation();
  
    console.log('Mark All as Read button clicked'); // DEBUG
    
    // Collect user-specific notification IDs (MongoDB ObjectId format)
    const userNotificationIds = notifications
      .filter(n => /^[a-f\d]{24}$/i.test(n.id))
      .map(n => n.id);
    
    if (userNotificationIds.length > 0) {
      try {
        await notificationAPI.markAllAsSeen(userNotificationIds);
        setMarkAllSuccess(true);
        setTimeout(() => setMarkAllSuccess(false), 2000);
      } catch (error) {
        console.error('Failed to mark notifications as seen:', error);
        // Optionally show error or fallback to local removal
      }
    }
    
    clearAll();
    setDropdownOpen(false); // Close dropdown after marking all as read
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-40">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggleButton />
          <button
            onClick={onQuickTask}
            className="btn-primary btn-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Task
          </button>

          <div className="relative">
            <button
              ref={bellRef}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md relative"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-error-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 font-semibold text-gray-900 dark:text-white">
                  Notifications
                </div>
                {markAllSuccess && (
                  <div className="p-2 text-green-600 bg-green-50 border-b border-green-200 text-center text-xs font-semibold">
                    All notifications marked as read!
                  </div>
                )}
                {notifications.length === 0 ? (
                  <div className="p-4 text-gray-500 dark:text-gray-400 text-center">No notifications</div>
                ) : (
                  <>
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                      {notifications.slice(0, 20).map((notification) => (
                        <li key={notification.id} className="flex items-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                          <div className="flex-shrink-0 mt-1 mr-3">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</div>
                            {notification.message && (
                              <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{notification.message}</div>
                            )}
                          </div>
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            aria-label="Dismiss notification"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="p-2 border-t border-gray-100 dark:border-slate-700 text-center">
                      <button
                        //onClick={handleMarkAllAsRead}
                          onMouseDown={handleMarkAllAsRead}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-3 py-1 rounded border border-blue-200 bg-blue-50 dark:bg-slate-700 dark:border-blue-700 dark:text-blue-300"
                        disabled={notifications.length === 0}
                      >
                        Mark All as Read
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={logout}
              className="flex items-center space-x-2 p-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-700 rounded-md"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;