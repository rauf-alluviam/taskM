import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, UserPlus, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { authAPI } from '../services/api';

interface InvitationDetails {
  email: string;
  organization: {
    _id: string;
    name: string;
    description: string;
  };
  role: string;
  invitedBy: {
    name: string;
    email: string;
  };
  invitedAt: string;
  teamAssignments?: Array<{
    team: {
      _id: string;
      name: string;
      description?: string;
    };
    role: string;
  }>;
  projectAssignments?: Array<{
    project: {
      _id: string;
      name: string;
      description?: string;
    };
    role: string;
  }>;
  invitationContext?: string;
  message?: string;
}

interface AcceptInvitationForm {
  name: string;
  password: string;
  confirmPassword: string;
}

const AcceptInvitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login, user, logout } = useAuth();
  const { addNotification } = useNotification();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<AcceptInvitationForm>();
  const password = watch('password');

  useEffect(() => {
    if (token) {
      // Check if user is already logged in
      if (user) {
        setAlreadyLoggedIn(true);
      }
      loadInvitationDetails();
    }
  }, [token, user]);

  const loadInvitationDetails = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getInvitationDetails(token!);
      setInvitation(response);
    } catch (error: any) {
      console.error('Failed to load invitation details:', error);
      setError(error.response?.data?.message || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AcceptInvitationForm) => {
    if (!token) return;
    
    setAccepting(true);
    try {
      const response = await authAPI.acceptInvitation(token, data.name, data.password);

      // Store assignment information for onboarding
      if (response.assignments) {
        sessionStorage.setItem('invitationAssignments', JSON.stringify(response.assignments));
        sessionStorage.setItem('showOnboarding', 'true');
      }

      // Log the user in with the returned token and user data (if not already logged in)
      if (!alreadyLoggedIn) {
        login(response.user, response.token);
      }
      
      addNotification({
        type: 'success',
        title: 'Welcome!',
        message: response.message,
      });

      // Redirect to dashboard with onboarding flag
      navigate('/dashboard?onboarding=true');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Accept Invitation',
        message: error.response?.data?.message || 'Failed to accept invitation',
      });
    } finally {
      setAccepting(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'team_lead':
        return 'Team Lead';
      case 'member':
        return 'Member';
      case 'org_admin':
        return 'Organization Admin';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }
  
  // Handle case where user is already logged in and invitation is for their email
  if (alreadyLoggedIn && invitation && user && user.email === invitation.email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            You're Already a Member
          </h2>
          <p className="text-gray-600 mb-6">
            You're already logged in as <strong>{user.email}</strong> and are part of <strong>{invitation.organization.name}</strong>. 
            No further action is needed.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary btn-md"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Handle case where user is already logged in but invitation is for a different email
  if (alreadyLoggedIn && invitation && user && user.email !== invitation.email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account Mismatch
          </h2>
          <p className="text-gray-600 mb-6">
            You're currently logged in as <strong>{user.email}</strong> but this invitation is for <strong>{invitation.email}</strong>. 
            Please log out first or use a different browser to accept this invitation.
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-outline btn-md"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                // Log out and redirect back to this invitation link
                const currentUrl = window.location.href;
                sessionStorage.setItem('redirectAfterLogout', currentUrl);
                // Use the logout function from the auth context
                logout();
                // Reload the page to reflect the logged out state
                setTimeout(() => window.location.href = currentUrl, 100);
              }}
              className="btn-primary btn-md"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Invitation
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary btn-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            You're Invited!
          </h2>
          <p className="mt-2 text-gray-600">
            Complete your profile to join the team
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {invitation.organization.name}
            </h3>
            {invitation.organization.description && (
              <p className="text-sm text-gray-600 mt-1">
                {invitation.organization.description}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {invitation.invitedBy.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Invited by {invitation.invitedBy.name}
                </p>
                <p className="text-xs text-blue-700">
                  {invitation.invitedBy.email}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-700">
              <p>
                <strong>Role:</strong> {getRoleDisplayName(invitation.role)}
              </p>
              <p>
                <strong>Email:</strong> {invitation.email}
              </p>
              <p>
                <strong>Invited:</strong> {new Date(invitation.invitedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Invitation Context */}
          {invitation.invitationContext && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-amber-900 mb-2">
                Why you're being invited:
              </h4>
              <p className="text-sm text-amber-800">{invitation.invitationContext}</p>
            </div>
          )}

          {/* Personal Message */}
          {invitation.message && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-purple-900 mb-2">
                Personal Message:
              </h4>
              <p className="text-sm text-purple-800 italic">"{invitation.message}"</p>
            </div>
          )}

          {/* Team Assignments */}
          {invitation.teamAssignments && invitation.teamAssignments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-900 mb-3">
                Team Assignments:
              </h4>
              <div className="space-y-2">
                {invitation.teamAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        {assignment.team.name}
                      </p>
                      {assignment.team.description && (
                        <p className="text-xs text-blue-600">
                          {assignment.team.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {assignment.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Assignments */}
          {invitation.projectAssignments && invitation.projectAssignments.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-green-900 mb-3">
                Project Assignments:
              </h4>
              <div className="space-y-2">
                {invitation.projectAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {assignment.project.name}
                      </p>
                      {assignment.project.description && (
                        <p className="text-xs text-green-600">
                          {assignment.project.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {assignment.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accept Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                {...register('name', { 
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                className="input w-full"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                className="input w-full"
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                {...register('confirmPassword', { 
                  required: 'Please confirm your password',
                  validate: value => value === password || 'Passwords do not match'
                })}
                className="input w-full"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={accepting}
              className="btn-primary btn-md w-full"
            >
              {accepting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By accepting this invitation, you agree to join {invitation.organization.name} and
              collaborate on their projects and teams.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            What happens next?
          </h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li className="flex items-center">
              <ArrowRight className="w-3 h-3 mr-2" />
              Your account will be created automatically
            </li>
            <li className="flex items-center">
              <ArrowRight className="w-3 h-3 mr-2" />
              You'll be added to {invitation.organization.name}
            </li>
            {invitation.teamAssignments && invitation.teamAssignments.length > 0 && (
              <li className="flex items-center">
                <ArrowRight className="w-3 h-3 mr-2" />
                You'll be assigned to {invitation.teamAssignments.length} team{invitation.teamAssignments.length > 1 ? 's' : ''}
              </li>
            )}
            {invitation.projectAssignments && invitation.projectAssignments.length > 0 && (
              <li className="flex items-center">
                <ArrowRight className="w-3 h-3 mr-2" />
                You'll be part of {invitation.projectAssignments.length} project{invitation.projectAssignments.length > 1 ? 's' : ''}
              </li>
            )}
            <li className="flex items-center">
              <ArrowRight className="w-3 h-3 mr-2" />
              You can start collaborating right away
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
