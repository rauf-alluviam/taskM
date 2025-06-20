import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Tag, Calendar, Flag, User, Trash2, List, Paperclip } from 'lucide-react';
import Modal from '../UI/Modal';
import SubtaskManager from './SubtaskManager';
import AttachmentManager from '../UI/AttachmentManager';
import { attachmentAPI } from '../../services/api';
import { Task } from '../../contexts/TaskContext';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  status: string;
  assignedUsers: string[];
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & { tags: string[] }) => void;
  onDelete?: () => void;
  task: Task | null;
  loading?: boolean;
  availableStatuses?: Array<{ id: string; title: string }>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  task,
  loading = false,
  availableStatuses,
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaskFormData>();
  useEffect(() => {
    if (task && isOpen) {
      // Pre-fill form with task data
      setValue('title', task.title);
      setValue('description', task.description);
      setValue('priority', task.priority);
      setValue('status', task.status);
      setValue('startDate', task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
      setValue('endDate', task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '');
      setTags(task.tags || []);
      
      // Load attachments
      loadAttachments();
    }
  }, [task, isOpen, setValue]);

  const loadAttachments = async () => {
    if (!task) return;
    
    setLoadingAttachments(true);
    try {
      const taskAttachments = await attachmentAPI.getAttachments('task', task._id);
      setAttachments(taskAttachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

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
    onSubmit({ ...data, tags });
  };
  const handleClose = () => {
    reset();
    setTags([]);
    setTagInput('');
    setAttachments([]);
    onClose();
  };

  const handleDeleteTask = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      onDelete();
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Task">
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

        {/* Task Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Task Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {' '}
              {new Date(task.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {' '}
              {new Date(task.updatedAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Task ID:</span> {' '}
              <code className="text-xs bg-gray-200 px-1 rounded">{task._id.slice(-8)}</code>
            </div>
            {task.assignedUsers?.length > 0 && (
              <div>
                <span className="font-medium">Assigned Users:</span> {task.assignedUsers.length}
              </div>
            )}
          </div>
        </div>        {/* Form Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>      {/* Subtask Manager - Outside of main form to avoid nested forms */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          <List className="w-4 h-4 inline mr-1" />
          Subtasks
        </label>
        <SubtaskManager parentTask={task} />
      </div>

      {/* Attachment Manager */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          <Paperclip className="w-4 h-4 inline mr-1" />
          Attachments
        </label>
        {loadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">Loading attachments...</span>
          </div>
        ) : (
          <AttachmentManager
            attachedTo="task"
            attachedToId={task._id}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            canUpload={true}
            canDelete={true}
            maxFileSize={50}
          />
        )}
      </div>
    </Modal>
  );
};

export default EditTaskModal;
