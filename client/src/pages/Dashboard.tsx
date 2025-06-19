import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckSquare, 
  FolderOpen, 
  Users, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI, projectAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { tasks, projects, dispatch } = useTask();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData] = await Promise.all([
        taskAPI.getTasks(),
        projectAPI.getProjects(),
      ]);
      
      dispatch({ type: 'SET_TASKS', payload: tasksData });
      dispatch({ type: 'SET_PROJECTS', payload: projectsData });
      
      // Calculate stats
      const completedTasks = tasksData.filter((task: any) => task.status === 'done').length;
      const overdueTasks = tasksData.filter((task: any) => 
        task.endDate && new Date(task.endDate) < new Date() && task.status !== 'done'
      ).length;
      
      setStats({
        totalTasks: tasksData.length,
        completedTasks,
        overdueTasks,
        totalProjects: projectsData.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-primary-100 text-lg">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-sm mt-1 ${
                  stat.change.startsWith('+') ? 'text-success-600' : 'text-error-600'
                }`}>
                  {stat.change} from last week
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
              <Link 
                to="/tasks"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task._id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`w-3 h-3 rounded-full ${
                      task.priority === 'critical' ? 'bg-error-500' :
                      task.priority === 'high' ? 'bg-warning-500' :
                      task.priority === 'medium' ? 'bg-accent-500' : 'bg-success-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.endDate && `Due: ${new Date(task.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'done' ? 'bg-success-100 text-success-800' :
                      task.status === 'in-progress' ? 'bg-primary-100 text-primary-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks yet</p>
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
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
              <Link 
                to="/projects"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
                    className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.description}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="inline-flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
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
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No projects yet</p>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/tasks" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Task</p>
              <p className="text-sm text-gray-500">Add a new task</p>
            </div>
          </Link>
          
          <Link to="/projects" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-secondary-300 hover:bg-secondary-50 transition-all">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">New Project</p>
              <p className="text-sm text-gray-500">Start a project</p>
            </div>
          </Link>
          
          <Link to="/documents" className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-all">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Team Meeting</p>
              <p className="text-sm text-gray-500">Schedule meeting</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;