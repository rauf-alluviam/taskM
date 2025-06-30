import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Users, Hash, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { teamAPI, userAPI, organizationAPI } from '../../services/api';
import LoadingSpinner from './LoadingSpinner';

interface TeamFormData {
  name: string;
  description: string;
  color: string;
  isPrivate: boolean;
  leadId: string;
}

interface TeamFormProps {
  team?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: any) => void;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, isOpen, onClose, onSave }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [saving, setSaving] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TeamFormData>();

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
      if (team) {
        // Populate form with existing team data
        setValue('name', team.name);
        setValue('description', team.description || '');
        setValue('color', team.color || colors[0]);
        setValue('isPrivate', team.isPrivate || false);
        setValue('leadId', team.lead?._id || '');
      } else {
        // Reset form for new team
        reset({
          name: '',
          description: '',
          color: colors[0],
          isPrivate: false,
          leadId: '',
        });
      }
    }
  }, [isOpen, team, setValue, reset]);

  const loadAvailableUsers = async () => {
    if (!user?.organization) return;

    try {
      setLoadingUsers(true);
      const orgMembers = await organizationAPI.getMembers(user.organization._id);
      // Filter to show only team leads and org admins as potential team leads
      const eligibleLeads = orgMembers.filter((member: User) => 
        ['org_admin', 'team_lead', 'member'].includes(member.role)
      );
      setAvailableUsers(eligibleLeads);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TeamFormData) => {
    setSaving(true);
    try {
      let result;
      if (team) {
        // Update existing team
        result = await teamAPI.updateTeam(team._id, data);
        addNotification({
          type: 'success',
          title: 'Team Updated',
          message: `${data.name} has been updated successfully`,
        });
      } else {
        // Create new team
        result = await teamAPI.createTeam({
          ...data,
          organization: user?.organization?._id,
        });
        addNotification({
          type: 'success',
          title: 'Team Created',
          message: `${data.name} has been created successfully`,
        });
      }
      
      onSave(result);
      onClose();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || `Failed to ${team ? 'update' : 'create'} team`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {team ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white px-6 py-4 space-y-6">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Team Name *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('name', { required: 'Team name is required' })}
                  className="input pl-10 w-full"
                  placeholder="Enter team name..."
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                className="textarea w-full"
                rows={3}
                placeholder="Describe the team's purpose and goals..."
              />
            </div>

            {/* Team Lead */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Team Lead
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  {...register('leadId')}
                  className="input pl-10 w-full"
                  disabled={loadingUsers}
                >
                  <option value="">Select team lead...</option>
                  {availableUsers.map((usr) => (
                    <option key={usr._id} value={usr._id}>
                      {usr.name} ({usr.email})
                    </option>
                  ))}
                </select>
              </div>
              {loadingUsers && (
                <p className="mt-1 text-sm text-gray-500">Loading users...</p>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Team Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      {...register('color')}
                      type="radio"
                      value={color}
                      className="sr-only"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Private Team</label>
                <p className="text-sm text-gray-500">Only team members can see team details</p>
              </div>
              <input
                {...register('isPrivate')}
                type="checkbox"
                className="toggle"
              />
            </div>

            {/* Actions */}
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
                disabled={saving}
                className="btn-primary btn-md"
              >
                {saving ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : (team ? 'Update Team' : 'Create Team')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;
