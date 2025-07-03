import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Tag, Calendar, Flag, User } from 'lucide-react';
import Modal from '../UI/Modal';
import UserSelector from '../UI/UserSelector';
import { useAuth } from '../../contexts/AuthContext';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  status: string;
  assignedUsers: string[];
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & { tags: string[] }) => void;
  initialStatus?: string;
  loading?: boolean;
  availableStatuses?: Array<{ id: string; title: string }>;
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
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialStatus = 'todo',
  loading = false,
  availableStatuses,
  project,
}) => {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      status: initialStatus,
      priority: 'medium',
      assignedUsers: [],
    },
  });



  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600', bg: 'bg-green-100' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'critical', label: 'Critical Priority', color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const defaultStatusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const statusOptions = availableStatuses 
    ? availableStatuses.map(status => ({ value: status.id, label: status.title }))
    : defaultStatusOptions;

  const predefinedCategories = [
    'Development', 'Design', 'Testing', 'Bug Fix', 'Feature',
    'Documentation', 'Research', 'Meeting', 'Review', 'Deployment'
  ];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleFormSubmit = (data: TaskFormData) => {
    onSubmit({ ...data, tags, assignedUsers });
    reset();
    setTags([]);
    setTagInput('');
    setAssignedUsers([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            {...register('title', { required: 'Title is required' })}
            className="input w-full"
            placeholder="Enter task title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="textarea w-full"
            placeholder="Describe the task..."
          />
        </div>

        {/* Priority and Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select {...register('priority')} className="input w-full">
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select {...register('status')} className="input w-full">
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="input w-full"
            />
          </div>
        </div>

        {/* Assign Users */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Assign to Users
          </label>
          <UserSelector
            selectedUserIds={assignedUsers}
            onSelectionChange={setAssignedUsers}
            placeholder="Select users to assign this task..."
            allowMultiple={true}
            showAvatars={true}
            className="w-full"
            project={project}
          />
          <p className="text-xs text-gray-500 mt-1">
            Assign this task to team members who will be responsible for completing it.
          </p>
        </div>

        {/* Categories/Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Categories
          </label>
          
          {/* Predefined Categories */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => !tags.includes(category) && setTags([...tags, category])}
                  disabled={tags.includes(category)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    tags.includes(category)
                      ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed opacity-50'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input flex-1"
              placeholder="Add custom category..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-outline btn-sm px-3"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
