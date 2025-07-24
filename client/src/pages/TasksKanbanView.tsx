import React, { useState } from 'react';
import { Layout, List, Settings, Plus, FolderOpen, Filter, Search, ChevronDown, Tag, X, Home, Users, BarChart3, Star, MoreHorizontal, Calendar } from 'lucide-react';
import Breadcrumb from '../components/UI/Breadcrumb';
import KanbanBoard from '../components/Tasks/KanbanBoard';
import TaskListView from '../components/Tasks/TaskListView';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import ColumnManager from '../components/Tasks/ColumnManager';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { Task } from '../contexts/TaskContext';
import UserAvatarList from '../components/UI/UserAvatarList';
import { taskAPI } from '../services/api';

interface Project { _id: string; name: string; department: string; }
interface TaskFilters {
  search: string;
  priority: string;
  assignedUser: string;
  tags: string[];
  project: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
}

interface TasksKanbanViewProps {
  loading: boolean;
  isConnected: boolean;
  breadcrumbItems: any[];
  currentProject: Project | undefined;
  currentProjectId: string | undefined;
  projects: Project[];
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;
  setShowColumnManager: (open: boolean) => void;
  handleAddTask: (status: string) => void;
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  showFilters: boolean;
  setShowFilters: (open: boolean) => void;
  activeFiltersCount: number;
  columns: Column[];
  allTags: string[];
  toggleTagFilter: (tag: string) => void;
  filteredTasks: Task[];
  handleTaskUpdate: any;
  handleEditTask: any;
  handleDeleteTask: any;
  handleAddColumn: any;
  handleRemoveColumn: any;
  showTaskModal: boolean;
  setShowTaskModal: (open: boolean) => void;
  handleCreateTask: any;
  selectedStatus: string;
  creating: boolean;
  showEditModal: boolean;
  setShowEditModal: (open: boolean) => void;
  selectedTask: Task | null;
  handleUpdateTask: any;
  updating: boolean;
  showColumnManager: boolean;
  setSelectedTask: (task: Task | null) => void;
  orgUsers: any[];
  orgUsersLoading: boolean;
  organizationData?: OrganizationData;
}

interface OrganizationData {
  _id: string;
}

