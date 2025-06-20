import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Save,
  Calendar,
  Flag,
  User,
  Tag,
  List,
  Paperclip,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { taskAPI, attachmentAPI } from '../services/api';
import { Task } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import SubtaskManager from '../components/Tasks/SubtaskManager';
import AttachmentManager from '../components/UI/AttachmentManager';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  status: string;
  assignedUsers: string[];
}

interface TaskHistoryItem {
  _id: string;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  userName: string;
  createdAt: string;
  formattedDescription: string;
}

const EditTaskPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } = useForm<TaskFormData>();

  useEffect(() => {
    if (id) {
      loadTask();
      loadTaskHistory();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks();
      const foundTask = response.find((t: Task) => t._id === id);
      
      if (!foundTask) {
        addNotification({
          type: 'error',
          title: 'Task Not Found',
          message: 'The requested task could not be found.',
        });
        navigate('/tasks');
        return;
      }

      setTask(foundTask);
      
      // Pre-fill form
      setValue('title', foundTask.title);
      setValue('description', foundTask.description || '');
      setValue('priority', foundTask.priority);
      setValue('status', foundTask.status);
      setValue('startDate', foundTask.startDate ? new Date(foundTask.startDate).toISOString().split('T')[0] : '');
      setValue('endDate', foundTask.endDate ? new Date(foundTask.endDate).toISOString().split('T')[0] : '');
      setValue('assignedUsers', foundTask.assignedUsers?.map((user: any) => user._id) || []);
      setTags(foundTask.tags || []);

      // Load attachments
      loadAttachments(foundTask._id);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      addNotification({
        type: 'error',
        title: 'Error Loading Task',
        message: error.response?.data?.message || 'Failed to load task details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTaskHistory = async (page = 1) => {
    if (!id) return;
    
    try {
      setLoadingHistory(true);
      const response = await taskAPI.getTaskHistory(id, page);
      
      if (page === 1) {
        setHistory(response.history);
      } else {
        setHistory(prev => [...prev, ...response.history]);
      }
      
      setHistoryTotal(response.pagination.count);
      setHistoryPage(page);
    } catch (error: any) {
      console.error('Failed to load task history:', error);
      addNotification({
        type: 'error',
        title: 'Error Loading History',
        message: 'Failed to load task history.',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAttachments = async (taskId: string) => {
    try {
      const taskAttachments = await attachmentAPI.getAttachments('task', taskId);
      setAttachments(taskAttachments);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!task) return;

    try {
      setSaving(true);
      const updateData = {
        ...data,
        tags,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      };

      const updatedTask = await taskAPI.updateTask(task._id, updateData);
      setTask(updatedTask);
      
      // Reload history to show new changes
      await loadTaskHistory(1);
      
      addNotification({
        type: 'success',
        title: 'Task Updated',
        message: 'Task has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Failed to update task:', error);
      addNotification({
        type: 'error',
        title: 'Error Updating Task',
        message: error.response?.data?.message || 'Failed to update task.',
      });
    } finally {
      setSaving(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600', bg: 'bg-green-100' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'critical', label: 'Critical Priority', color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'status_changed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'priority_changed':
        return <Flag className="w-4 h-4 text-orange-600" />;
      case 'assigned':
      case 'unassigned':
        return <User className="w-4 h-4 text-purple-600" />;      case 'due_date_changed':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'start_date_changed':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'attachment_added':
      case 'attachment_removed':
        return <Paperclip className="w-4 h-4 text-gray-600" />;
      case 'tag_added':
      case 'tag_removed':
        return <Tag className="w-4 h-4 text-pink-600" />;
      case 'subtask_added':
      case 'subtask_updated':
      case 'subtask_completed':
      case 'subtask_deleted':
        return <List className="w-4 h-4 text-cyan-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Task Not Found</h3>
        <p className="text-gray-500 mb-6">The requested task could not be found.</p>
        <Link to="/tasks" className="btn-primary">
          Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline btn-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
            <p className="text-gray-600">Make changes and track task history</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-amber-600 font-medium">
              • Unsaved changes
            </span>
          )}
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving || !isDirty}
            className="btn-primary btn-md"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
                
                {/* Title */}
                <div className="mb-4">
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
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="input w-full"
                    placeholder="Enter task description..."
                  />
                </div>

                {/* Priority and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Flag className="w-4 h-4 inline mr-1" />
                      Priority
                    </label>
                    <select {...register('priority')} className="input w-full">
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Status
                    </label>
                    <select {...register('status')} className="input w-full">
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="input flex-1"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn-outline btn-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <List className="w-5 h-5 inline mr-2" />
                  Subtasks
                </h3>
                <SubtaskManager parentTask={task} />
              </div>
            </div>

            {/* Attachments */}
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Paperclip className="w-5 h-5 inline mr-2" />
                  Attachments
                </h3>
                <AttachmentManager
                  attachedTo="task"
                  attachedToId={task._id}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Task History Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Clock className="w-5 h-5 inline mr-2" />
                Task History
              </h3>
              
              {loadingHistory && history.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {history.map((item) => (
                    <div key={item._id} className="flex space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(item.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{item.formattedDescription}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {history.length === 0 && !loadingHistory && (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No history yet</p>
                    </div>
                  )}
                  
                  {history.length < historyTotal && (
                    <button
                      onClick={() => loadTaskHistory(historyPage + 1)}
                      disabled={loadingHistory}
                      className="w-full text-sm text-blue-600 hover:text-blue-700 py-2"
                    >
                      {loadingHistory ? 'Loading...' : 'Load more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskPage;
