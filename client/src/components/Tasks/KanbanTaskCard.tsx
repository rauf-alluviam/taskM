import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Flag, Tag, MoreVertical, User, Paperclip } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import UserAvatarList from '../UI/UserAvatarList';

interface KanbanTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, onEdit }) => {
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
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const priorityDots = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const categoryColors = [
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
    'bg-cyan-100 text-cyan-800',
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
    // Only trigger edit if not clicking on the drag handle or action button
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) {
      e.stopPropagation();
      onEdit?.(task);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition-all duration-200 group relative"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3" {...listeners}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${priorityDots[task.priority]}`} />
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
            <Flag className="w-3 h-3 mr-1" />
            {task.priority}
          </span>
        </div>
        <button 
          onClick={handleActionClick}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-opacity cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Content area that triggers edit on click */}
      <div className="card-content cursor-pointer">
        {/* Title */}
        <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-5">
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-gray-600 text-xs mb-3 line-clamp-2 leading-4">
            {task.description}
          </p>
        )}

        {/* Categories/Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(tag, index)}`}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {/* Due Date */}
            {task.endDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(task.endDate)}</span>
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

          {/* Assigned Users */}
          {task.assignedUsers && task.assignedUsers.length > 0 && (
            <UserAvatarList
              users={
                task.assignedUsers.filter(user => typeof user === 'object' && user._id) as Array<{ _id: string; name: string; email?: string }>
              }
              maxDisplay={3}
              size="sm"
              showNames={false}
              className="ml-auto"
            />
          )}
        </div>
      </div>      {/* Click hint overlay */}
      <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-blue-50 bg-opacity-30 rounded-lg transition-opacity pointer-events-none flex items-center justify-center">
        <div className="bg-white text-xs text-gray-600 px-2 py-1 rounded shadow-sm border">
          Click to edit
        </div>
      </div>
    </div>
  );
};

export default KanbanTaskCard;
