import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Calendar, Flag, Tag, MoreVertical, User, Paperclip, Edit, Trash2, CheckSquare, ExternalLink } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import UserAvatarList from '../UI/UserAvatarList';

interface KanbanTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onEdit, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleCloseDropdowns = () => setShowDropdown(false);
    document.addEventListener('closeDropdowns', handleCloseDropdowns);
    return () => document.removeEventListener('closeDropdowns', handleCloseDropdowns);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  // Add tracking for double click
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const priorityDots = {
    low: 'bg-green-500 dark:bg-green-400',
    medium: 'bg-yellow-500 dark:bg-yellow-400',
    high: 'bg-orange-500 dark:bg-orange-400',
    critical: 'bg-red-500 dark:bg-red-400',
  };

  const categoryColors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  ];

  const getCategoryColor = (tag: string, index: number) => {
    return categoryColors[index % categoryColors.length];
  };
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (endDate: Date | string | undefined) => {
    if (!endDate) return false;
    const today = new Date();
    const dueDate = new Date(endDate);
    today.setHours(23, 59, 59, 999); // End of today
    return dueDate < today && task.status !== 'done';
  };

  const getDueDateColor = (endDate: Date | string | undefined) => {
    if (isOverdue(endDate)) {
      return 'text-red-600 font-semibold dark:text-red-400';
    }
    
    if (!endDate) return 'text-gray-500 dark:text-gray-400';
    
    const today = new Date();
    const dueDate = new Date(endDate);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) {
      return 'text-orange-600 font-medium dark:text-orange-400'; // Due today or tomorrow
    }
    
    return 'text-gray-500 dark:text-gray-400';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) {
      e.stopPropagation();
      
      setClickCount(prev => prev + 1);
      
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
      
      const timer = setTimeout(() => {
        if (clickCount === 0) {
          // Single click action
          onEdit?.(task);
        }
        setClickCount(0);
      }, 250); // 250ms threshold for double click detection
      
      setClickTimer(timer);
      
      if (clickCount === 1) {
        // Double click detected - navigate to full editor
        clearTimeout(clickTimer as ReturnType<typeof setTimeout>);
        setClickCount(0);
        navigate(`/tasks/${task._id}/edit`);
      }
    }
  };
  
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    onEdit?.(task);
  };

  const handleEditPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    navigate(`/tasks/${task._id}/edit`);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      onDelete?.(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white dark:bg-gray-800 rounded-md border ${
        isOverdue(task.endDate) 
          ? 'border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20 animate-pulse-slow' 
          : 'border-gray-200 dark:border-gray-700'
      } p-2 mb-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-600 transition-all duration-200 group relative ${
        isOverdue(task.endDate) ? 'shadow-sm' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Ultra Compact Header */}
      <div className="flex items-center justify-between mb-1.5" {...listeners}>
        <div className="flex items-center space-x-1">
          <div className={`w-1.5 h-1.5 rounded-full ${priorityDots[task.priority]}`} />
          <span className={`text-xs px-1 py-0.5 rounded ${priorityColors[task.priority]} font-medium`}>
            {task.priority.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="relative">
            <button 
              onClick={handleActionClick}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-opacity cursor-pointer"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-xl z-50 min-w-[140px]">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Edit className="w-3 h-3" />
                  <span>Quick Edit</span>
                </button>
                <button
                  onClick={handleEditPage}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Full Editor</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="card-content cursor-pointer">
        {/* Ultra Compact Title with Overdue Indicator */}
        <div className={`font-medium text-sm mb-1 line-clamp-2 leading-4 ${
          isOverdue(task.endDate) ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
        }`}>
          <div className="flex items-start justify-between">
            <h4 className="flex-1">{task.title}</h4>
            {isOverdue(task.endDate) && (
              <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex-shrink-0">
                OVERDUE
              </span>
            )}
          </div>
        </div>

        {/* Subtask Progress */}
        {task.subtaskProgress && task.subtaskProgress.total > 0 && (
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <div className="flex items-center space-x-1">
                <CheckSquare className="w-3 h-3" />
                <span>Subtasks</span>
              </div>
              <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-primary-600 dark:bg-primary-500 h-1 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(task.subtaskProgress.completed / task.subtaskProgress.total) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Categories/Tags - Ultra Compact */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${getCategoryColor(tag, index)}`}
              >
                {tag.length > 6 ? tag.substring(0, 6) + '...' : tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Ultra Compact Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            {/* Due Date with Overdue Highlighting */}
            {task.endDate && (
              <div className={`flex items-center space-x-1 ${getDueDateColor(task.endDate)}`}>
                <Calendar className={`w-3 h-3 ${isOverdue(task.endDate) ? 'text-red-600 dark:text-red-400' : ''}`} />
                <span className="text-xs">{formatDate(task.endDate)}</span>
                {isOverdue(task.endDate) && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1 rounded">OVERDUE</span>
                )}
              </div>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Assigned Users Avatar */}
          {task.assignedUsers && task.assignedUsers.length > 0 && (
            <UserAvatarList
              users={
                task.assignedUsers.filter(user => typeof user === 'object' && user._id) as Array<{ _id: string; name: string; email?: string }>
              }
              maxDisplay={2}
              size="sm"
              showNames={false}
            />
          )}
        </div>
      </div>

      {/* Click hint overlay */}
      <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-blue-50 dark:bg-blue-900/20 bg-opacity-20 rounded-md transition-opacity pointer-events-none flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-700">
          Click to edit
        </div>
      </div>
    </div>
  );
};

export default KanbanTaskCard;