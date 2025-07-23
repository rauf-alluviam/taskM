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
  organizationData?: OrganizationData; // <-- add this prop
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
  organizationData // <-- add this prop
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
    // If no users are selected, use local filtering (show all tasks)
    if (userIds.length === 0) {
      setUserTasks(null);
      setOrgTasks(null);
      setFilters({ ...filters, assignedUser: 'all' });
      return;
    }
    // If all users are selected, use local filtering (show all tasks)
    if (userIds.length === orgUsers.length) {
      setUserTasks(null);
      setOrgTasks(null);
      setFilters({ ...filters, assignedUser: 'all' });
      return;
    }
    // If a specific subset is selected, fetch all org tasks and filter for selected users
    setUserTasksLoading(true);
    try {
      // Robust orgId extraction: support string or object for orgUsers[0].organization
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
      // Use getOrganizationTasks only for subset selection
      const allOrgTasks = await taskAPI.getOrganizationTasks(orgId);
      setOrgTasks(allOrgTasks);
      // Filter for selected users (OR logic)
      const filtered = allOrgTasks.filter((task: any) => {
        if (!task.assignedUsers || task.assignedUsers.length === 0) return false;
        return task.assignedUsers.some((user: any) => userIds.includes(typeof user === 'string' ? user : user._id));
      });
      setUserTasks(filtered);
      setFilters({ ...filters, assignedUser: userIds.join(',') });
    } catch (error) {
      console.error('Failed to fetch org tasks:', error);
      setUserTasks([]);
      setOrgTasks(null);
    } finally {
      setUserTasksLoading(false);
    }
  };

  // --- FILTERED TASKS LOGIC FIX WITH DEBUG LOGS ---
  // Place this above the return statement in the component
  const getFilteredTasks = () => {
    console.log('[Kanban Multi-User Filter] selectedUserIds:', selectedUserIds);
    console.log('[Kanban Multi-User Filter] orgUsers:', orgUsers?.map(u => u._id));
    // If no user filter or 'all', return all filteredTasks
    if (!selectedUserIds || selectedUserIds.length === 0 || (orgUsers && selectedUserIds.length === orgUsers.length)) {
      console.log('[Kanban Multi-User Filter] No user filter or all users selected, returning all filteredTasks:', filteredTasks.length);
      return filteredTasks;
    }
    // If orgTasks is loaded (from API), use it for filtering
    if (orgTasks && Array.isArray(orgTasks)) {
      const result = orgTasks.filter(task => {
        if (!task.assignedUsers || task.assignedUsers.length === 0) return false;
        const match = task.assignedUsers.some(
          (user: any) => selectedUserIds.includes(typeof user === 'string' ? user : user._id)
        );
        if (match) {
          console.log(`[Kanban Multi-User Filter][ORG API] Task '${task.title}' (${task._id}) matches selected users`, task.assignedUsers);
        }
        return match;
      });
      console.log('[Kanban Multi-User Filter][ORG API] Filtered tasks count:', result.length);
      return result;
    }
    // fallback: local filter (should not happen, but for safety)
    const result = filteredTasks.filter(task => {
      if (!task.assignedUsers || task.assignedUsers.length === 0) return false;
      const match = task.assignedUsers.some(
        (user: any) => selectedUserIds.includes(typeof user === 'string' ? user : user._id)
      );
      if (match) {
        console.log(`[Kanban Multi-User Filter] Task '${task.title}' (${task._id}) matches selected users`, task.assignedUsers);
      }
      return match;
    });
    console.log('[Kanban Multi-User Filter] Filtered tasks count:', result.length);
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Jira-style Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        {/* Top Navigation Bar */}
        
        {/* Project Header */}
        <div className="px-6 py-4">
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
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentProject ? currentProject.name : 'Tasks'}
                    </h1>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Star className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  {currentProject && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
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
              
              {/* <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                <button className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white transition-all">
                  <Users className="w-3 h-3 mr-1 inline" />
                  Share
                </button>
                <button className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white transition-all border-l border-gray-200">
                  <BarChart3 className="w-3 h-3 mr-1 inline" />
                  Insights
                </button>
              </div> */}

              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

     

        {/* Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            {/* Left - Search & Filters */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              {/* Epic Dropdown */}
              {/* <div className="relative">
                <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  Epic
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              </div> */}

              {/* Avatar Group */}
              {/* // In the Avatar Group section, add loading feedback */}
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


              {/* Only show assignees */}
           
              {/* Recently updated */}
              
            </div>

            {/* Right - View Options */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">GROUP BY</span>
              <div className="relative">
                <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  None
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Layout className="w-4 h-4 mr-2 inline" />
                  Board
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <List className="w-4 h-4 mr-2 inline" />
                  List
                </button>
              </div>

              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Filter Options</h3>
                <button
                  onClick={() => setFilters({ search: '', priority: 'all', assignedUser: 'all', tags: [], project: 'all' })}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs font-medium text-gray-700 mb-2">Assignee</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="all">All Statuses</option>
                    {columns.map(column => (
                      <option key={column.id} value={column.id}>{column.title}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Due Date</label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                  <label className="block text-xs font-medium text-gray-700 mb-2">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          filters.tags.includes(tag)
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
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
      <div className="flex-1 overflow-hidden bg-gray-50">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
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