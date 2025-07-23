import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  CheckSquare, 
  FolderOpen, 
  Users, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  FileText,
  Building2
} from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, projectAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import CreateOrganizationModal from '../components/UI/CreateOrganizationModal';
import OnboardingTour from '../components/UI/OnboardingTour';
import { debounce } from '../utils/debounce';
import ThemeToggleButton from '../components/UI/ThemeToggleButton';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { tasks, projects, dispatch } = useTask();
  const [loading, setLoading] = useState(true);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAssignments, setOnboardingAssignments] = useState(null);
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
  });

  // Create debounced version of loadDashboardData to prevent excessive calls
  const debouncedLoadDashboardData = useCallback(
    debounce(async () => {
      try {
        setLoading(true);
        
        // Use Promise.allSettled instead of Promise.all to handle partial failures
        const results = await Promise.allSettled([
          taskAPI.getTasks(),
          projectAPI.getProjects(),
        ]);
        
        // Handle tasks result
        if (results[0].status === 'fulfilled') {
          dispatch({ type: 'SET_TASKS', payload: results[0].value });
          
          // Calculate stats from successful task data
          const tasksData = results[0].value;
          const completedTasks = tasksData.filter((task: any) => task.status === 'done').length;
          const overdueTasks = tasksData.filter((task: any) => 
            task.endDate && new Date(task.endDate) < new Date() && task.status !== 'done'
          ).length;
          
          setStats(prevStats => ({
            ...prevStats,
            totalTasks: tasksData.length,
            completedTasks,
            overdueTasks,
          }));
        } else {
          console.error('Failed to load tasks:', results[0].reason);
        }
        
        // Handle projects result
        if (results[1].status === 'fulfilled') {
          const projectsData = results[1].value;
          dispatch({ type: 'SET_PROJECTS', payload: projectsData });
          setStats(prevStats => ({
            ...prevStats,
            totalProjects: projectsData.length,
          }));
        } else {
          console.error('Failed to load projects:', results[1].reason);
        }
        
        // Check if both failed
        if (results[0].status === 'rejected' && results[1].status === 'rejected') {
          throw new Error('Failed to load dashboard data');
        }
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Don't throw here to prevent complete UI failure
      } finally {
        setLoading(false);
      }
    }, 500), // 500ms debounce
    [dispatch]
  );

  useEffect(() => {
    debouncedLoadDashboardData();
  }, [debouncedLoadDashboardData]);

  // Handle onboarding from URL params or session storage
  useEffect(() => {
    const onboardingParam = searchParams.get('onboarding');
    const showOnboardingFromSession = sessionStorage.getItem('showOnboarding');
    const assignmentsFromSession = sessionStorage.getItem('invitationAssignments');
    
    if (onboardingParam === 'true' || showOnboardingFromSession === 'true') {
      if (assignmentsFromSession) {
        try {
          const assignments = JSON.parse(assignmentsFromSession);
          setOnboardingAssignments(assignments);
        } catch (error) {
          console.error('Failed to parse onboarding assignments:', error);
        }
      }
      setShowOnboarding(true);
    }
  }, [searchParams]);

  const recentTasks = tasks.slice(0, 5);
  const recentProjects = projects.slice(0, 3);

  const statCards = [
    {
      name: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckSquare,
      color: 'primary',
      change: '+12%',
    },
    {
      name: 'Completed',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'success',
      change: '+8%',
    },
    {
      name: 'Overdue',
      value: stats.overdueTasks,
      icon: AlertCircle,
      color: 'error',
      change: '-2%',
    },
    {
      name: 'Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'secondary',
      change: '+3%',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Theme Toggle Button (top right for Dashboard page) */}
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-8 text-white dark:from-slate-800 dark:to-slate-900">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-primary-100 text-lg dark:text-slate-300">
          Here's what's happening with your {user?.organization ? 'team' : 'projects'} today.
        </p>
        {user?.organization && (
          <div className="flex items-center space-x-4 mt-4 text-sm">
            <span className="bg-primary-400 px-3 py-1 rounded-full dark:bg-slate-700">
              {user.organization.name}
            </span>
            {user.teams && user.teams.length > 0 && (
              <span className="text-primary-100 dark:text-slate-400">
                Member of {user.teams.length} team{user.teams.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        
        {/* Create Organization CTA for individual users */}
        {!user?.organization && (
          <div className="mt-6 p-4 bg-primary-400 bg-opacity-50 rounded-lg border border-primary-300 dark:bg-slate-700 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1 dark:text-slate-200">Ready to collaborate?</h3>
                <p className="text-primary-100 text-sm dark:text-slate-400">
                  Create an organization to invite team members and collaborate on projects
                </p>
              </div>
              <button
                onClick={() => setShowCreateOrgModal(true)}
                className="btn bg-white text-primary-600 hover:bg-gray-100 btn-md dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-slate-700"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Create Organization
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1 dark:text-slate-200">{stat.value}</p>
                <p className={`text-sm mt-1 ${
                  stat.change.startsWith('+') ? 'text-success-600 dark:text-green-400' : 'text-error-600 dark:text-red-400'
                }`}>
                  {stat.change} from last week
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-slate-700`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-300`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Recent Tasks</h2>
              <Link 
                to="/tasks"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task._id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                    <div className={`w-3 h-3 rounded-full ${
                      task.priority === 'critical' ? 'bg-error-500' :
                      task.priority === 'high' ? 'bg-warning-500' :
                      task.priority === 'medium' ? 'bg-accent-500' : 'bg-success-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-slate-200">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {task.endDate && `Due: ${new Date(task.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'done' ? 'bg-success-100 text-success-800 dark:bg-green-900 dark:text-green-300' :
                      task.status === 'in-progress' ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300' :
                      'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-400">No tasks yet</p>
                <Link to="/tasks" className="btn-primary btn-sm mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Recent Projects</h2>
              <Link 
                to="/projects"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all dark:border-slate-700 dark:hover:border-primary-700 dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                          {project.description}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="inline-flex items-center text-xs text-gray-500 dark:text-slate-400">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                            {project.department}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-400">No projects yet</p>
                <Link to="/projects" className="btn-primary btn-sm mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-slate-200">Quick Actions</h2>
        <div className={`grid grid-cols-1 gap-4 ${user?.organization ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <Link to="/tasks" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-slate-800">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center dark:bg-primary-900">
              <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-200">Create Task</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Add a new task</p>
            </div>
          </Link>
          
          <Link to="/projects" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-secondary-300 hover:bg-secondary-50 transition-all dark:border-slate-700 dark:hover:border-secondary-700 dark:hover:bg-slate-800">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center dark:bg-secondary-900">
              <FolderOpen className="w-5 h-5 text-secondary-600 dark:text-secondary-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-200">New Project</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Start a project</p>
            </div>
          </Link>

          {user?.organization && (
            <>
              <Link to="/teams/create" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all dark:border-slate-700 dark:hover:border-blue-900 dark:hover:bg-slate-800">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-950">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-200">Create Team</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Start a new team</p>
                </div>
              </Link>
              
              <Link to="/teams" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all dark:border-slate-700 dark:hover:border-purple-900 dark:hover:bg-slate-800">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center dark:bg-purple-950">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-200">View Teams</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Manage teams</p>
                </div>
              </Link>
            </>
          )}
          
          <Link to="/documents" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-all dark:border-slate-700 dark:hover:border-accent-900 dark:hover:bg-slate-800">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center dark:bg-amber-900">
              <FileText className="w-5 h-5 text-accent-600 dark:text-accent-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-200">New Document</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Create document</p>
            </div>
          </Link>

          {/* Show this action only for individual users without an organization */}
          {!user?.organization && (
            <button 
              onClick={() => setShowCreateOrgModal(true)} 
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all w-full dark:border-slate-700 dark:hover:border-green-900 dark:hover:bg-slate-800"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center dark:bg-green-950">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-slate-200">Create Organization</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Establish your organization</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal 
        isOpen={showCreateOrgModal} 
        onClose={() => setShowCreateOrgModal(false)}
        onSuccess={() => {
          // Refresh the page or reload user data to show the new organization
          window.location.reload();
        }}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        assignments={onboardingAssignments}
      />
    </div>
  );
};

export default Dashboard;