import React from 'react';
import { Menu, Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onQuickTask: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onQuickTask }) => {
  const { logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

         
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onQuickTask}
            className="btn-primary btn-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Task
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full"></span>
          </button>

          <div className="relative">
            <button
              onClick={logout}
              className="flex items-center space-x-2 p-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
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