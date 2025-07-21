import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, FolderOpen, CheckSquare, FileText, Settings, X, Users,
  BarChart3, Building2, UserCog, Crown, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed, onCollapseToggle }) => {
  const { user } = useAuth();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'org_admin';
  const hasOrganization = user?.organization;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Teams', href: '/teams', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText },
    ...(isAdmin ? [
      { name: 'User Management', href: '/users', icon: UserCog },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ] : []),
    ...(user?.role === 'super_admin' ? [
      { name: 'All Organizations', href: '/organizations', icon: Building2 },
    ] : []),
    ...(hasOrganization ? [
      { name: 'Organization', href: '/organization', icon: Building2 },
    ] : [
      { name: 'Create Organization', href: '/organization/create', icon: Building2 },
    ]),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden"
          onClick={onClose}
        />
      )}
      <div className={`
        flex flex-col bg-white shadow-xl border-r border-gray-200 h-full w-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen 
          ? 'fixed inset-y-0 left-0 z-50 translate-x-0 lg:relative lg:translate-x-0' 
          : 'fixed inset-y-0 left-0 z-50 -translate-x-full lg:relative lg:translate-x-0'
        }
      `}>
        <div className={`flex h-16 items-center border-b border-gray-200 flex-shrink-0 ${collapsed ? 'justify-center' : 'px-4 justify-between'}`}>
          <div className={`flex items-center space-x-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="text-xl font-bold text-gray-900">TaskFlow</span>}
          </div>
          <div className="flex items-center">
            <button
              onClick={onCollapseToggle}
              className={`hidden lg:inline-flex p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" /></svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className={`flex-1 px-2 py-4 space-y-2 overflow-y-auto`}>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
              title={collapsed ? item.name : undefined}
            >
              {/* THIS IS THE KEY CHANGE FOR THE ICON */}
              <item.icon className={`h-5 w-5 flex-shrink-0 ${!collapsed ? 'mr-3' : ''}`} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-200 p-4 ${collapsed ? 'p-2' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
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
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;