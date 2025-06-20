import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Square, MoreVertical, Edit2, Trash2, Clock, Flag } from 'lucide-react';
import { taskAPI } from '../../services/api';
import { Task } from '../../contexts/TaskContext';
import Modal from '../UI/Modal';
import { useForm } from 'react-hook-form';

interface SubtaskManagerProps {
  parentTask: Task;
  onSubtaskUpdate?: (subtasks: Task[]) => void;
}

interface SubtaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
}

const SubtaskManager: React.FC<SubtaskManagerProps> = ({ parentTask, onSubtaskUpdate }) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubtask, setSelectedSubtask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubtaskFormData>();

  useEffect(() => {
    loadSubtasks();
  }, [parentTask._id]);

  const loadSubtasks = async () => {
    try {
      setLoading(true);
      const data = await taskAPI.getSubtasks(parentTask._id);
      setSubtasks(data);
      onSubtaskUpdate?.(data);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async (data: SubtaskFormData) => {
    try {
      setCreating(true);
      const newSubtask = await taskAPI.createSubtask(parentTask._id, data);
      setSubtasks(prev => [...prev, newSubtask]);
      setShowCreateModal(false);
      reset();
      onSubtaskUpdate?.([...subtasks, newSubtask]);
    } catch (error) {
      console.error('Failed to create subtask:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSubtask = async (data: SubtaskFormData) => {    if (!selectedSubtask) return;

    try {
      setUpdating(true);
      const updatedSubtask = await taskAPI.updateSubtask(
        selectedSubtask._id,
        data
      );
      
      setSubtasks(prev => 
        prev.map(subtask => 
          subtask._id === selectedSubtask._id ? updatedSubtask : subtask
        )
      );
      
      setShowEditModal(false);
      setSelectedSubtask(null);
      onSubtaskUpdate?.(subtasks.map(s => s._id === selectedSubtask._id ? updatedSubtask : s));
    } catch (error) {
      console.error('Failed to update subtask:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleSubtaskStatus = async (subtask: Task) => {    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    
    try {
      const updatedSubtask = await taskAPI.updateSubtask(
        subtask._id,
        { status: newStatus }
      );
      
      setSubtasks(prev => 
        prev.map(s => s._id === subtask._id ? updatedSubtask : s)
      );
      
      onSubtaskUpdate?.(subtasks.map(s => s._id === subtask._id ? updatedSubtask : s));
    } catch (error) {
      console.error('Failed to toggle subtask status:', error);
    }
  };
  const handleDeleteSubtask = async (subtask: Task) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      await taskAPI.deleteSubtask(subtask._id);
      setSubtasks(prev => prev.filter(s => s._id !== subtask._id));
      onSubtaskUpdate?.(subtasks.filter(s => s._id !== subtask._id));
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const handleEditSubtask = (subtask: Task) => {
    setSelectedSubtask(subtask);
    reset({
      title: subtask.title,
      description: subtask.description,
      priority: subtask.priority,
      startDate: subtask.startDate ? new Date(subtask.startDate).toISOString().split('T')[0] : '',
      endDate: subtask.endDate ? new Date(subtask.endDate).toISOString().split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const completedCount = subtasks.filter(subtask => subtask.status === 'done').length;
  const progressPercentage = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Subtask Progress */}
      {subtasks.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Subtasks Progress
            </span>
            <span className="text-sm text-gray-600">
              {completedCount} of {subtasks.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {subtasks.map((subtask) => (
              <div
                key={subtask._id}
                className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 group"
              >
                <button
                  onClick={() => handleToggleSubtaskStatus(subtask)}
                  className="flex-shrink-0"
                >
                  {subtask.status === 'done' ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className={`text-sm font-medium ${
                      subtask.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {subtask.title}
                    </h4>
                    <Flag className={`w-3 h-3 ${getPriorityColor(subtask.priority)}`} />
                  </div>
                  {subtask.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {subtask.description}
                    </p>
                  )}
                  {(subtask.startDate || subtask.endDate) && (
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {subtask.startDate && new Date(subtask.startDate).toLocaleDateString()}
                        {subtask.startDate && subtask.endDate && ' - '}
                        {subtask.endDate && new Date(subtask.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditSubtask(subtask)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubtask(subtask)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add Subtask Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Add Subtask</span>
      </button>

      {/* Create Subtask Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
        title="Create Subtask"
        size="md"
      >
        <form onSubmit={handleSubmit(handleCreateSubtask)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Subtask Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input w-full"
              placeholder="Enter subtask title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full"
              placeholder="Describe the subtask..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-md"
            >
              {creating ? 'Creating...' : 'Create Subtask'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Subtask Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSubtask(null);
          reset();
        }}
        title="Edit Subtask"
        size="md"
      >
        <form onSubmit={handleSubmit(handleUpdateSubtask)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Subtask Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input w-full"
              placeholder="Enter subtask title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full"
              placeholder="Describe the subtask..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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
              onClick={() => {
                setShowEditModal(false);
                setSelectedSubtask(null);
                reset();
              }}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="btn-primary btn-md"
            >
              {updating ? 'Updating...' : 'Update Subtask'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubtaskManager;
