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
  Sun
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
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<UpdateUserForm>();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let data: UserData[] = [];
      console.log('Organization id:', user?.organization?._id);
      if (user?.role === 'super_admin') {
        const response = await userAPI.getAllUsers();
        data = Array.isArray(response) ? response : [];
      } else if (user?.role === 'org_admin' && user.organization?._id) {
        const response = await userAPI.getUsersByOrganization(user.organization._id);
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

  const toggleDropdown = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === userId ? null : userId);
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
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
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
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
                        <span className="text-sm text-gray-900 dark:text-gray-100">{getRoleName(userData.role)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userData.status)}`}>
                          {userData.status}
                        </span>
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
                              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50 min-w-[140px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownOpen(null);
                                    openEditModal(userData);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                {user?.role === 'super_admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDropdownOpen(null);
                                      handleDeleteUser(userData);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
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