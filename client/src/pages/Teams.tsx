import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserPlus,
  FolderOpen,
  Shield,
  User,
  Crown
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
  organization: string;
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
    role: 'lead' | 'member';
    joinedAt: string;
  }>;
  projects: string[];
  settings: {
    allowGuestAccess: boolean;
    requireApprovalForProjects: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface TeamForm {
  name: string;
  description: string;
  leadId?: string;
}

interface AddMemberForm {
  userId: string;
  role: 'member';
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamForm>();
  const { register: registerMember, handleSubmit: handleSubmitMember, reset: resetMember, formState: { errors: memberErrors } } = useForm<AddMemberForm>();

  // Memoized functions to prevent unnecessary re-renders
  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teamAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load teams',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadOrganizationMembers = useCallback(async () => {
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
  }, [user?.organization?._id]);

  useEffect(() => {
    loadTeams();
    loadOrganizationMembers();
    
    // Auto-open create modal if accessing /teams/create
    if (location.pathname === '/teams/create') {
      setShowCreateModal(true);
    }
  }, [location.pathname, loadTeams, loadOrganizationMembers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if click is outside the dropdown
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setDropdownOpen(null);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const onCreateTeam = async (data: TeamForm) => {
    setCreating(true);
    try {
      const newTeam = await teamAPI.createTeam({
        name: data.name,
        description: data.description,
        leadId: data.leadId,
      });
      setTeams(prev => [newTeam, ...prev]);
      reset();
      setShowCreateModal(false);
      
      // Navigate back to /teams if we came from /teams/create
      if (location.pathname === '/teams/create') {
        navigate('/teams', { replace: true });
      }
      
      addNotification({
        type: 'success',
        title: 'Team Created',
        message: `"${newTeam.name}" has been created successfully`,
      });
    } catch (error: any) {
      console.error('Failed to create team:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create team',
      });
    } finally {
      setCreating(false);
    }
  };

  const onAddMember = async (data: AddMemberForm) => {
    if (!selectedTeam) return;

    try {
      await teamAPI.addMember(selectedTeam._id, data.userId, data.role);
      addNotification({
        type: 'success',
        title: 'Member Added',
        message: 'Team member added successfully',
      });
      resetMember();
      setShowAddMemberModal(false);
      loadTeams(); // Refresh teams
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member',
      });
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!window.confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await teamAPI.deleteTeam(team._id);
      setTeams(prev => prev.filter(t => t._id !== team._id));
      addNotification({
        type: 'success',
        title: 'Team Deleted',
        message: `"${team.name}" has been deleted successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete team',
      });
    }
  };

  const filteredTeams = React.useMemo(() => 
    teams.filter(team =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description.toLowerCase().includes(searchTerm.toLowerCase())
    ), [teams, searchTerm]
  );

  // Check permissions
  const canManageTeams = user?.role === 'super_admin' || user?.role === 'org_admin';
  const canCreateTeams = (canManageTeams || user?.role === 'team_lead') && user?.organization?._id;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'lead':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'member':
        return <User className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    reset();
    // If we came from /teams/create route, navigate back to /teams
    if (location.pathname === '/teams/create') {
      navigate('/teams', { replace: true });
    }
  }, [location.pathname, navigate, reset]);

  const handleDropdownToggle = useCallback((teamId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDropdownOpen(prev => prev === teamId ? null : teamId);
  }, []);

  const handleDropdownAction = useCallback((action: () => void) => {
    setDropdownOpen(null);
    action();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Check */}
      {!user?.organization?._id && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Organization Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to be part of an organization to create and manage teams.{' '}
                  <Link to="/organization/create" className="font-medium underline hover:text-yellow-600">
                    Create an organization
                  </Link>{' '}
                  or contact your administrator to be added to one.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-1">Manage your organization's teams</p>
        </div>
        {canCreateTeams && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-md mt-4 sm:mt-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Team
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search teams..."
          className="input pl-10 w-full sm:w-80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <div key={team._id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="relative" data-dropdown>
                    <button 
                      onClick={(e) => handleDropdownToggle(team._id, e)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                      aria-label="Team actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {dropdownOpen === team._id && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px]">
                        <Link
                          to={`/teams/${team._id}`}
                          onClick={() => setDropdownOpen(null)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Users className="w-3 h-3" />
                          <span>View Details</span>
                        </Link>
                        {canManageTeams && (
                          <>
                            <button
                              onClick={() => handleDropdownAction(() => {
                                setSelectedTeam(team);
                                setShowAddMemberModal(true);
                              })}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Add Member</span>
                            </button>
                            <button
                              onClick={() => handleDropdownAction(() => 
                                navigate(`/teams/${team._id}/edit`)
                              )}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDropdownAction(() => 
                                handleDeleteTeam(team)
                              )}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Link to={`/teams/${team._id}`} className="block">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                    {team.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {team.description}
                  </p>
                </Link>

                {/* Team Lead */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">{team.lead.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Team Lead</p>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {(team.members || []).length} member{(team.members || []).length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center">
                      <FolderOpen className="w-4 h-4 mr-1" />
                      {/* {team.projects } project{team.projects !== 1 ? 's' : ''} */}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No teams found' : 'No teams yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Create your first team to get started'
            }
          </p>
          {!searchTerm && canCreateTeams && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </button>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create New Team"
        size="md"
      >
        <form onSubmit={handleSubmit(onCreateTeam)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Team Name *
            </label>
            <input
              {...register('name', { required: 'Team name is required' })}
              className="input w-full"
              placeholder="Enter team name..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full"
              placeholder="Describe the team's purpose..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Team Lead
            </label>
            <select {...register('leadId')} className="input w-full">
              <option value="">Select a team lead (optional)</option>
              {(organizationMembers || [])
                .map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} - {member.email}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              If no lead is selected, you will be assigned as the team lead
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-md"
            >
              {creating ? 'Creating...' : 'Create Team'}
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
          setSelectedTeam(null);
        }}
        title={`Add Member to ${selectedTeam?.name}`}
        size="md"
      >
        <form onSubmit={handleSubmitMember(onAddMember)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select Member *
            </label>
            <select 
              {...registerMember('userId', { required: 'Please select a member' })} 
              className="input w-full"
            >
              <option value="">Choose a member...</option>
              {(organizationMembers || [])
                .filter(member => 
                  !selectedTeam?.members?.some(teamMember => teamMember.user._id === member._id)
                )
                .map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} - {member.email}
                  </option>
                ))}
            </select>
            {memberErrors.userId && (
              <p className="mt-1 text-sm text-red-600">{memberErrors.userId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Role *
            </label>
            <select {...registerMember('role', { required: 'Role is required' })} className="input w-full">
              <option value="member">Member</option>
            </select>
            {memberErrors.role && (
              <p className="mt-1 text-sm text-red-600">{memberErrors.role.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                resetMember();
                setSelectedTeam(null);
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

export default Teams;