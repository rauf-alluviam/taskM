import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Tag, Calendar, Flag, User, Trash2, List, Paperclip } from 'lucide-react';
import Modal from '../UI/Modal';
import UserSelector from '../UI/UserSelector';
import UserAvatarList from '../UI/UserAvatarList';
import SubtaskManager from './SubtaskManager';
import AttachmentManager from '../UI/AttachmentManager';
import { attachmentAPI } from '../../services/api';
import { Task } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionHelper } from '../../utils/permissions';
import { TaskValidator } from '../../utils/taskValidation';
import { useNotification } from '../../contexts/NotificationContext';

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

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  task,
  loading = false,
  availableStatuses,
  project,
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check if user can assign tasks
  const canAssignTasks = user && task ? PermissionHelper.canAssignTasks({
    user,
    project,
    task
  }) : false;

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
      setValue('assignedUsers', task.assignedUsers?.map((user: any) => user._id || user) || []);
      setTags(task.tags || []);
      setAssignedUsers(task.assignedUsers?.map((user: any) => user._id || user) || []);
      
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
    { value: 'low', label: 'Low Priority', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { value: 'critical', label: 'Critical Priority', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
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

  const handleFormSubmit = async (data: TaskFormData) => {
    setValidationErrors([]);
    
    try {
      // Prepare task data
      const taskData = { 
        ...data, 
        tags, 
        assignedUsers: canAssignTasks ? assignedUsers : (task?.assignedUsers?.map((u: any) => u._id || u) || [])
      };
      
      // Validate task data
      const validation = await TaskValidator.validateTaskData(taskData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        addNotification({
          type: 'error',
          title: 'Validation Error',
          message: validation.errors[0],
          duration: 5000
        });
        return;
      }
      
      // Submit if validation passes
      onSubmit(taskData);
    } catch (error) {
      console.error('Task validation failed:', error);
      addNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Unable to validate task data. Please try again.',
        duration: 5000
      });
    }
  };

  const handleClose = () => {
    reset();
    setTags([]);
    setTagInput('');
    setAssignedUsers([]);
    setAttachments([]);
    setValidationErrors([]);
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
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Please fix the following errors:
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Title *
          </label>
          <input
            type="text"
            {...register('title', { required: 'Title is required' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                     focus:border-blue-500 dark:focus:border-blue-400
                     placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Enter task title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                     focus:border-blue-500 dark:focus:border-blue-400
                     placeholder-gray-400 dark:placeholder-gray-500 resize-vertical"
            placeholder="Describe the task..."
          />
        </div>

        {/* Priority and Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <select 
              {...register('priority')} 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                       focus:border-blue-500 dark:focus:border-blue-400"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-white dark:bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select 
              {...register('status')} 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                       focus:border-blue-500 dark:focus:border-blue-400"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-white dark:bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                       focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                       focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>

        {/* Assign Users - Only show if user has permission */}
        {canAssignTasks && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              task={task}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Assign this task to team members who will be responsible for completing it.
            </p>
          </div>
        )}

        {/* Show assigned users as read-only if user cannot assign */}
        {!canAssignTasks && task.assignedUsers && task.assignedUsers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Assigned Users
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
              <UserAvatarList
                users={
                  task.assignedUsers.filter(user => typeof user === 'object' && user._id) as Array<{ _id: string; name: string; email?: string }>
                }
                maxDisplay={5}
                size="sm"
                showNames={true}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You don't have permission to modify task assignments.
            </p>
          </div>
        )}

        {/* Categories/Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Categories
          </label>
          
          {/* Predefined Categories */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => !tags.includes(category) && setTags([...tags, category])}
                  disabled={tags.includes(category)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    tags.includes(category)
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700 cursor-not-allowed opacity-50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-600'
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                       focus:border-blue-500 dark:focus:border-blue-400
                       placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Add custom category..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       transition-colors"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                           bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 
                           border border-blue-200 dark:border-blue-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
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
              <code className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 rounded">
                {task._id.slice(-8)}
              </code>
            </div>
            {task.assignedUsers?.length > 0 && (
              <div>
                <span className="font-medium">Assigned Users:</span> {task.assignedUsers.length}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-md shadow-sm text-sm font-medium
                         text-red-600 dark:text-red-400 bg-white dark:bg-gray-800
                         hover:bg-red-50 dark:hover:bg-red-900/20
                         focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium
                       text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                       text-white bg-blue-600 dark:bg-blue-700
                       hover:bg-blue-700 dark:hover:bg-blue-800
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Subtask Manager - Outside of main form to avoid nested forms */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          <List className="w-4 h-4 inline mr-1" />
          Subtasks
        </label>
        <SubtaskManager parentTask={task} />
      </div>

      {/* Attachment Manager */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          <Paperclip className="w-4 h-4 inline mr-1" />
          Attachments
        </label>
        {loadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading attachments...</span>
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