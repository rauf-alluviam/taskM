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
}

const UserAvatarList: React.FC<UserAvatarListProps> = ({
  users,
  maxDisplay = 3,
  size = 'sm',
  showNames = false,
  className = ''
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

  if (showNames) {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {displayUsers.map((user, index) => (
          <div
            key={user._id}
            className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1"
            title={user.email || user.name}
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
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-1">
        {displayUsers.map((user, index) => (
          <div
            key={user._id}
            className={`${sizeClasses[size]} ${getAvatarColor(user.name)} rounded-full flex items-center justify-center text-white font-medium border-2 border-white cursor-help`}
            title={`${user.name}${user.email ? ` (${user.email})` : ''}`}
            style={{ zIndex: users.length - index }}
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
  );
};

export default UserAvatarList;
