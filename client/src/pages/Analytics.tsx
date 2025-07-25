import React, { useState, useEffect } from 'react';
import { BarChart3, Users, FolderOpen, CheckSquare, TrendingUp, Calendar } from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  tasksThisWeek: number;
  projectsThisMonth: number;
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    tasksThisWeek: 0,
    projectsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch analytics data from API
    // For now, show placeholder data
    setTimeout(() => {
      setData({
        totalUsers: 25,
        totalProjects: 12,
        totalTasks: 156,
        completedTasks: 89,
        tasksThisWeek: 23,
        projectsThisMonth: 3,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const completionRate = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: data.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Active Projects',
      value: data.totalProjects,
      icon: FolderOpen,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'Total Tasks',
      value: data.totalTasks,
      icon: CheckSquare,
      color: 'bg-purple-500',
      change: '+15%',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+5%',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Overview of your team's performance and progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600 font-medium">{stat.change}</span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Tasks completed this week: {data.tasksThisWeek}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New projects this month: {data.projectsThisMonth}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active team members: {data.totalUsers}</span>
            </div>
          </div>
        </div>

        {/* Task Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-medium">{data.completedTasks}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">In Progress</span>
              <span className="text-sm font-medium">{data.totalTasks - data.completedTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Detailed charts and analytics coming soon!</p>
          <p className="text-sm text-gray-400 mt-2">Integration with chart libraries in progress</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
