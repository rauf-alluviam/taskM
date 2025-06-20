import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Flag, Tag } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { taskAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import TaskFilters from '../components/Filters/TaskFilters';
import { useForm } from 'react-hook-form';

interface TaskForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  tags: string;
  status: string;
}

interface TaskFiltersState {
  status: string;
  priority: string;
  search: string;
  tags: string;
  dateRange: {
    start: string;
    end: string;
  };
  assignedTo: string;
}

const Tasks: React.FC = () => {
  const { tasks, dispatch } = useTask();
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creating, setCreating] = useState(false);  const [filters, setFilters] = useState<TaskFiltersState>({
    status: 'all',
    priority: 'all',
    search: '',
    tags: '',
    dateRange: {
      start: '',
      end: '',
    },
    assignedTo: '',
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskAPI.getTasks();
      dispatch({ type: 'SET_TASKS', payload: data });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const onCreateTask = async (data: TaskForm) => {
    setCreating(true);
    try {
      const taskData = {
        ...data,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      
      const newTask = await taskAPI.createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      reset();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         task.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || task.status === filters.status;
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
    
    // Tag filtering
    const matchesTags = !filters.tags || 
      task.tags.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()));
    
    // Date range filtering (for end date/due date)
    let matchesDateRange = true;
    if (filters.dateRange.start || filters.dateRange.end) {
      const taskEndDate = task.endDate ? new Date(task.endDate) : null;
      if (taskEndDate) {
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          matchesDateRange = matchesDateRange && taskEndDate >= startDate;
        }
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          matchesDateRange = matchesDateRange && taskEndDate <= endDate;
        }
      } else {
        // If task has no end date but filter is set, exclude it
        matchesDateRange = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesTags && matchesDateRange;
  });

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.tags) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    return count;
  };
  const clearAllFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      search: '',
      tags: '',
      dateRange: {
        start: '',
        end: '',
      },
      assignedTo: '',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-error-100 text-error-800 border-error-200';
      case 'high': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'medium': return 'bg-accent-100 text-accent-800 border-accent-200';
      case 'low': return 'bg-success-100 text-success-800 border-success-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-success-100 text-success-800 border-success-200';
      case 'in-progress': return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'review': return 'bg-warning-100 text-warning-800 border-warning-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Filters with Header */}
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearAllFilters}
        activeFiltersCount={getActiveFiltersCount()}
        onCreateTask={() => setShowTaskModal(true)}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
        <span>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </span>
        {getActiveFiltersCount() > 0 && (
          <span>
            {getActiveFiltersCount()} filter{getActiveFiltersCount() > 1 ? 's' : ''} applied
          </span>
        )}
      </div>

      {/* Tasks List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div key={task._id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        <Flag className="w-3 h-3 mr-1" />
                        {task.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {task.startDate && (
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Start: {new Date(task.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.endDate && (
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Due: {new Date(task.endDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center">
                      Created: {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Flag className="w-8 h-8 text-gray-400" />
          </div>          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {getActiveFiltersCount() > 0 || filters.search
              ? 'No tasks found' 
              : 'No tasks yet'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {getActiveFiltersCount() > 0 || filters.search
              ? 'Try adjusting your search or filters'
              : 'Create your first task to get started'
            }
          </p>
          {getActiveFiltersCount() === 0 && !filters.search && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </button>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create New Task"
        size="md"
      >
        <form onSubmit={handleSubmit(onCreateTask)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Task Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input w-full"
              placeholder="Enter task title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full"
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Status *
              </label>
              <select {...register('status', { required: 'Status is required' })} className="input w-full">
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-error-600">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Flag className="w-4 h-4 inline mr-1" />
                Priority
              </label>
              <select {...register('priority')} className="input w-full">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <input
              {...register('tags')}
              className="input w-full"
              placeholder="urgent, frontend, bug (comma separated)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                {...register('startDate')}
                type="date"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                {...register('endDate')}
                type="date"
                className="input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowTaskModal(false)}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-md"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;