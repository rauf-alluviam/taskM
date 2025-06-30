import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Building2, 
  Save, 
  Settings, 
  Users, 
  Shield, 
  Trash2,
  Edit3,
  Mail,
  Globe,
  MapPin,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { organizationAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';

interface OrganizationData {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  settings: {
    allowPublicProjects: boolean;
    requireAdminApproval: boolean;
    enableGuestAccess: boolean;
    maxTeamSize: number;
  };
  stats: {
    totalMembers: number;
    totalTeams: number;
    totalProjects: number;
  };
  createdAt: string;
}

interface OrganizationForm {
  name: string;
  description: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}

interface OrganizationSettingsForm {
  allowPublicProjects: boolean;
  requireAdminApproval: boolean;
  enableGuestAccess: boolean;
  maxTeamSize: number;
}

const OrganizationSettings: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'settings' | 'danger'>('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register: registerGeneral, handleSubmit: handleSubmitGeneral, setValue: setValueGeneral, formState: { errors: errorsGeneral } } = useForm<OrganizationForm>();
  const { register: registerSettings, handleSubmit: handleSubmitSettings, setValue: setValueSettings, formState: { errors: errorsSettings } } = useForm<OrganizationSettingsForm>();

  useEffect(() => {
    if (user?.organization) {
      loadOrganization();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrganization = async () => {
    if (!user?.organization?._id) return;
    
    try {
      setLoading(true);
      const data = await organizationAPI.getOrganization(user.organization._id);
      setOrganization(data);
      
      // Populate forms
      setValueGeneral('name', data.name);
      setValueGeneral('description', data.description || '');
      setValueGeneral('website', data.website || '');
      setValueGeneral('address', data.address || '');
      setValueGeneral('phone', data.phone || '');
      setValueGeneral('email', data.email || '');
      setValueGeneral('industry', data.industry || '');
      setValueGeneral('size', data.size || 'small');
      
      setValueSettings('allowPublicProjects', data.settings?.allowPublicProjects || false);
      setValueSettings('requireAdminApproval', data.settings?.requireAdminApproval || true);
      setValueSettings('enableGuestAccess', data.settings?.enableGuestAccess || false);
      setValueSettings('maxTeamSize', data.settings?.maxTeamSize || 50);
    } catch (error) {
      console.error('Failed to load organization:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load organization settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitGeneral = async (data: OrganizationForm) => {
    if (!organization) return;

    setSaving(true);
    try {
      const updatedOrg = await organizationAPI.updateOrganization(organization._id, data);
      setOrganization(updatedOrg);
      addNotification({
        type: 'success',
        title: 'Organization Updated',
        message: 'Organization details have been updated successfully',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update organization',
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmitSettings = async (data: OrganizationSettingsForm) => {
    if (!organization) return;

    setSaving(true);
    try {
      const updatedOrg = await organizationAPI.updateOrganization(organization._id, {
        settings: data
      });
      setOrganization(updatedOrg);
      addNotification({
        type: 'success',
        title: 'Settings Updated',
        message: 'Organization settings have been updated successfully',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization) return;

    setDeleting(true);
    try {
      await organizationAPI.deleteOrganization(organization._id);
      addNotification({
        type: 'success',
        title: 'Organization Deleted',
        message: 'Organization has been deleted successfully',
      });
      // Redirect or refresh auth state
      window.location.href = '/dashboard';
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete organization',
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!user?.organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization</h3>
        <p className="text-gray-500">You are not part of any organization.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Not Found</h3>
        <p className="text-gray-500">Failed to load organization details.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general' as const, name: 'General', icon: Building2 },
    { id: 'settings' as const, name: 'Settings', icon: Settings },
    ...(user?.role === 'super_admin' ? [{ id: 'danger' as const, name: 'Danger Zone', icon: Shield }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Manage your organization details and preferences</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg">
          <p className="text-sm font-medium text-blue-700">
            {organization.stats.totalMembers} members • {organization.stats.totalTeams} teams
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'general' && (
          <form onSubmit={handleSubmitGeneral(onSubmitGeneral)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Organization Name *
                </label>
                <input
                  {...registerGeneral('name', { required: 'Organization name is required' })}
                  className="input w-full"
                />
                {errorsGeneral.name && (
                  <p className="mt-1 text-sm text-red-600">{errorsGeneral.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Industry
                </label>
                <select {...registerGeneral('industry')} className="input w-full">
                  <option value="">Select industry</option>
                  <option value="technology">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="consulting">Consulting</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Organization Size
                </label>
                <select {...registerGeneral('size')} className="input w-full">
                  <option value="startup">Startup (1-10 employees)</option>
                  <option value="small">Small (11-50 employees)</option>
                  <option value="medium">Medium (51-200 employees)</option>
                  <option value="large">Large (201-1000 employees)</option>
                  <option value="enterprise">Enterprise (1000+ employees)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...registerGeneral('website')}
                    type="url"
                    className="input pl-10 w-full"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...registerGeneral('email')}
                    type="email"
                    className="input pl-10 w-full"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...registerGeneral('phone')}
                    type="tel"
                    className="input pl-10 w-full"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <textarea
                {...registerGeneral('description')}
                className="textarea w-full"
                rows={3}
                placeholder="Brief description of your organization..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  {...registerGeneral('address')}
                  className="textarea pl-10 w-full"
                  rows={2}
                  placeholder="Organization address..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary btn-md"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'settings' && (
          <form onSubmit={handleSubmitSettings(onSubmitSettings)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Project Settings</h3>
                  <p className="text-sm text-gray-500">Control how projects are managed in your organization</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Allow Public Projects</label>
                    <p className="text-sm text-gray-500">Enable organization members to create public projects</p>
                  </div>
                  <input
                    {...registerSettings('allowPublicProjects')}
                    type="checkbox"
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Require Admin Approval</label>
                    <p className="text-sm text-gray-500">New team members require admin approval</p>
                  </div>
                  <input
                    {...registerSettings('requireAdminApproval')}
                    type="checkbox"
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Enable Guest Access</label>
                    <p className="text-sm text-gray-500">Allow guests to view public projects</p>
                  </div>
                  <input
                    {...registerSettings('enableGuestAccess')}
                    type="checkbox"
                    className="toggle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Maximum Team Size
                  </label>
                  <input
                    {...registerSettings('maxTeamSize', {
                      min: { value: 1, message: 'Team size must be at least 1' },
                      max: { value: 1000, message: 'Team size cannot exceed 1000' }
                    })}
                    type="number"
                    className="input w-32"
                    min={1}
                    max={1000}
                  />
                  {errorsSettings.maxTeamSize && (
                    <p className="mt-1 text-sm text-red-600">{errorsSettings.maxTeamSize.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary btn-md"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'danger' && user?.role === 'super_admin' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
              <p className="text-sm text-gray-500">These actions cannot be undone</p>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-900">Delete Organization</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete this organization and all associated data
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn-destructive btn-md"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Organization"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-red-600">
            <Trash2 className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-medium">Are you absolutely sure?</h3>
              <p className="text-sm text-gray-600">
                This action cannot be undone. This will permanently delete the organization
                <strong className="font-medium"> {organization.name}</strong> and all associated data.
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              <strong>This will delete:</strong>
            </p>
            <ul className="text-sm text-red-700 mt-1 space-y-1">
              <li>• All teams and team members</li>
              <li>• All projects and tasks</li>
              <li>• All documents and files</li>
              <li>• All organization data</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOrganization}
              disabled={deleting}
              className="btn-destructive btn-md"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettings;
