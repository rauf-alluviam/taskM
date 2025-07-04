import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../UI/Modal';
import UserSelector from '../UI/UserSelector';
import { taskAPI } from '../../services/api';
import { useTask } from '../../contexts/TaskContext';
import { Calendar, Flag, Tag, User } from 'lucide-react';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickTaskForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  tags: string;
}

const QuickTaskModal: React.FC<QuickTaskModalProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useTask();
  const [loading, setLoading] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuickTaskForm>();

  const onSubmit = async (data: QuickTaskForm) => {
    setLoading(true);
    try {
      const taskData = {
        ...data,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        assignedUsers,
        status: 'todo',
      };
      
      const newTask = await taskAPI.createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      reset();
      setAssignedUsers([]);
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Quick Task" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <input
              {...register('tags')}
              className="input w-full"
              placeholder="urgent, frontend, bug"
            />
          </div>
        </div>

        {/* Assign Users */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
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
          />
          <p className="text-xs text-gray-500 mt-1">
            Assign this task to team members who will be responsible for completing it.
          </p>
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
            onClick={onClose}
            className="btn-outline btn-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-md"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickTaskModal;