import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Flag, Tag, MoreVertical, User, Paperclip, Edit, Trash2, CheckSquare, FolderOpen, ExternalLink } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Mock Task interface for the demo
interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  endDate?: Date | string;
  tags?: string[];
  projectId?: { name: string } | string;
  subtaskProgress?: { completed: number; total: number };
  assignedUsers?: Array<{ _id: string; name: string; email?: string }>;
}

interface TaskListViewProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>, skipSocketEmit?: boolean) => void;
}

// Mock UserAvatarList component
const UserAvatarList: React.FC<{
  users: Array<{ _id: string; name: string; email?: string }>;
  maxDisplay: number;
  size: string;
  showNames: boolean;
  className: string;
}> = ({ users, maxDisplay, className }) => {
  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <div className={`flex -space-x-1 ${className}`}>
      {displayUsers.map((user, index) => (
        <div
          key={user._id}
          className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-medium rounded-full border-2 border-white"
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white text-xs font-medium rounded-full border-2 border-white">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

const TaskListView: React.FC<TaskListViewProps> = ({ 
  tasks = [], 
  onEditTask, 
  onDeleteTask,
  onTaskUpdate 
}) => {
  const navigate = useNavigate();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'status' | 'dueDate'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const { theme } = useTheme();
  const darkMode = theme === 'dark';

  const priorityColors = {
    low: darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    medium: darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
    high: darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700',
    critical: darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700',
  };

  const statusColors = {
    'todo': darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700',
    'in-progress': darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700',
    'review': darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
    'done': darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    'blocked': darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
  };

  // Mock data for demo
  const mockTasks: Task[] = [
    {
      _id: '1',
      title: 'Implement user authentication',
      description: 'Add login and registration functionality with JWT tokens',
      status: 'in-progress',
      priority: 'high',
      endDate: new Date('2024-12-30'),
      tags: ['backend', 'security'],
      projectId: { name: 'Web App' },
      subtaskProgress: { completed: 3, total: 5 },
      assignedUsers: [
        { _id: '1', name: 'John Doe', email: 'john@example.com' },
        { _id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ]
    },
    {
      _id: '2',
      title: 'Design dashboard UI',
      description: 'Create wireframes and mockups for the main dashboard',
      status: 'review',
      priority: 'medium',
      endDate: new Date('2024-07-20'),
      tags: ['design', 'ui'],
      projectId: { name: 'Design System' },
      subtaskProgress: { completed: 2, total: 3 },
      assignedUsers: [
        { _id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
      ]
    },
    {
      _id: '3',
      title: 'Fix critical bug in payment processing',
      description: 'Urgent fix needed for payment gateway integration',
      status: 'todo',
      priority: 'critical',
      endDate: new Date('2024-07-15'),
      tags: ['bug', 'payment'],
      assignedUsers: []
    }
  ];

  const displayTasks = tasks.length > 0 ? tasks : mockTasks;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (endDate: Date | string | undefined, status: string) => {
    if (!endDate) return false;
    const today = new Date();
    const dueDate = new Date(endDate);
    today.setHours(23, 59, 59, 999);
    return dueDate < today && status !== 'done';
  };

  const getDueDateColor = (endDate: Date | string | undefined, status: string) => {
    if (isOverdue(endDate, status)) {
      return darkMode ? 'text-red-400 font-semibold bg-red-900/20' : 'text-red-600 font-semibold bg-red-50';
    }
    
    if (!endDate) return darkMode ? 'text-gray-400' : 'text-gray-500';
    
    const today = new Date();
    const dueDate = new Date(endDate);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) {
      return darkMode ? 'text-orange-400 font-medium bg-orange-900/20' : 'text-orange-600 font-medium bg-orange-50';
    }
    
    return darkMode ? 'text-gray-400' : 'text-gray-500';
  };

  const sortedTasks = [...displayTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'dueDate':
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        comparison = dateA - dateB;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: 'title' | 'priority' | 'status' | 'dueDate') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(displayTasks.map(task => task._id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleStatusChange = (
    taskId: string,
    newStatus: Task['status']
  ) => {
    onTaskUpdate?.(taskId, { status: newStatus }, false);
  };

  const handleDropdownAction = (task: Task, action: 'edit' | 'delete') => {
    setShowDropdown(null);
    if (action === 'edit') {
      onEditTask?.(task);
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        onDeleteTask?.(task);
      }
    }
  };

  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden transition-colors duration-300`}>
      {/* Table Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} px-4 py-3 border-b transition-colors duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedTasks.length === displayTasks.length && displayTasks.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className={`rounded ${darkMode ? 'border-gray-600 bg-gray-700 text-blue-500' : 'border-gray-300 text-blue-600'} focus:ring-blue-500`}
              />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedTasks.length > 0 ? `${selectedTasks.length} selected` : `${displayTasks.length} tasks`}
              </span>
            </div>
          </div>
          
          {selectedTasks.length > 0 && (
            <div className="flex items-center space-x-2">
              <button className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
                Bulk Edit
              </button>
              <button className={`text-sm ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}>
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full min-w-[800px]">
          <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} sticky top-0 z-10 transition-colors duration-300`}>
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th 
                className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} uppercase tracking-wider cursor-pointer transition-colors`}
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-1">
                  <span>Task</span>
                  {sortBy === 'title' && (
                    <span className={`${darkMode ? 'text-blue-400' : 'text-blue-500'} font-bold`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} uppercase tracking-wider cursor-pointer transition-colors`}
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortBy === 'status' && (
                    <span className={`${darkMode ? 'text-blue-400' : 'text-blue-500'} font-bold`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} uppercase tracking-wider cursor-pointer transition-colors`}
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center space-x-1">
                  <span>Priority</span>
                  {sortBy === 'priority' && (
                    <span className={`${darkMode ? 'text-blue-400' : 'text-blue-500'} font-bold`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                Tags
              </th>
              <th 
                className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'} uppercase tracking-wider cursor-pointer transition-colors`}
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Due Date</span>
                  {sortBy === 'dueDate' && (
                    <span className={`${darkMode ? 'text-blue-400' : 'text-blue-500'} font-bold`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                Progress
              </th>
              <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                Assigned
              </th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y transition-colors duration-300`}>
            {sortedTasks.map((task) => (              
              <tr 
                key={task._id} 
                className={`transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } ${
                  selectedTasks.includes(task._id) 
                    ? darkMode ? 'bg-blue-900/20' : 'bg-blue-50' 
                    : ''
                } ${
                  isOverdue(task.endDate, task.status) 
                    ? darkMode ? 'bg-red-900/20 border-l-4 border-red-500' : 'bg-red-50 border-l-4 border-red-400'
                    : ''
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task._id)}
                    onChange={(e) => handleTaskSelect(task._id, e.target.checked)}
                    className={`rounded ${darkMode ? 'border-gray-600 bg-gray-700 text-blue-500' : 'border-gray-300 text-blue-600'} focus:ring-blue-500`}
                  />
                </td>

                {/* Task Title with Overdue Indicator */}
                <td className="px-4 py-3">
                  <div 
                    className="cursor-pointer"
                    onClick={() => onEditTask?.(task)}
                  >
                    <div className={`text-sm font-medium ${darkMode ? 'hover:text-blue-400' : 'hover:text-blue-600'} flex items-center space-x-2 transition-colors ${
                      isOverdue(task.endDate, task.status) 
                        ? darkMode ? 'text-red-400' : 'text-red-700'
                        : darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      <span>{task.title}</span>
                      {isOverdue(task.endDate, task.status) && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                        }`}>
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 line-clamp-2`}>
                        {task.description}
                      </div>
                    )}
                    {task.projectId && typeof task.projectId === 'object' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <FolderOpen className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {(task.projectId as any).name}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task._id, e.target.value as Task['status'])}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-1 focus:ring-blue-500 ${statusColors[task.status as keyof typeof statusColors] || (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}`}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </td>

                {/* Tags */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {task.tags?.slice(0, 2).map((tag, index) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {task.tags && task.tags.length > 2 && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>

                {/* Due Date with Overdue Highlighting */}
                <td className="px-4 py-3">
                  <div className={`flex items-center space-x-1 text-sm px-2 py-1 rounded ${getDueDateColor(task.endDate, task.status)}`}>
                    <Calendar className={`w-4 h-4 ${
                      isOverdue(task.endDate, task.status) 
                        ? darkMode ? 'text-red-400' : 'text-red-600'
                        : darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <span>{formatDate(task.endDate)}</span>
                    {isOverdue(task.endDate, task.status) && (
                      <span className={`text-xs px-1 rounded font-semibold ${
                        darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
                      }`}>OVERDUE</span>
                    )}
                  </div>
                </td>

                {/* Progress */}
                <td className="px-4 py-3">
                  {task.subtaskProgress && task.subtaskProgress.total > 0 ? (
                    <div className="w-full">
                      <div className={`flex items-center justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                        <span>Subtasks</span>
                        <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
                      </div>
                      <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                        <div
                          className={`${darkMode ? 'bg-blue-500' : 'bg-blue-600'} h-2 rounded-full transition-all duration-300`}
                          style={{ 
                            width: `${(task.subtaskProgress.completed / task.subtaskProgress.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                  )}
                </td>

                {/* Assigned Users */}
                <td className="px-4 py-3">
                  <UserAvatarList
                    users={
                      task.assignedUsers && task.assignedUsers.length > 0
                        ? task.assignedUsers.filter(user => typeof user === 'object' && user._id) as Array<{ _id: string; name: string; email?: string }>
                        : []
                    }
                    maxDisplay={3}
                    size="sm"
                    showNames={false}
                    className="max-w-32"
                  />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(showDropdown === task._id ? null : task._id);
                      }}
                      className={`p-1 ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded transition-colors`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showDropdown === task._id && (
                      <div className={`absolute right-0 top-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-50 min-w-[120px] transition-colors duration-300`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDropdownAction(task, 'edit');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-2 transition-colors`}
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(null);
                            // navigate(`/tasks/${task._id}/edit`);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} flex items-center space-x-2 transition-colors`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Full Editor</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDropdownAction(task, 'delete');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'} flex items-center space-x-2 transition-colors`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {displayTasks.length === 0 && (
        <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}>
          <div className={`w-12 h-12 mx-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-4 transition-colors duration-300`}>
            <CheckSquare className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-1 transition-colors duration-300`}>
            No tasks found
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
            Get started by creating your first task.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskListView;
