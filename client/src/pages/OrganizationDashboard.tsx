import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Settings, 
  Plus,
  BarChart3,
  FolderOpen,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Crown,
  Shield,
  User,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { organizationAPI, teamAPI, projectAPI, taskAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';

interface Organization {
  _id: string;
  name: string;
  domain: string;
  billingPlan: string;
  memberCount: number;
  teamCount: number;
  projectCount: number;
  createdAt: string;
  settings: {
    allowPublicProjects: boolean;
    requireApprovalForProjects: boolean;
    defaultProjectVisibility: string;
  };
}

interface Team {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  projectCount: number;
  lead: {
    _id: string;
    name: string;
    email: string;
  };
}

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  teams: Array<{
    team: { _id: string; name: string };
    role: string;
  }>;
}

interface InviteForm {
  email: string;
  role: 'org_admin' | 'team_lead' | 'member';
}

const OrganizationDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeMembers: 0,
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>();

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user?.organization) {
      loadOrganizationData();
    }
  }, [user]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const [orgData, teamsData, membersData, projectsData, tasksData] = await Promise.allSettled([
        organizationAPI.getOrganization(user!.organization!._id),
        teamAPI.getTeams(),
        organizationAPI.getMembers(user!.organization!._id),
        projectAPI.getProjects(),
        taskAPI.getTasks(),
      ]);

      if (orgData.status === 'fulfilled') {
        setOrganization(orgData.value);
      }

      if (teamsData.status === 'fulfilled') {
        setTeams(teamsData.value);
      }

      if (membersData.status === 'fulfilled') {
        setMembers(membersData.value.members);
      }

      if (projectsData.status === 'fulfilled' && tasksData.status === 'fulfilled') {
        const projects = projectsData.value;
        const tasks = tasksData.value;
        const completedTasks = tasks.filter((task: any) => task.status === 'done').length;
        
        setStats({
          totalProjects: projects.length,
          totalTasks: tasks.length,
          completedTasks,
          activeMembers: membersData.status === 'fulfilled' ? 
            membersData.value.members.filter((m: any) => m.status === 'active').length : 0,
        });
      }
    } catch (error) {
      console.error('Failed to load organization data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load organization data',
      });
    } finally {
      setLoading(false);
    }
  };

  const onInviteMember = async (data: InviteForm) => {
    setInviting(true);
    try {
      await organizationAPI.inviteMembers(user!.organization!._id, {
        emails: [data.email],
        role: data.role
      });
      addNotification({
        type: 'success',
        title: 'Invitation Sent',
        message: `Invitation sent to ${data.email}`,
      });
      reset();
      setShowInviteModal(false);
      loadOrganizationData();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Invitation Failed',
        message: error.response?.data?.message || 'Failed to send invitation',
      });
    } finally {
      setInviting(false);
    }
  };

  const canManageOrganization = user?.role === 'super_admin' || user?.role === 'org_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-white dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 min-h-screen">
        <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Organization Found</h3>
        <p className="text-gray-500 dark:text-gray-400">You don't belong to any organization yet.</p>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'blue',
      change: '+5%',
    },
    {
      name: 'Active Tasks',
      value: stats.totalTasks - stats.completedTasks,
      icon: CheckSquare,
      color: 'purple',
      change: '+12%',
    },
    {
      name: 'Completed Tasks',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'green',
      change: '+8%',
    },
    {
      name: 'Team Members',
      value: stats.activeMembers,
      icon: Users,
      color: 'orange',
      change: '+3%',
    },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'org_admin':
        return <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'team_lead':
        return <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Organization Admin';
      case 'team_lead':
        return 'Team Lead';
      case 'member':
        return 'Member';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getStatCardClasses = (color: string) => {
    const colorClasses = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="space-y-6 p-6">
        {/* Dark Mode Toggle */}
        {/* <div className="flex justify-end">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div> */}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl p-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{organization.name}</h1>
              <p className="text-blue-100 dark:text-blue-200 text-lg">
                Organization Dashboard - {organization.billingPlan} Plan
              </p>
              <div className="flex items-center space-x-4 mt-4 text-sm text-blue-100 dark:text-blue-200">
                <span>{organization.memberCount} members</span>
                <span>•</span>
                <span>{organization.teamCount} teams</span>
                <span>•</span>
                <span>{organization.projectCount} projects</span>
              </div>
            </div>
            {canManageOrganization && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-gray-200 transition-colors duration-200"
                >
                  <UserPlus className="w-4 h-4 mr-2 inline" />
                  Invite Member
                </button>
                <Link
                  to="/organization/settings"
                  className="bg-blue-400 dark:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-300 dark:hover:bg-blue-400 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4 mr-2 inline" />
                  Settings
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">{stat.change} from last month</p>
                </div>
                <div className={`p-3 rounded-full ${getStatCardClasses(stat.color)}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Teams</h2>
                {canManageOrganization && (
                  <Link
                    to="/teams/create"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Team
                  </Link>
                )}
              </div>
            </div>
            <div className="p-6">
              {teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.slice(0, 5).map((team) => (
                    <Link
                      key={team._id}
                      to={`/teams/${team._id}`}
                      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm dark:hover:bg-gray-700/50 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{team.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{team.memberCount} members</span>
                            <span>{team.projectCount} projects</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{team.lead.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Team Lead</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {teams.length > 5 && (
                    <Link
                      to="/teams"
                      className="block text-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                    >
                      View all {teams.length} teams →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No teams yet</p>
                  {canManageOrganization && (
                    <Link 
                      to="/teams/create" 
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 mt-3 transition-colors duration-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Team
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Members */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Members</h2>
                <Link
                  to="/organization/members"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {members.length > 0 ? (
                <div className="space-y-4">
                  {members.slice(0, 5).map((member) => (
                    <div key={member._id} className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
                          {getRoleIcon(member.role)}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{getRoleName(member.role)}</span>
                          {member.teams.length > 0 && (
                            <>
                              <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{member.teams.length} team{member.teams.length > 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : member.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No members yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link 
              to="/projects/create" 
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">New Project</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create a project</p>
              </div>
            </Link>
            
            {canManageOrganization && (
              <Link 
                to="/teams/create" 
                className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">New Team</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create a team</p>
                </div>
              </Link>
            )}
            
            <Link 
              to="/analytics" 
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Analytics</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">View reports</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Invite Member Modal */}
        <Modal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          title="Invite Team Member"
          size="md"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg">
            <form onSubmit={handleSubmit(onInviteMember)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="colleague@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Role *
                </label>
                <select 
                  {...register('role', { required: 'Role is required' })} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="org_admin">Organization Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Role Permissions:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• <strong>Member:</strong> Can create and edit tasks, participate in projects</li>
                  <li>• <strong>Team Lead:</strong> Can manage team members and team projects</li>
                  <li>• <strong>Organization Admin:</strong> Can manage all aspects of the organization</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default OrganizationDashboard;