import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Flag, Tag, MoreVertical, User, Paperclip, Edit, Trash2, CheckSquare, FolderOpen, ExternalLink } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import UserAvatarList from '../UI/UserAvatarList';

interface TaskListViewProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>, skipSocketEmit?: boolean) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  tasks, 
  onEditTask, 
  onDeleteTask,
  onTaskUpdate 
}) => {
  const navigate = useNavigate();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'priority' | 'status' | 'dueDate'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const priorityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const statusColors = {
    'todo': 'bg-slate-100 text-slate-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    'review': 'bg-yellow-100 text-yellow-700',
    'done': 'bg-green-100 text-green-700',
    'blocked': 'bg-red-100 text-red-700'
  };
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (endDate: Date | string | undefined, status: string) => {
    if (!endDate) return false;
    const today = new Date();
    const dueDate = new Date(endDate);
    today.setHours(23, 59, 59, 999); // End of today
    return dueDate < today && status !== 'done';
  };

  const getDueDateColor = (endDate: Date | string | undefined, status: string) => {
    if (isOverdue(endDate, status)) {
      return 'text-red-600 font-semibold bg-red-50';
    }
    
    if (!endDate) return 'text-gray-500';
    
    const today = new Date();
    const dueDate = new Date(endDate);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) {
      return 'text-orange-600 font-medium bg-orange-50'; // Due today or tomorrow
    }
    
    return 'text-gray-500';
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const sortedTasks = [...tasks].sort((a, b) => {
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
      setSelectedTasks(tasks.map(task => task._id));
    } else {
      setSelectedTasks([]);
    }
  };
  const handleStatusChange = (taskId: string, newStatus: string) => {
    onTaskUpdate?.(taskId, { status: newStatus }, false); // false means don't skip socket emit
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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTasks.length === tasks.length && tasks.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedTasks.length > 0 ? `${selectedTasks.length} selected` : `${tasks.length} tasks`}
            </span>
          </div>
          
          {selectedTasks.length > 0 && (
            <div className="flex items-center space-x-2">
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Bulk Edit
              </button>
              <button className="text-sm text-red-600 hover:text-red-700">
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>      {/* Table Content */}
      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-8 px-4 py-3"></th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-1">
                  <span>Task</span>
                  {sortBy === 'title' && (
                    <span className="text-blue-500 font-bold">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortBy === 'status' && (
                    <span className="text-blue-500 font-bold">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center space-x-1">
                  <span>Priority</span>
                  {sortBy === 'priority' && (
                    <span className="text-blue-500 font-bold">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Due Date</span>
                  {sortBy === 'dueDate' && (
                    <span className="text-blue-500 font-bold">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned
              </th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map((task) => (              <tr 
                key={task._id} 
                className={`hover:bg-gray-50 transition-colors ${
                  selectedTasks.includes(task._id) ? 'bg-blue-50' : ''
                } ${
                  isOverdue(task.endDate, task.status) ? 'bg-red-50 border-l-4 border-red-400' : ''
                }`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task._id)}
                    onChange={(e) => handleTaskSelect(task._id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>                {/* Task Title with Overdue Indicator */}
                <td className="px-4 py-3">
                  <div 
                    className="cursor-pointer"
                    onClick={() => onEditTask?.(task)}
                  >
                    <div className={`text-sm font-medium hover:text-blue-600 flex items-center space-x-2 ${
                      isOverdue(task.endDate, task.status) ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      <span>{task.title}</span>
                      {isOverdue(task.endDate, task.status) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                    {task.projectId && typeof task.projectId === 'object' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <FolderOpen className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
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
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 focus:ring-1 focus:ring-blue-500 ${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}
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
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {task.tags && task.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>                {/* Due Date with Overdue Highlighting */}
                <td className="px-4 py-3">
                  <div className={`flex items-center space-x-1 text-sm px-2 py-1 rounded ${getDueDateColor(task.endDate, task.status)}`}>
                    <Calendar className={`w-4 h-4 ${isOverdue(task.endDate, task.status) ? 'text-red-600' : 'text-gray-400'}`} />
                    <span>{formatDate(task.endDate)}</span>
                    {isOverdue(task.endDate, task.status) && (
                      <span className="text-xs bg-red-100 text-red-700 px-1 rounded font-semibold">OVERDUE</span>
                    )}
                  </div>
                </td>

                {/* Progress */}
                <td className="px-4 py-3">
                  {task.subtaskProgress && task.subtaskProgress.total > 0 ? (
                    <div className="w-full">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Subtasks</span>
                        <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(task.subtaskProgress.completed / task.subtaskProgress.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
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
                </td>                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(showDropdown === task._id ? null : task._id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                      {showDropdown === task._id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDropdownAction(task, 'edit');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(null);
                            navigate(`/tasks/${task._id}/edit`);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Full Editor</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDropdownAction(task, 'delete');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
      {tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CheckSquare className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No tasks found</h3>
          <p className="text-sm text-gray-500">Get started by creating your first task.</p>
        </div>
      )}
    </div>
  );
};

export default TaskListView;
