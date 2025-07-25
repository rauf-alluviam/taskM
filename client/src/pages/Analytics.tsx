import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  FolderOpen,
  CheckSquare,
  TrendingUp,
  Calendar,
  Moon,
  Sun
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// Theme Context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {}
});

const useTheme = () => React.useContext(ThemeContext);

// Theme Provider Component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  tasksThisWeek: number;
  projectsThisMonth: number;
  completionRate?: number;
}

const Analytics: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    tasksThisWeek: 0,
    projectsThisMonth: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksOverTime, setTasksOverTime] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const apiBase = import.meta.env.VITE_APP_URL;
        // Fetch general analytics (organization-specific)
        const res = await fetch(`${apiBase}/analytics`, {
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const result = await res.json();
        setData({
          totalUsers: result.totalUsers || 0,
          totalProjects: result.totalProjects || 0,
          totalTasks: result.totalTasks || 0,
          completedTasks: result.completedTasks || 0,
          tasksThisWeek: result.tasksThisWeek || 0,
          projectsThisMonth: result.projectsThisMonth || 0,
          completionRate: result.completionRate || 0,
        });

        // Fetch tasks analytics (organization-specific)
        const resTasks = await fetch(`${apiBase}/analytics/tasks`, {
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (resTasks.ok) {
          const taskStats = await resTasks.json();
          setTasksOverTime(
            (taskStats.tasksOverTime || []).map((d: any) => ({
              date: d._id,
              count: d.count
            }))
          );
          setStatusDistribution(taskStats.statusDistribution || []);
          setPriorityDistribution(taskStats.priorityDistribution || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const completionRate = data.completionRate !== undefined
    ? data.completionRate
    : data.totalTasks > 0
      ? Math.round((data.completedTasks / data.totalTasks) * 100)
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600 dark:text-red-400 font-semibold">{error}</div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: data.totalUsers,
      icon: Users,
      color: 'bg-blue-500 dark:bg-blue-600',
      change: '+12%',
    },
    {
      title: 'Active Projects',
      value: data.totalProjects,
      icon: FolderOpen,
      color: 'bg-green-500 dark:bg-green-600',
      change: '+8%',
    },
    {
      title: 'Total Tasks',
      value: data.totalTasks,
      icon: CheckSquare,
      color: 'bg-purple-500 dark:bg-purple-600',
      change: '+15%',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500 dark:bg-orange-600',
      change: '+5%',
    },
  ];

  // Custom Tooltip component for dark theme support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-gray-900 dark:text-gray-100 font-medium">{`Date: ${label}`}</p>
          <p className="text-blue-600 dark:text-blue-400">
            {`Tasks: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header with Theme Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">Overview of your team's performance and progress</p>
            </div>
            <button
              onClick={toggleTheme}
              className="mt-4 sm:mt-0 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors self-start sm:self-auto"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">{stat.change}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from last month</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tasks completed this week: {data.tasksThisWeek}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">New projects this month: {data.projectsThisMonth}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active team members: {data.totalUsers}</span>
                </div>
              </div>
            </div>

            {/* Task Status Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Task Status Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Completed</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.completedTasks}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">In Progress</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.totalTasks - data.completedTasks}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Performance Metrics</h3>
            <div className="py-8">
              {tasksOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={tasksOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={isDark ? '#374151' : '#e5e7eb'}
                    />
                    <XAxis 
                      dataKey="date" 
                      tick={{ 
                        fontSize: 12, 
                        fill: isDark ? '#9ca3af' : '#6b7280' 
                      }}
                      axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                      tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ 
                        fontSize: 12, 
                        fill: isDark ? '#9ca3af' : '#6b7280'
                      }}
                      axisLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                      tickLine={{ stroke: isDark ? '#4b5563' : '#d1d5db' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={isDark ? '#60a5fa' : '#3b82f6'} 
                      strokeWidth={2} 
                      dot={{ 
                        r: 4, 
                        fill: isDark ? '#60a5fa' : '#3b82f6',
                        strokeWidth: 2,
                        stroke: isDark ? '#1f2937' : '#ffffff'
                      }}
                      activeDot={{ 
                        r: 6, 
                        fill: isDark ? '#60a5fa' : '#3b82f6',
                        strokeWidth: 2,
                        stroke: isDark ? '#1f2937' : '#ffffff'
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No performance data available yet.</p>
                </div>
              )}
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 text-center">
                Tasks completed per day (last 30 days)
              </p>
            </div>
          </div>

          {/* Additional Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Summary</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Tasks completed</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.tasksThisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Avg. per day</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{Math.round(data.tasksThisWeek / 7)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Productivity</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Completion rate</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Status</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active members</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Active projects</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.totalProjects}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;