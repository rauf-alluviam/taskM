import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Users, 
  Edit, 
  UserPlus,
  FolderOpen,
  Shield,
  User,
  ArrowLeft,
  Mail,
  Calendar,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { teamAPI, organizationAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';


interface Team {
  _id: string;
  name: string;
  description: string;
  organization: {
    _id: string;
    name: string;
  } | string;
  lead: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  members: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    role: 'lead' | 'member';
    joinedAt: string;
  }>;
  projects: Array<{
    _id: string;
    name: string;
    description: string;
    status: string;
  }>;
  settings: {
    allowGuestAccess: boolean;
    requireApprovalForProjects: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

interface EditTeamForm {
  name: string;
  description: string;
}

interface AddMemberForm {
  userId: string;
  role: 'member';
}

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [editingTeam, setEditingTeam] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EditTeamForm>();
  const { register: registerMember, handleSubmit: handleSubmitMember, reset: resetMember, formState: { errors: memberErrors } } = useForm<AddMemberForm>();

  useEffect(() => {
    if (id) {
      loadTeamDetails();
      loadTeamProjects();
      loadOrganizationMembers();
    }
  }, [id]);

  const loadTeamDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const teamData = await teamAPI.getTeam(id);
      setTeam(teamData);
      
      // Set form values for editing
      setValue('name', teamData.name);
      setValue('description', teamData.description || '');
    } catch (error: any) {
      console.error('Failed to load team:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load team details',
      });
      // Redirect to teams page if team not found
      if (error.response?.status === 404) {
        navigate('/teams');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTeamProjects = async () => {
    if (!id) return;
    
    try {
      const projectsData = await teamAPI.getTeamProjects(id);
      setProjects(projectsData);
    } catch (error: any) {
      console.error('Failed to load team projects:', error);
    }
  };

  const loadOrganizationMembers = async () => {
    if (!user?.organization?._id) {
      setOrganizationMembers([]);
      return;
    }
    
    try {
      const members = await organizationAPI.getMembers(user.organization._id);
      setOrganizationMembers(members.members || []);
    } catch (error) {
      console.error('Failed to load organization members:', error);
      setOrganizationMembers([]);
    }
  };

  const handleEditTeam = async (data: EditTeamForm) => {
    if (!id || !team) return;
    
    setEditingTeam(true);
    try {
      const updatedTeam = await teamAPI.updateTeam(id, data);
      setTeam(updatedTeam);
      setShowEditModal(false);
      addNotification({
        type: 'success',
        title: 'Team Updated',
        message: `${data.name} has been updated successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update team',
      });
    } finally {
      setEditingTeam(false);
    }
  };

  const handleAddMember = async (data: AddMemberForm) => {
    if (!id || !team) return;
    
    try {
      const updatedTeam = await teamAPI.addMember(id, data.userId, data.role);
      setTeam(updatedTeam);
      setShowAddMemberModal(false);
      resetMember();
      addNotification({
        type: 'success',
        title: 'Member Added',
        message: 'Team member has been added successfully',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member',
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id || !team) return;
    
    const member = team.members.find(m => m.user._id === userId);
    if (!member) return;
    
    if (!window.confirm(`Are you sure you want to remove ${member.user.name} from the team?`)) {
      return;
    }
    
    try {
      const updatedTeam = await teamAPI.removeMember(id, userId);
      setTeam(updatedTeam);
      addNotification({
        type: 'success',
        title: 'Member Removed',
        message: `${member.user.name} has been removed from the team`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to remove member',
      });
    }
  };

  // Check permissions
  const canEdit = team && (team.lead._id === user?._id || user?.role === 'super_admin' || user?.role === 'org_admin');
  const canManageMembers = canEdit;

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
        <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Team not found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The team you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link to="/teams" className="btn-primary btn-md">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/teams" 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{team.description}</p>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-outline btn-md"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Team
            </button>
            {canManageMembers && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="btn-primary btn-md"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{team.members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Lead */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Lead</h2>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {team.lead.avatar ? (
              <img src={team.lead.avatar} alt={team.lead.name} className="w-12 h-12 rounded-full" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{team.lead.name}</h3>
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {team.lead.email}
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Members</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {team.members.length > 0 ? (
          <div className="space-y-3">
            {team.members.map((member) => (
              <div key={member.user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt={member.user.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{member.user.name}</h4>
                      {member.role === 'lead' && (
                        <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full capitalize">
                    {member.role}
                  </span>
                  {canManageMembers && member.role !== 'lead' && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === member.user._id ? null : member.user._id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {dropdownOpen === member.user._id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[120px]">
                          <button
                            onClick={() => {
                              handleRemoveMember(member.user._id);
                              setDropdownOpen(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No team members yet</p>
          </div>
        )}
      </div>

      {/* Team Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Projects</h2>
          <Link to={`/projects/create?team=${team._id}`} className="btn-primary btn-sm">
            <FolderOpen className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </div>
        
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{project.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                      {project.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No projects yet</p>
            <Link to={`/projects/create?team=${team._id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block">
              Create the first project
            </Link>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          reset();
        }}
        title="Edit Team"
        size="md"
      >
        <form onSubmit={handleSubmit(handleEditTeam)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Team Name *
            </label>
            <input
              {...register('name', { required: 'Team name is required' })}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
              placeholder="Enter team name..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
              placeholder="Describe the team's purpose..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                reset();
              }}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editingTeam}
              className="btn-primary btn-md"
            >
              {editingTeam ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          resetMember();
        }}
        title={`Add Member to ${team.name}`}
        size="md"
      >
        <form onSubmit={handleSubmitMember(handleAddMember)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Select Member *
            </label>
            <select 
              {...registerMember('userId', { required: 'Please select a member' })} 
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="">Choose a member...</option>
              {organizationMembers
                .filter(member => 
                  // Exclude current team members
                  !team.members.some(teamMember => teamMember.user._id === member._id)
                )
                .map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} - {member.email}
                  </option>
                ))}
            </select>
            {memberErrors.userId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{memberErrors.userId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Role *
            </label>
            <select {...registerMember('role', { required: 'Role is required' })} className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
              <option value="member">Member</option>
            </select>
            {memberErrors.role && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{memberErrors.role.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                resetMember();
              }}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary btn-md"
            >
              Add Member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamDetail;
