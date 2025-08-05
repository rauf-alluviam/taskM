import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Crown,
  Shield,
  User,
  Mail,
  Clock,
  Moon,
  Sun,
  RefreshCw,
  FolderOpen,
  Settings,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { organizationAPI, userAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';

// Theme Context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {}
});

const useTheme = () => React.useContext(ThemeContext);

// Theme Provider Component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'org_admin' | 'team_lead' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  organization?: {
    _id: string;
    name: string;
  };
  teams: Array<{
    team: {
      _id: string;
      name: string;
    };
    role: string;
  }>;
  projects?: Array<{
    _id: string;
    name: string;
    role: string;
    status: string;
    department?: string;
    isOwner: boolean;
    joinedAt?: string;
  }>;
  projectStats?: {
    total: number;
    owned: number;
    adminOf: number;
    memberOf: number;
  };
  lastActive: string;
  createdAt: string;
}

interface UpdateUserForm {
  name: string;
  email: string;
  role: 'org_admin' | 'team_lead' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { isDark, toggleTheme } = useTheme();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectsDropdownRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<UpdateUserForm>();

  useEffect(() => {
    // Only load users if user is authenticated and fully loaded
    if (user) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
      if (projectsDropdownRef.current && !projectsDropdownRef.current.contains(event.target as Node)) {
        setProjectsDropdownOpen(null);
      }
    };

    if (dropdownOpen || projectsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen, projectsDropdownOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Early return if user is not loaded yet
      if (!user) {
        console.log('User not loaded yet, skipping user fetch');
        setLoading(false);
        return;
      }
      
      let data: UserData[] = [];
      console.log('Full User object structure:', JSON.stringify(user, null, 2));
      console.log('User object:', user);
      console.log('Organization:', user?.organization);
      console.log('Organization id:', user?.organization?._id);
      console.log('User role:', user?.role);
      console.log('User _id:', user?._id);
      
      // Use enhanced endpoint that includes project information
      if (user?.role === 'super_admin' || user?.role === 'org_admin') {
        const response = await userAPI.getEnhancedUsers();
        data = Array.isArray(response) ? response : [];
      } else {
        data = [];
      }
      
      setUsers(data);
    } catch (error) {
      setUsers([]);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users',
      });
    } finally {
      setLoading(false);
    }
  };

  const onUpdateUser = async (data: UpdateUserForm) => {
    if (!selectedUser || !selectedUser._id) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No user selected for update.',
      });
      return;
    }
    setUpdating(true);
    try {
      const updatedUser = await userAPI.updateUser(selectedUser._id, data);
      setUsers(users.map(u => u._id === selectedUser._id ? { ...u, ...updatedUser } : u));
      setShowEditModal(false);
      setSelectedUser(null);
      addNotification({
        type: 'success',
        title: 'User Updated',
        message: `${selectedUser.name} has been updated successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update user',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userData: UserData) => {
    if (!confirm(`Are you sure you want to delete ${userData.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await userAPI.deleteUser(userData._id);
      setUsers(users.filter(u => u._id !== userData._id));
      addNotification({
        type: 'success',
        title: 'User Deleted',
        message: `${userData.name} has been deleted successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete user',
      });
    }
  };

  const openEditModal = (userData: UserData) => {
    setSelectedUser(userData);
    setValue('name', userData.name);
    setValue('email', userData.email);
    setValue('role', userData.role === 'super_admin' ? 'org_admin' : userData.role);
    setValue('status', userData.status);
    setShowEditModal(true);
  };

  const toggleProjectsDropdown = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setProjectsDropdownOpen(projectsDropdownOpen === userId ? null : userId);
    // Close the actions dropdown if it's open
    setDropdownOpen(null);
  };

  const toggleDropdown = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === userId ? null : userId);
    // Close the projects dropdown if it's open
    setProjectsDropdownOpen(null);
  };

  const filteredUsers = Array.isArray(users) ? users.filter(userData =>
    userData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'org_admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
      case 'org_admin':
        return <Crown className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'team_lead':
        return <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      default:
        return <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Organization Admin';
      case 'team_lead':
        return 'Team Lead';
      case 'member':
        return 'Member';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
          <p className="text-gray-500 dark:text-gray-400">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header with Theme Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage {user?.organization ? 'organization' : 'system'} users and permissions
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Refresh user data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Users Table */}
          {filteredUsers.length > 0 ? (
            <div className="bg-white  dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 relative ">
              <div className="overflow-x-auto">
                <table className="min-w-full  divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Teams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((userData) => (
                    <tr key={userData._id || userData.email} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {userData.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{userData.name}</p>
                              {getRoleIcon(userData.role)}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{getRoleName(userData.role)}</span>
                          {canManageUsers && userData._id !== user?._id && (
                            <button
                              onClick={() => openEditModal(userData)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Edit role"
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userData.status)}`}>
                          {userData.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {userData.projects && userData.projects.length > 0 ? (
                          <div className="space-y-2">
                            {/* Project Count and Quick Stats */}
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                  <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {userData.projectStats?.total || userData.projects.length}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  project{(userData.projectStats?.total || userData.projects.length) !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              {/* Expandable Button */}
                              <div className="relative">
                                <button
                                  onClick={(e) => toggleProjectsDropdown(userData._id, e)}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Details
                                </button>
                                
                                {projectsDropdownOpen === userData._id && (
                                  <div 
                                    ref={projectsDropdownRef}
                                    className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-[9999] min-w-[340px] max-w-[420px] max-h-[450px] overflow-y-auto"
                                    style={{ zIndex: 9999 }}
                                  >
                                    {/* Enhanced Project Stats Header */}
                                    {userData.projectStats && (
                                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900/50 dark:to-gray-800/50">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                                          <FolderOpen className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                          {userData.name}'s Projects
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                                  {userData.projectStats.owned}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Owned</div>
                                              </div>
                                              <Crown className="w-4 h-4 text-green-500 dark:text-green-400" />
                                            </div>
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                                  {userData.projectStats.adminOf}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Admin</div>
                                              </div>
                                              <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                            </div>
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                  {userData.projectStats.memberOf}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Member</div>
                                              </div>
                                              <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                            </div>
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                                                  {userData.projectStats.total}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                                              </div>
                                              <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Enhanced Projects List */}
                                    <div className="p-4 space-y-3">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Recent Projects
                                      </h5>
                                      {userData.projects.slice(0, 6).map((project) => (
                                        <div
                                          key={project._id}
                                          className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                        >
                                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div className={`p-2 rounded-lg transition-colors ${
                                              project.isOwner 
                                                ? 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50' 
                                                : project.role === 'admin'
                                                ? 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50'
                                                : 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50'
                                            }`}>
                                              <FolderOpen className={`w-4 h-4 ${
                                                project.isOwner 
                                                  ? 'text-green-600 dark:text-green-400' 
                                                  : project.role === 'admin'
                                                  ? 'text-purple-600 dark:text-purple-400'
                                                  : 'text-blue-600 dark:text-blue-400'
                                              }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {project.name}
                                              </div>
                                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {project.department && (
                                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                                    {project.department}
                                                  </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full capitalize ${
                                                  project.status === 'active' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : project.status === 'completed'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                  {project.status}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="ml-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                              project.isOwner
                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700'
                                                : project.role === 'admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                                            }`}>
                                              {project.isOwner ? (
                                                <>
                                                  <Crown className="w-3 h-3 mr-1" />
                                                  Owner
                                                </>
                                              ) : project.role === 'admin' ? (
                                                <>
                                                  <Shield className="w-3 h-3 mr-1" />
                                                  Admin
                                                </>
                                              ) : (
                                                <>
                                                  <User className="w-3 h-3 mr-1" />
                                                  {project.role}
                                                </>
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                      {userData.projects.length > 6 && (
                                        <div className="text-center py-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                          <FolderOpen className="w-4 h-4 inline mr-2" />
                                          +{userData.projects.length - 6} more projects
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Compact Role Summary Badges */}
                            {userData.projectStats && (userData.projectStats.owned > 0 || userData.projectStats.adminOf > 0) && (
                              <div className="flex flex-wrap gap-1">
                                {userData.projectStats.owned > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                                    <Crown className="w-3 h-3 mr-1" />
                                    {userData.projectStats.owned} owned
                                  </span>
                                )}
                                {userData.projectStats.adminOf > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                                    <Shield className="w-3 h-3 mr-1" />
                                    {userData.projectStats.adminOf} admin
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-gray-400 dark:text-gray-500">
                            <FolderOpen className="w-4 h-4" />
                            <span>No projects</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userData.teams.length > 0 ? (
                          <div className="space-y-1">
                            {userData.teams.slice(0, 2).map((teamMember) => (
                              <div key={teamMember.team._id} className="text-xs text-gray-600 dark:text-gray-400">
                                {teamMember.team.name} ({teamMember.role})
                              </div>
                            ))}
                            {userData.teams.length > 2 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                +{userData.teams.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No teams</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(userData.lastActive).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {userData._id !== user?._id && (
                          <div className="relative" ref={dropdownOpen === userData._id ? dropdownRef : null}>
                            <button 
                              onClick={(e) => toggleDropdown(userData._id, e)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {dropdownOpen === userData._id && (
                              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-xl z-[9999] min-w-[140px]" style={{ zIndex: 9999 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownOpen(null);
                                    openEditModal(userData);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit User</span>
                                </button>
                                {user?.role === 'super_admin' && (
                                  <>
                                    <div className="my-1 border-t border-gray-200 dark:border-gray-600"></div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownOpen(null);
                                        handleDeleteUser(userData);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete User</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Users will appear here once they join the organization'
                }
              </p>
            </div>
          )}

          {/* Edit User Modal */}
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title={`Edit User - ${selectedUser?.name}`}
            size="md"
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
              <form onSubmit={handleSubmit(onUpdateUser)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Name *
                  </label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Email *
                  </label>
                  <input
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Role *
                  </label>
                  <select 
                    {...register('role', { required: 'Role is required' })} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  >
                    {user?.role === 'super_admin' && (
                      <option value="org_admin">Organization Admin</option>
                    )}
                    <option value="team_lead">Team Lead</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Status *
                  </label>
                  <select 
                    {...register('status', { required: 'Status is required' })} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {updating ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;