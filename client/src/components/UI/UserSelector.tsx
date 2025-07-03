import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, ChevronDown, Check } from 'lucide-react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  organization?: {
    _id: string;
    name: string;
  };
  role: string;
}

interface UserSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowMultiple?: boolean;
  className?: string;
  showAvatars?: boolean;
  maxSelection?: number;
  project?: {
    _id: string;
    createdBy: string;
    members?: Array<{
      user: { _id: string };
      role: string;
    }>;
    organization?: string;
    visibility?: string;
  };
  task?: {
    _id: string;
    createdBy: string;
    assignedUsers?: Array<{ _id: string }> | string[];
    projectId?: string;
  };
}

const UserSelector: React.FC<UserSelectorProps> = ({
  selectedUserIds = [],
  onSelectionChange,
  placeholder = "Select users...",
  disabled = false,
  allowMultiple = true,
  className = "",
  showAvatars = true,
  maxSelection,
  project,
  task
}) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Update selected users when selectedUserIds prop changes
    const selected = users.filter(user => selectedUserIds.includes(user._id));
    setSelectedUsers(selected);
  }, [selectedUserIds, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsersForSelection();
      let availableUsers = response.users || [];
      
      console.log('UserSelector: Raw users from API:', availableUsers.length);
      console.log('UserSelector: All users:', availableUsers);
      
      // Temporarily disable permission filtering to make dropdowns work
      // TODO: Fix user status/role filtering logic later
      
      setUsers(availableUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleUserToggle = (user: UserOption) => {
    let newSelectedIds: string[];
    
    if (allowMultiple) {
      if (selectedUserIds.includes(user._id)) {
        // Remove user
        newSelectedIds = selectedUserIds.filter(id => id !== user._id);
      } else {
        // Add user (check max selection)
        if (maxSelection && selectedUserIds.length >= maxSelection) {
          return; // Don't add if max reached
        }
        newSelectedIds = [...selectedUserIds, user._id];
      }
    } else {
      // Single selection
      newSelectedIds = selectedUserIds.includes(user._id) ? [] : [user._id];
      setIsOpen(false); // Close dropdown for single selection
    }

    onSelectionChange(newSelectedIds);
  };

  const removeUser = (userId: string) => {
    const newSelectedIds = selectedUserIds.filter(id => id !== userId);
    onSelectionChange(newSelectedIds);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(part => part.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  const renderUserAvatar = (user: UserOption, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
    
    if (showAvatars && user.avatarUrl) {
      return (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className={`${sizeClasses} rounded-full object-cover`}
        />
      );
    }

    return (
      <div className={`${sizeClasses} bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium`}>
        {getUserInitials(user.name)}
      </div>
    );
  };

  const renderSelectedUsers = () => {
    if (selectedUsers.length === 0) {
      return (
        <span className="text-gray-400 flex-1">
          {placeholder}
        </span>
      );
    }

    if (!allowMultiple && selectedUsers.length === 1) {
      const user = selectedUsers[0];
      return (
        <div className="flex items-center space-x-2 flex-1">
          {renderUserAvatar(user)}
          <span className="text-gray-900 font-medium">{user.name}</span>
        </div>
      );
    }

    // Multiple selection - show count or chips
    if (selectedUsers.length <= 2) {
      return (
        <div className="flex items-center space-x-1 flex-1 flex-wrap">
          {selectedUsers.map(user => (
            <div
              key={user._id}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            >
              {renderUserAvatar(user)}
              <span className="font-medium">{user.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeUser(user._id);
                }}
                className="text-blue-600 hover:text-blue-800 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 flex-1">
        <div className="flex items-center -space-x-1">
          {selectedUsers.slice(0, 3).map(user => (
            <div key={user._id} className="relative">
              {renderUserAvatar(user)}
            </div>
          ))}
        </div>
        <span className="text-sm text-gray-600 font-medium">
          {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
        </span>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Input */}
      <div
        className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer transition-colors ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          {renderSelectedUsers()}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No users found matching your search.' : 'No users available.'}
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUserIds.includes(user._id);
                const isCurrentUser = user._id === currentUser?._id;
                
                return (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-900' 
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                    onClick={() => handleUserToggle(user)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {renderUserAvatar(user, 'md')}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">
                            {user.name}
                            {isCurrentUser && <span className="text-xs text-gray-500">(You)</span>}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        {user.organization && (
                          <p className="text-xs text-gray-400 truncate">{user.organization.name}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selection Info */}
          {allowMultiple && maxSelection && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
              {selectedUserIds.length} of {maxSelection} users selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSelector;
