import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Send, X, UserPlus, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { organizationAPI } from '../../services/api';
import LoadingSpinner from './LoadingSpinner';

interface InviteFormData {
  emails: string;
  role: 'member' | 'team_lead';
  message?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitesSent: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onInvitesSent }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>();

  const onSubmit = async (data: InviteFormData) => {
    if (!user?.organization) return;

    setSending(true);
    try {
      // Parse emails (split by comma, semicolon, or newline)
      const emailList = data.emails
        .split(/[,;\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const response = await organizationAPI.inviteMembers(user.organization._id, {
        emails: emailList,
        role: data.role,
        message: data.message,
      });

      // Generate invite link for sharing
      if (response.inviteToken) {
        const link = `${window.location.origin}/invite/${response.inviteToken}`;
        setInviteLink(link);
      }

      addNotification({
        type: 'success',
        title: 'Invitations Sent',
        message: `Sent ${emailList.length} invitation${emailList.length > 1 ? 's' : ''} successfully`,
      });

      onInvitesSent();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to send invitations',
      });
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      addNotification({
        type: 'success',
        title: 'Link Copied',
        message: 'Invite link copied to clipboard',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to copy link to clipboard',
      });
    }
  };

  const handleClose = () => {
    reset();
    setInviteLink(null);
    setCopySuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Invite Team Members
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white px-6 py-4">
            {!inviteLink ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Addresses */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Addresses *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      {...register('emails', { 
                        required: 'At least one email address is required',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+/,
                          message: 'Please enter valid email addresses'
                        }
                      })}
                      className="textarea pl-10 w-full"
                      rows={4}
                      placeholder="Enter email addresses separated by commas, semicolons, or new lines..."
                    />
                  </div>
                  {errors.emails && (
                    <p className="mt-1 text-sm text-red-600">{errors.emails.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    You can enter multiple email addresses separated by commas, semicolons, or new lines
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Default Role *
                  </label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="input w-full"
                  >
                    <option value="member">Member - Can participate in teams and projects</option>
                    <option value="team_lead">Team Lead - Can manage teams and projects</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                {/* Personal Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    {...register('message')}
                    className="textarea w-full"
                    rows={3}
                    placeholder="Add a personal message to the invitation..."
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Invitation Preview</h4>
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>{user?.name}</strong> has invited you to join{' '}
                      <strong>{user?.organization?.name}</strong> on TaskFlow.
                    </p>
                    <p>You'll be added as a <strong>Member</strong> with access to collaborate on projects and teams.</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn-outline btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary btn-md"
                  >
                    {sending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {sending ? 'Sending...' : 'Send Invitations'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success State with Invite Link */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Invitations Sent Successfully!
                  </h3>
                  <p className="text-gray-600">
                    Email invitations have been sent. You can also share this invite link:
                  </p>
                </div>

                {/* Invite Link */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Shareable Invite Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="input flex-1 bg-white"
                    />
                    <button
                      onClick={copyInviteLink}
                      className={`btn-outline btn-md ${copySuccess ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      {copySuccess ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    This link can be used by anyone to join your organization
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleClose}
                    className="btn-primary btn-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
