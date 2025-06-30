import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Globe, Mail, Phone, MapPin, Save, X } from 'lucide-react';
import Modal from './Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { organizationAPI } from '../../services/api';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrganizationFormData {
  name: string;
  description: string;
  domain?: string;
  website?: string;
  industry?: string;
  size?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [creating, setCreating] = useState(false);
  const { addNotification } = useNotification();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>();

  const onSubmit = async (data: OrganizationFormData) => {
    setCreating(true);
    try {
      await organizationAPI.createOrganization(data);
      
      addNotification({
        type: 'success',
        title: 'Organization Created',
        message: `${data.name} has been created successfully!`,
      });
      
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.response?.data?.message || 'Failed to create organization',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Organization" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Your Organization</h3>
            <p className="text-sm text-gray-500">Set up your organization to start collaborating with teams</p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Organization Name *
              </label>
              <input
                {...register('name', { 
                  required: 'Organization name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                className="input w-full"
                placeholder="Acme Corporation"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                className="textarea w-full"
                rows={3}
                placeholder="Brief description of your organization..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Domain (Optional)
              </label>
              <input
                {...register('domain', {
                  pattern: {
                    value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                    message: 'Please enter a valid domain'
                  }
                })}
                className="input w-full"
                placeholder="acme.com"
              />
              {errors.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Users with this email domain can join automatically
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Website (Optional)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  {...register('website', {
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL (starting with http:// or https://)'
                    }
                  })}
                  className="input pl-10 w-full"
                  placeholder="https://acme.com"
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Industry
              </label>
              <select {...register('industry')} className="input w-full">
                <option value="">Select industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance & Banking</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="retail">Retail & E-commerce</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="consulting">Consulting</option>
                <option value="media">Media & Entertainment</option>
                <option value="real-estate">Real Estate</option>
                <option value="non-profit">Non-Profit</option>
                <option value="government">Government</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Organization Size
              </label>
              <select {...register('size')} className="input w-full">
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Address (Optional)</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Street Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  {...register('address.street')}
                  className="input pl-10 w-full"
                  placeholder="123 Main Street"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                City
              </label>
              <input
                {...register('address.city')}
                className="input w-full"
                placeholder="New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                State/Province
              </label>
              <input
                {...register('address.state')}
                className="input w-full"
                placeholder="NY"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Country
              </label>
              <input
                {...register('address.country')}
                className="input w-full"
                placeholder="United States"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                ZIP/Postal Code
              </label>
              <input
                {...register('address.zipCode')}
                className="input w-full"
                placeholder="10001"
              />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You'll become the organization owner with full admin privileges</li>
            <li>• You can invite team members and create teams</li>
            <li>• Start creating organization-wide projects and tasks</li>
            <li>• Configure organization settings and permissions</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            className="btn-outline btn-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="btn-primary btn-md"
          >
            <Save className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOrganizationModal;
