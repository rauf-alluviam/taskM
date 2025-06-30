import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Users, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CreateOrganizationModal from '../components/UI/CreateOrganizationModal';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const CreateOrganization: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);

  const handleSuccess = () => {
    // Redirect to organization dashboard after creation
    navigate('/organization');
  };

  const handleClose = () => {
    // Go back to previous page
    navigate(-1);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user already has an organization, redirect them
  if (user.organization) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You're already part of an organization
          </h2>
          <p className="text-gray-600 mb-6">
            You're currently a member of <strong>{user.organization.name}</strong>. 
            You can only be part of one organization at a time.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/organization')}
              className="btn-primary btn-md"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Go to Organization Dashboard
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-outline btn-md"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Organization
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your individual TaskFlow workspace into a collaborative organization. 
            Invite team members, create teams, and manage projects together.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-blue-50 rounded-lg">
          <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Centralized Management</h3>
          <p className="text-sm text-gray-600">
            Manage all your projects, teams, and members from one central location
          </p>
        </div>

        <div className="text-center p-6 bg-green-50 rounded-lg">
          <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
          <p className="text-sm text-gray-600">
            Create teams, assign roles, and collaborate effectively across departments
          </p>
        </div>

        <div className="text-center p-6 bg-purple-50 rounded-lg">
          <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Advanced Permissions</h3>
          <p className="text-sm text-gray-600">
            Control access with role-based permissions and project visibility settings
          </p>
        </div>
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default CreateOrganization;
