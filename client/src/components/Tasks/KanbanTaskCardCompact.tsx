import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Flag, Tag, MoreVertical, User, Paperclip, Edit, Trash2 } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';

interface KanbanTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onEdit, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const priorityDots = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const categoryColors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-indigo-100 text-indigo-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-cyan-100 text-cyan-700',
  ];

  const getCategoryColor = (tag: string, index: number) => {
    return categoryColors[index % categoryColors.length];
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) {
      e.stopPropagation();
      onEdit?.(task);
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
      className="bg-white rounded-md border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-blue-200 transition-all duration-200 group relative"
      onClick={handleCardClick}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2" {...listeners}>
        <div className="flex items-center space-x-1.5">
          <div className={`w-2 h-2 rounded-full ${priorityDots[task.priority]}`} />
          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority]} font-medium`}>
            {task.priority.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-2">        <div className="relative">
          <button 
            onClick={handleActionClick}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-opacity cursor-pointer"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-opacity cursor-pointer"
          >
            <Edit className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(task);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-opacity cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="card-content cursor-pointer">
        {/* Compact Title */}
        <h4 className="font-medium text-gray-900 text-sm mb-1.5 line-clamp-2 leading-4">
          {task.title}
        </h4>

        {/* Categories/Tags - Compact */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(tag, index)}`}
              >
                {tag.length > 8 ? tag.substring(0, 8) + '...' : tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Compact Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            {/* Due Date */}
            {task.endDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">{formatDate(task.endDate)}</span>
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
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {task.assignedUsers.length}
            </div>
          )}
        </div>
      </div>

      {/* Click hint overlay */}
      <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-blue-50 bg-opacity-20 rounded-md transition-opacity pointer-events-none flex items-center justify-center">
        <div className="bg-white text-xs text-gray-600 px-2 py-1 rounded shadow-sm border">
          Click to edit
        </div>
      </div>
    </div>
  );
};

export default KanbanTaskCard;