const TasksKanbanView: React.FC<TasksKanbanViewProps> = ({
  loading,
  isConnected,
  breadcrumbItems,
  currentProject,
  currentProjectId,
  projects,
  viewMode,
  setViewMode,
  setShowColumnManager,
  handleAddTask,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  columns,
  allTags,
  toggleTagFilter,
  filteredTasks,
  handleTaskUpdate,
  handleEditTask,
  handleDeleteTask,
  handleAddColumn,
  handleRemoveColumn,
  showTaskModal,
  setShowTaskModal,
  handleCreateTask,
  selectedStatus,
  creating,
  showEditModal,
  setShowEditModal,
  selectedTask,
  handleUpdateTask,
  updating,
  showColumnManager,
  setSelectedTask,
  orgUsers,
  orgUsersLoading,
  organizationData
}) => {
  // Add selectedUserId state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userTasksLoading, setUserTasksLoading] = useState(false);
  const [userTasks, setUserTasks] = useState<any[] | null>(null);
  const [orgTasks, setOrgTasks] = useState<any[] | null>(null); // Store all org tasks

  // Handler for multi-user avatar selection
  // Only fetch org tasks when a specific subset of users is selected (not all, not none)
  const handleMultiUserChange = async (userIds: string[]) => {
    setSelectedUserIds(userIds);
    // If no users are selected, use org API (show all tasks)
    if (userIds.length === 0 || userIds.length === orgUsers.length) {
      setUserTasks(null);
      setOrgTasks(null);
      setFilters({ ...filters, assignedUser: 'all' });
      // Fetch org tasks from API
      setUserTasksLoading(true);
      try {
        let orgId = organizationData?._id;
        if (!orgId && orgUsers[0]?.organization) {
          if (typeof orgUsers[0].organization === 'string') {
            orgId = orgUsers[0].organization;
          } else if (typeof orgUsers[0].organization === 'object' && orgUsers[0].organization._id) {
            orgId = orgUsers[0].organization._id;
          }
        }
        if (!orgId) {
          console.error('No orgId found for fetching organization tasks');
          setUserTasks([]);
          setOrgTasks(null);
          setUserTasksLoading(false);
          return;
        }
        const allOrgTasks = await taskAPI.getOrganizationTasks(orgId);
        setOrgTasks(allOrgTasks);
        setUserTasks(null); // Show all org tasks
      } catch (error) {
        console.error('Failed to fetch org tasks:', error);
        setUserTasks([]);
        setOrgTasks(null);
      } finally {
        setUserTasksLoading(false);
      }
      return;
    }
    // If a specific subset is selected, fetch user tasks for each user and merge
    setUserTasksLoading(true);
    try {
      const userTasksArrays = await Promise.all(
        userIds.map(userId => taskAPI.getTasksByUser(userId))
      );
      // Flatten and deduplicate by _id
      const mergedTasks = Object.values(
        userTasksArrays.flat().reduce((acc, task) => {
          acc[task._id] = task;
          return acc;
        }, {} as Record<string, any>)
      );
      setUserTasks(mergedTasks);
      setOrgTasks(null);
      setFilters({ ...filters, assignedUser: userIds.join(',') });
    } catch (error) {
      console.error('Failed to fetch user tasks:', error);
      setUserTasks([]);
      setOrgTasks(null);
    } finally {
      setUserTasksLoading(false);
    }
  };

  // --- FILTERED TASKS LOGIC FIX WITH DEBUG LOGS ---
  // Place this above the return statement in the component
  const getFilteredTasks = () => {
    // If userTasks is set (from user API), use it
    if (userTasks && Array.isArray(userTasks)) {
      console.log('[Kanban Multi-User Filter][USER API] Returning userTasks:', userTasks.length);
      return userTasks;
    }
    // If orgTasks is loaded (from API), use it for filtering
    if (orgTasks && Array.isArray(orgTasks)) {
      console.log('[Kanban Multi-User Filter][ORG API] Returning orgTasks:', orgTasks.length);
      return orgTasks;
    }
    // fallback: local filter
    console.log('[Kanban Multi-User Filter] Returning filteredTasks:', filteredTasks.length);
    return filteredTasks;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      {/* Jira-style Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        {/* Top Navigation Bar */}
        
        {/* Project Header */}
        <div className="px-6 py-4 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            {/* Left Section - Project Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {currentProject && (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {currentProject.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {currentProject ? currentProject.name : 'Tasks'}
                    </h1>
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                      <Star className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  {currentProject && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mr-2">
                        {currentProject.department}
                      </span>
                      <span>Software project</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleAddTask('todo')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </button>
              
              <button className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {/* Left - Search & Filters */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:bg-slate-800 transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              {/* Filter Toggle Button - THIS WAS MISSING! */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-lg transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                    : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700 dark:hover:bg-slate-700'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full dark:bg-blue-800 dark:text-blue-200">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Avatar Group */}
              <div className="flex items-center min-w-[80px]">
                {orgUsersLoading ? (
                  <div className="w-24 flex justify-center items-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  orgUsers && orgUsers.length > 0 ? (
                    <div className="flex items-center">
                      <UserAvatarList
                        users={orgUsers}
                        maxDisplay={4}
                        size="md"
                        showNames={false}
                        multiSelect={true}
                        selectedUserIds={selectedUserIds}
                        onMultiSelectChange={handleMultiUserChange}
                      />
                      {userTasksLoading && (
                        <LoadingSpinner size="sm" className="ml-2" />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No users</span>
                  )
                )}
              </div>    
            </div>

            {/* Right - View Options */}
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-700'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Layout className="w-4 h-4 mr-2 inline" />
                  Board
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-700'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4 mr-2 inline" />
                  List
                </button>
              </div>

              <button className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Options</h3>
                <button
                  onClick={() => setFilters({ search: '', priority: 'all', assignedUser: 'all', tags: [], project: 'all' })}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="critical">🔴 Critical</option>
                  </select>
                </div>

                {/* Assigned User Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    value={filters.assignedUser}
                    onChange={(e) => setFilters({ ...filters, assignedUser: e.target.value })}
                  >
                    <option value="all">All Assignees</option>
                    <option value="me">Assigned to me</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <option value="all">All Statuses</option>
                    {columns.map(column => (
                      <option key={column.id} value={column.id}>{column.title}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                    <option value="all">Any time</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due today</option>
                    <option value="week">Due this week</option>
                    <option value="month">Due this month</option>
                  </select>
                </div>
              </div>

              {/* Tags Filter */}
              {allTags.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          filters.tags.includes(tag)
                            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-900 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-blue-950 dark:hover:text-blue-400 dark:hover:border-blue-700'
                        }`}
                      >
                        <Tag className="w-3 h-3 mr-1 inline" />
                        {tag}
                        {filters.tags.includes(tag) && (
                          <X className="w-3 h-3 ml-1 inline" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900">
        <div className="h-full">
          {viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={getFilteredTasks()}
              onTaskUpdate={handleTaskUpdate}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              columns={columns}
              onManageColumns={() => setShowColumnManager(true)}
            />
          ) : (
            <div className="p-6 h-full">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full dark:bg-slate-800 dark:border-slate-700">
                <TaskListView
                  tasks={getFilteredTasks()}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onTaskUpdate={handleTaskUpdate}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleCreateTask}
        initialStatus={selectedStatus}
        loading={creating}
        availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
        project={undefined}
      />
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
        }}
        onSubmit={handleUpdateTask}
        onDelete={() => { if (selectedTask) handleDeleteTask(selectedTask); }}
        task={selectedTask}
        loading={updating}
        availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
        project={undefined}
      />
      <ColumnManager
        isOpen={showColumnManager}
        onClose={() => setShowColumnManager(false)}
        columns={columns}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
      />
    </div>
  );
};

export default TasksKanbanView;