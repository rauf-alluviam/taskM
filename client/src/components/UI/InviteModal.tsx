import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Send, X, UserPlus, Copy, Check, Users, FolderOpen, Plus, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { organizationAPI, teamAPI, projectAPI } from '../../services/api';
import LoadingSpinner from './LoadingSpinner';

interface TeamAssignment {
  team: string;
  role: string;
}

interface ProjectAssignment {
  project: string;
  role: string;
}

interface InviteFormData {
  emails: string;
  role: 'member' | 'team_lead';
  message?: string;
  invitationContext?: string;
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
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>();

  // Load teams and projects when modal opens
  useEffect(() => {
    if (isOpen && user?.organization) {
      loadTeamsAndProjects();
    }
  }, [isOpen, user?.organization]);

  const loadTeamsAndProjects = async () => {
    if (!user?.organization) return;
    
    try {
      setLoadingData(true);
      const [teamsData, projectsData] = await Promise.all([
        teamAPI.getTeams(),
        projectAPI.getProjects()
      ]);
      setTeams(teamsData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Failed to load teams and projects:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load teams and projects',
      });
    } finally {
      setLoadingData(false);
    }
  };

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
        invitationContext: data.invitationContext,
        teamAssignments,
        projectAssignments,
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
    setTeamAssignments([]);
    setProjectAssignments([]);
    onClose();
  };

  const addTeamAssignment = () => {
    setTeamAssignments([...teamAssignments, { team: '', role: 'member' }]);
  };

  const removeTeamAssignment = (index: number) => {
    setTeamAssignments(teamAssignments.filter((_, i) => i !== index));
  };

  const updateTeamAssignment = (index: number, field: 'team' | 'role', value: string) => {
    const updated = [...teamAssignments];
    updated[index][field] = value;
    setTeamAssignments(updated);
  };

  const addProjectAssignment = () => {
    setProjectAssignments([...projectAssignments, { project: '', role: 'member' }]);
  };

  const removeProjectAssignment = (index: number) => {
    setProjectAssignments(projectAssignments.filter((_, i) => i !== index));
  };

  const updateProjectAssignment = (index: number, field: 'project' | 'role', value: string) => {
    const updated = [...projectAssignments];
    updated[index][field] = value;
    setProjectAssignments(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
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
          <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
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

                {/* Invitation Context */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Invitation Context (Optional)
                  </label>
                  <textarea
                    {...register('invitationContext')}
                    className="textarea w-full"
                    rows={2}
                    placeholder="Explain why you're inviting them (e.g., 'We need your expertise in UI/UX design')"
                  />
                </div>

                {/* Team Assignments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-900">
                      Team Assignments (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addTeamAssignment}
                      disabled={loadingData || teams.length === 0}
                      className="btn-outline btn-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Team
                    </button>
                  </div>
                  
                  {loadingData ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-gray-500">Loading teams...</span>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No teams available for assignment
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamAssignments.map((assignment, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Users className="w-4 h-4 text-blue-600" />
                          <select
                            value={assignment.team}
                            onChange={(e) => updateTeamAssignment(index, 'team', e.target.value)}
                            className="input flex-1"
                          >
                            <option value="">Select a team</option>
                            {teams.map((team) => (
                              <option key={team._id} value={team._id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={assignment.role}
                            onChange={(e) => updateTeamAssignment(index, 'role', e.target.value)}
                            className="input w-32"
                          >
                            <option value="member">Member</option>
                            <option value="lead">Team Lead</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeTeamAssignment(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Assignments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-900">
                      Project Assignments (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={addProjectAssignment}
                      disabled={loadingData || projects.length === 0}
                      className="btn-outline btn-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Project
                    </button>
                  </div>
                  
                  {loadingData ? (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-gray-500">Loading projects...</span>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No projects available for assignment
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projectAssignments.map((assignment, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                          <FolderOpen className="w-4 h-4 text-green-600" />
                          <select
                            value={assignment.project}
                            onChange={(e) => updateProjectAssignment(index, 'project', e.target.value)}
                            className="input flex-1"
                          >
                            <option value="">Select a project</option>
                            {projects.map((project) => (
                              <option key={project._id} value={project._id}>
                                {project.name} {project.department && `(${project.department})`}
                              </option>
                            ))}
                          </select>
                          <select
                            value={assignment.role}
                            onChange={(e) => updateProjectAssignment(index, 'role', e.target.value)}
                            className="input w-32"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeProjectAssignment(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Invitation Preview</h4>
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">
                      <strong>{user?.name}</strong> has invited you to join{' '}
                      <strong>{user?.organization?.name}</strong> on TaskFlow.
                    </p>
                    <p className="mb-3">You'll be added as a <strong>Member</strong> with access to collaborate on projects and teams.</p>
                    
                    {teamAssignments.length > 0 && (
                      <div className="mb-3">
                        <p className="font-medium text-blue-800 mb-1">Team Assignments:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {teamAssignments
                            .filter(assignment => assignment.team)
                            .map((assignment, index) => {
                              const team = teams.find(t => t._id === assignment.team);
                              return (
                                <li key={index} className="text-blue-700 text-xs">
                                  <strong>{team?.name || 'Unknown Team'}</strong> ({assignment.role})
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
                    
                    {projectAssignments.length > 0 && (
                      <div className="mb-3">
                        <p className="font-medium text-green-800 mb-1">Project Assignments:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {projectAssignments
                            .filter(assignment => assignment.project)
                            .map((assignment, index) => {
                              const project = projects.find(p => p._id === assignment.project);
                              return (
                                <li key={index} className="text-green-700 text-xs">
                                  <strong>{project?.name || 'Unknown Project'}</strong> ({assignment.role})
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
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
