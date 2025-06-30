import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  CheckSquare, 
  FileText, 
  Settings,
  X,
  Users,
  BarChart3,
  Building2,
  UserCog,
  Crown,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  // Check user permissions for navigation items
  const isAdmin = user?.role === 'super_admin' || user?.role === 'org_admin';
  const isTeamLead = user?.role === 'team_lead';
  const hasOrganization = user?.organization;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(user?.role === 'super_admin' ? [
      { name: 'All Organizations', href: '/organizations', icon: Building2 },
    ] : []),
    ...(hasOrganization ? [
      { name: 'Organization', href: '/organization', icon: Building2 },
      { name: 'Teams', href: '/teams', icon: Users },
    ] : [
      { name: 'Create Organization', href: '/organization/create', icon: Building2 },
    ]),
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Documents', href: '/documents', icon: FileText },
    ...(isAdmin ? [
      { name: 'User Management', href: '/users', icon: UserCog },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ] : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white shadow-xl border-r border-gray-200 h-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen 
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0 lg:relative lg:h-full' 
          : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0 lg:h-full'
        }
      `}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TaskFlow</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name}
                  </p>
                  {user?.role === 'super_admin' && <Crown className="w-4 h-4 text-yellow-600" />}
                  {user?.role === 'org_admin' && <Shield className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.role?.replace('_', ' ')} 
                  {user?.organization && ` • ${user.organization.name}`}
                </p>
                {user?.teams && user.teams.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {user.teams.length} team{user.teams.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;