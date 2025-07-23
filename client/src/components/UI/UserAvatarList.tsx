import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarListProps {
  users: Array<{
    _id: string;
    name: string;
    email?: string;
  }>;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
  className?: string;
  onUserClick?: (user: { _id: string; name: string; email?: string }) => void;
  selectedUserId?: string | null; // for backward compatibility
  selectedUserIds?: string[]; // for multi-select
  onMultiSelectChange?: (userIds: string[]) => void; // callback for multi-select
  multiSelect?: boolean; // enable multi-select mode
}

const UserAvatarList: React.FC<UserAvatarListProps> = ({
  users,
  maxDisplay = 3,
  size = 'sm',
  showNames = false,
  className = '',
  onUserClick,
  selectedUserId,
  selectedUserIds = [],
  onMultiSelectChange,
  multiSelect = false
}) => {
  if (!users || users.length === 0) {
    return (
      <div className={`flex items-center space-x-1 text-gray-400 ${className}`}>
        <User className="w-4 h-4" />
        <span className="text-sm">Unassigned</span>
      </div>
    );
  }

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Multi-select logic
  const isMulti = multiSelect && Array.isArray(selectedUserIds) && typeof onMultiSelectChange === 'function';
  const selectedIds = isMulti ? selectedUserIds : selectedUserId ? [selectedUserId] : [];

  const handleAvatarClick = (user: { _id: string; name: string; email?: string }) => {
    if (isMulti) {
      let newIds;
      if (selectedIds.includes(user._id)) {
        newIds = selectedIds.filter(id => id !== user._id);
      } else {
        newIds = [...selectedIds, user._id];
      }
      onMultiSelectChange(newIds);
    } else if (onUserClick) {
      onUserClick(user);
    }
  };

  // Select All/Clear logic
  const handleSelectAll = () => {
    if (isMulti) {
      onMultiSelectChange(users.map(u => u._id));
    }
  };
  const handleClear = () => {
    if (isMulti) {
      onMultiSelectChange([]);
    }
  };

  if (showNames) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {isMulti && (
          <div className="flex gap-2 mb-1">
            <button type="button" className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={handleSelectAll}>Select All</button>
            <button type="button" className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={handleClear}>Clear</button>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {displayUsers.map((user, index) => (
            <div
              key={user._id}
              className={`flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1 ${selectedIds.includes(user._id) ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : ''}`}
              title={user.email || user.name}
              onClick={() => handleAvatarClick(user)}
              style={{ cursor: onUserClick || isMulti ? 'pointer' : 'default' }}
            >
              <div
                className={`${sizeClasses[size]} ${getAvatarColor(user.name)} rounded-full flex items-center justify-center text-white font-medium`}
              >
                {getInitials(user.name)}
              </div>
              <span className="text-xs text-gray-700 max-w-20 truncate">
                {user.name}
              </span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
              <div className={`${sizeClasses[size]} bg-gray-400 rounded-full flex items-center justify-center text-white font-medium`}>
                +{remainingCount}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {isMulti && (
        <div className="flex gap-2 mb-1">
          <button type="button" className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={handleSelectAll}>Select All</button>
          <button type="button" className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={handleClear}>Clear</button>
        </div>
      )}
      <div className="flex items-center">
        <div className="flex -space-x-1">
          {displayUsers.map((user, index) => (
            <div
              key={user._id}
              className={`${sizeClasses[size]} ${getAvatarColor(user.name)} rounded-full flex items-center justify-center text-white font-medium border-2 border-white ${selectedIds.includes(user._id) ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : ''}`}
              title={`${user.name}${user.email ? ` (${user.email})` : ''}`}
              style={{ zIndex: users.length - index, cursor: onUserClick || isMulti ? 'pointer' : 'default' }}
              onClick={() => handleAvatarClick(user)}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {remainingCount > 0 && (
            <div
              className={`${sizeClasses[size]} bg-gray-400 rounded-full flex items-center justify-center text-white font-medium border-2 border-white cursor-help`}
              title={`${remainingCount} more users: ${users.slice(maxDisplay).map(u => u.name).join(', ')}`}
              style={{ zIndex: 0 }}
            >
              +{remainingCount}
            </div>
          )}
        </div>
        {users.length > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {users.length === 1 ? users[0].name : `${users.length} users`}
          </span>
        )}
      </div>
    </div>
  );
};

export default UserAvatarList;
