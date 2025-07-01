import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Users, 
  Settings, 
  FolderOpen,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Shield,
  User,
  Plus,
  Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { teamAPI, projectAPI, organizationAPI, userAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';
import { debounce } from '../utils/debounce';

interface Team {
  _id: string;
  name: string;
  description: string;
  organization: {
    _id: string;
    name: string;
  };
  lead: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
    };
    role: 'lead' | 'member' | 'viewer';
    joinedAt: string;
  }>;
  projects: Array<{
    _id: string;
    name: string;
    description: string;
    createdAt: string;
    members: Array<{
      user: string;
    }>;
  }>;
  settings: {
    allowGuestAccess: boolean;
    requireApprovalForProjects: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface UpdateRoleForm {
  role: 'member' | 'viewer';
}

interface AddMemberForm {
  userId: string;
  role: 'member' | 'viewer';
}

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateRoleModal, setShowUpdateRoleModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<UpdateRoleForm>();
  const { register: registerMember, handleSubmit: handleSubmitMember, reset: resetMember, formState: { errors: memberErrors } } = useForm<AddMemberForm>();

  const debouncedMemberSearch = debounce((searchTerm: string) => {
    loadOrganizationMembers(searchTerm);
  }, 300);

  useEffect(() => {
    if (id) {
      loadTeamDetail();
      loadOrganizationMembers();
    }
  }, [id]);

  useEffect(() => {
    if (showAddMemberModal && team) {
      debouncedMemberSearch(memberSearch);
    }
  }, [memberSearch, showAddMemberModal, team]);

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadTeamDetail = async () => {
    try {
      setLoading(true);
      const [teamData, projectsData] = await Promise.all([
        teamAPI.getTeam(id!),
        teamAPI.getTeamProjects(id!),
      ]);
      
      setTeam({ ...teamData, projects: projectsData });
    } catch (error) {
      console.error('Failed to load team details:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load team details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) {
      return;
    }

    try {
      await teamAPI.removeMember(id!, memberId);
      addNotification({
        type: 'success',
        title: 'Member Removed',
        message: `${memberName} has been removed from the team`,
      });
      loadTeamDetail(); // Refresh data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to remove member',
      });
    }
  };

  const onUpdateRole = async (data: UpdateRoleForm) => {
    if (!selectedMember) return;

    try {
      await teamAPI.updateMemberRole(id!, selectedMember.user._id, data.role);
      addNotification({
        type: 'success',
        title: 'Role Updated',
        message: `${selectedMember.user.name}'s role has been updated`,
      });
      setShowUpdateRoleModal(false);
      setSelectedMember(null);
      loadTeamDetail(); // Refresh data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update role',
      });
    }
  };

  const openUpdateRoleModal = (member: any) => {
    setSelectedMember(member);
    setValue('role', member.role === 'lead' ? 'member' : member.role);
    setShowUpdateRoleModal(true);
  };

  const loadOrganizationMembers = async (search?: string) => {
    if (!team) {
      setOrganizationMembers([]);
      return;
    }
    try {
      setLoadingMembers(true);
      const response = await userAPI.getAllUsersForSelection();
      const allUsers = response.users || [];
      const existingMemberIds = team.members?.map(member => member.user._id || member.user) || [];
      let availableUsers = allUsers.filter((user: { _id: string | { _id: string; name: string; email: string; }; }) => !existingMemberIds.includes(user._id));
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        availableUsers = availableUsers.filter((user: { name: string; email: string; }) =>
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }
      availableUsers = availableUsers.slice(0, 50);
      setOrganizationMembers(availableUsers);
    } catch (error) {
      setOrganizationMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const onAddMember = async (data: AddMemberForm) => {
    if (!team) return;

    try {
      await teamAPI.addMember(team._id, data.userId, data.role);
      addNotification({
        type: 'success',
        title: 'Member Added',
        message: 'Team member added successfully',
      });
      resetMember();
      setShowAddMemberModal(false);
      loadTeamDetail(); // Refresh team data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Team Not Found</h3>
        <p className="text-gray-500">The team you're looking for doesn't exist.</p>
        <Link to="/teams" className="btn-primary btn-sm mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Link>
      </div>
    );
  }

  // Check permissions
  const isTeamLead = user?._id === team.lead._id;
  const isOrgAdmin = user?.role === 'super_admin' || user?.role === 'org_admin';
  const canManageTeam = isTeamLead || isOrgAdmin;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'lead':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'member':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'viewer':
        return <User className="w-4 h-4 text-gray-400" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'lead':
        return 'Team Lead';
      case 'member':
        return 'Member';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/teams"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-gray-600">{team.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              Organization: <Link to="/organization" className="text-blue-600 hover:text-blue-700">{team.organization.name}</Link>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {canManageTeam && (
            <>
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="btn-outline btn-md"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </button>
              <button 
                onClick={() => navigate(`/teams/${id}/settings`)}
                className="btn-outline btn-md"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </>
          )}
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{team.members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <FolderOpen className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{team.projects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Team Lead</p>
              <p className="text-lg font-bold text-gray-900">{team.lead.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              {canManageTeam && (
                <button 
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn-primary btn-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {team.members.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                      <p className="text-xs text-gray-400">
                        {getRoleName(member.role)} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {canManageTeam && member.user._id !== team.lead._id && (
                    <div className="relative">
                      <button 
                        onClick={() => setDropdownOpen(dropdownOpen === member.user._id ? null : member.user._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {dropdownOpen === member.user._id && (
                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[140px]">
                          <button
                            onClick={() => {
                              setDropdownOpen(null);
                              openUpdateRoleModal(member);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Update Role</span>
                          </button>
                          <button
                            onClick={() => {
                              setDropdownOpen(null);
                              handleRemoveMember(member.user._id, member.user.name);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Projects */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Team Projects</h2>
              <Link
                to={`/projects/create?team=${id}`}
                className="btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Link>
            </div>
          </div>
          <div className="p-6">
            {team.projects.length > 0 ? (
              <div className="space-y-4">
                {team.projects.map((project) => (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="inline-flex items-center text-xs text-gray-500">
                            <Users className="w-3 h-3 mr-1" />
                            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-400">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No projects yet</p>
                <Link
                  to={`/projects/create?team=${id}`}
                  className="btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{team.description || 'No description provided'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Guest Access</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  team.settings.allowGuestAccess 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {team.settings.allowGuestAccess ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Project Approval</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  team.settings.requireApprovalForProjects 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {team.settings.requireApprovalForProjects ? 'Required' : 'Not Required'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
            <p className="text-sm text-gray-600">{new Date(team.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h3>
            <p className="text-sm text-gray-600">{new Date(team.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Update Role Modal */}
      <Modal
        isOpen={showUpdateRoleModal}
        onClose={() => setShowUpdateRoleModal(false)}
        title={`Update Role - ${selectedMember?.user.name}`}
        size="sm"
      >
        <form onSubmit={handleSubmit(onUpdateRole)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              New Role *
            </label>
            <select {...register('role', { required: 'Role is required' })} className="input w-full">
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Role Permissions:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Member:</strong> Can create and edit tasks, participate in projects</li>
              <li>• <strong>Viewer:</strong> Can view projects and tasks only</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowUpdateRoleModal(false)}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary btn-md"
            >
              Update Role
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setMemberSearch('');
          resetMember();
        }}
        title={`Add Member to ${team?.name}`}
      >
        <form onSubmit={handleSubmitMember(onAddMember)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="input-field mb-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User
              {loadingMembers && (
                <span className="ml-2 text-xs text-gray-500">(Loading...)</span>
              )}
            </label>
            <select
              {...registerMember('userId', { required: 'Please select a user' })}
              className="input-field"
              disabled={loadingMembers}
            >
              <option value="">
                {loadingMembers
                  ? 'Loading users...'
                  : organizationMembers.length === 0
                    ? 'No available users found'
                    : 'Choose a user...'}
              </option>
              {organizationMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
            {memberErrors.userId && (
              <p className="mt-1 text-sm text-red-600">{memberErrors.userId.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              {...registerMember('role', { required: 'Please select a role' })}
              className="input-field"
            >
              <option value="">Select role...</option>
              <option value="viewer">Viewer - Can view team and projects</option>
              <option value="member">Member - Can participate in projects</option>
            </select>
            {memberErrors.role && (
              <p className="mt-1 text-sm text-red-600">{memberErrors.role.message}</p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <h4 className="font-medium mb-2">Role Permissions:</h4>
            <ul className="space-y-1 text-xs">
              <li><strong>Viewer:</strong> View team, projects, and tasks</li>
              <li><strong>Member:</strong> All viewer permissions + participate in projects</li>
            </ul>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberSearch('');
                resetMember();
              }}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamDetail;
