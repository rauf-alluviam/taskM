import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Filter, Layout, List, MoreVertical, Tag, Settings, Wifi, WifiOff, FolderOpen, Home } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { taskAPI, kanbanAPI, projectAPI } from '../services/api';
import { socketService } from '../services/socket';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Breadcrumb from '../components/UI/Breadcrumb';
import KanbanBoard from '../components/Tasks/KanbanBoard';
import TaskListView from '../components/Tasks/TaskListView';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import ColumnManager from '../components/Tasks/ColumnManager';
import { Task } from '../contexts/TaskContext';

interface TaskFilters {
  search: string;
  priority: string;
  assignedUser: string;
  tags: string[];
  project: string;
}

interface Project {
  _id: string;
  name: string;
  department: string;
}

const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project');
    const { tasks, dispatch } = useTask();
  const { addNotification } = useNotification();
  const socketEmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStatus, setSelectedStatus] = useState('todo');  const [columns, setColumns] = useState<Array<{ id: string; title: string; color: string }>>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectIdFromUrl || undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    priority: 'all',    assignedUser: 'all',
    tags: [],
    project: projectIdFromUrl ? 'all' : 'all', // Always start with 'all' since API filtering takes precedence
  });
  useEffect(() => {
    loadTasks();
    loadColumns();
    loadProjects();
    setupRealTimeConnection();

    return () => {
      socketService.removeAllListeners();
      if (currentProjectId) {
        socketService.leaveProject(currentProjectId);
      }
    };
  }, [currentProjectId]);

  useEffect(() => {
    if (currentProjectId) {
      loadColumns();
    }
  }, [currentProjectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      // Close any open dropdowns in task cards
      const event = new Event('closeDropdowns');
      document.dispatchEvent(event);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectAPI.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const setupRealTimeConnection = () => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      setIsConnected(socketService.isConnected);

      // Join project room if we have a project
      if (currentProjectId) {
        socketService.joinProject(currentProjectId);
      }      // Set up real-time event listeners
      socketService.onTaskCreate((task) => {
        dispatch({ type: 'ADD_TASK', payload: task });
        addNotification({
          type: 'info',
          title: 'New Task Created',
          message: `"${task.title}" has been added`,
          duration: 3000
        });
      });      socketService.onTaskUpdate((task) => {
        console.log('📡 Received socket task update:', task);
        dispatch({ type: 'UPDATE_TASK', payload: task });
        addNotification({
          type: 'success',
          title: 'Task Updated',
          message: `"${task.title}" has been updated`,
          duration: 3000
        });
      });

      socketService.onTaskDelete((taskId) => {
        dispatch({ type: 'DELETE_TASK', payload: taskId });
        addNotification({
          type: 'info',
          title: 'Task Deleted',
          message: 'A task has been removed',
          duration: 3000
        });
      });      socketService.onColumnsUpdate((serverColumns) => {
        const clientColumns = serverColumns.map((col: any) => {
          // Ensure the color is properly preserved from server response for real-time updates
          const columnId = col.name.toLowerCase().replace(/\s+/g, '-');
          const columnColor = col.color || getColorForColumn(columnId);
          
          return {
            id: col._id || columnId,
            title: col.name,
            color: columnColor
          };
        });
        setColumns(clientColumns);
        addNotification({
          type: 'info',
          title: 'Columns Updated',
          message: 'Kanban columns have been updated',
          duration: 3000
        });
      });

      // Monitor connection status
      const socket = socketService.connect(token);
      socket?.on('connect', () => setIsConnected(true));
      socket?.on('disconnect', () => setIsConnected(false));
    }
  };
  const loadColumns = async () => {
    try {
      setColumnsLoading(true);
      const serverColumns = await kanbanAPI.getColumns(currentProjectId);
      
      console.log('🏛️ Server columns:', serverColumns);
        // Convert server format to client format
      const clientColumns = serverColumns.map((col: any) => {
        // Ensure the color is properly preserved from server response
        const columnColor = col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-'));
        console.log(`Column '${col.name}' color from server:`, col.color, "using:", columnColor);
        
        return {
          id: col.name.toLowerCase().replace(/\s+/g, '-'), // Use status name, not database ID
          title: col.name,
          color: columnColor // Use server color if available, fallback to default
        };
      });
      
      console.log('🎨 Client columns:', clientColumns);
      setColumns(clientColumns);
    } catch (error) {
      console.error('Failed to load columns:', error);
      // Fallback to default columns
      setColumns([
        { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
        { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
        { id: 'review', title: 'Review', color: 'bg-yellow-100' },
        { id: 'done', title: 'Done', color: 'bg-green-100' },
      ]);
    } finally {
      setColumnsLoading(false);
    }
  };

  const getColorForColumn = (columnId: string) => {
    const colorMap: { [key: string]: string } = {
      'todo': 'bg-slate-100',
      'in-progress': 'bg-blue-100',
      'review': 'bg-yellow-100',
      'done': 'bg-green-100',
      'testing': 'bg-purple-100',
      'blocked': 'bg-red-100',
      'deployed': 'bg-green-100',
    };
    return colorMap[columnId] || 'bg-gray-100';
  };  const loadTasks = async () => {
    try {
      setLoading(true);
      // Load tasks for the specific project if currentProjectId is set
      console.log('🚀 Loading tasks with currentProjectId:', currentProjectId);
      const data = await taskAPI.getTasks(currentProjectId);
      console.log('📦 Tasks received from API:', data.length, 'tasks');
      dispatch({ type: 'SET_TASKS', payload: data });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateTask = async (data: any) => {
    setCreating(true);
    try {
      const taskData = {
        ...data,
        tags: data.tags || [],
        projectId: currentProjectId, // Automatically assign current project
      };
      
      const newTask = await taskAPI.createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      setShowTaskModal(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };  const handleTaskUpdate = async (taskId: string, updates: any, skipSocketEmit = false) => {
    console.log('TasksKanban handleTaskUpdate called:', { taskId, updates, skipSocketEmit });
    
    const updatedTask = tasks.find(t => t._id === taskId);
    if (updatedTask) {
      const newTask = { ...updatedTask, ...updates };
      
      // Update local state immediately for responsive UI
      dispatch({ type: 'UPDATE_TASK', payload: newTask });
      console.log('Local state updated in TasksKanban');
        // Only emit real-time update if not skipping (to prevent loops during drag operations)
      if (!skipSocketEmit && updates.status && updates.status !== updatedTask.status) {
        // Debounce socket emissions to prevent spam
        if (socketEmitTimeoutRef.current) {
          clearTimeout(socketEmitTimeoutRef.current);
        }
        socketEmitTimeoutRef.current = setTimeout(() => {
          socketService.emitTaskStatusChange(taskId, updates.status, currentProjectId);
          console.log('Socket event emitted for status change (debounced)');
        }, 300);
      } else if (skipSocketEmit) {
        console.log('Skipping socket emit to prevent loops');
      }
    } else {
      console.error('Task not found for update:', taskId);
    }
  };
  const handleAddTask = (status: string) => {
    setSelectedStatus(status);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (data: any) => {
    if (!selectedTask) return;
    
    setUpdating(true);
    try {
      const taskData = {
        ...data,
        tags: data.tags || [],
        assignedUsers: data.assignedUsers || [],
      };
      
      const updatedTask = await taskAPI.updateTask(selectedTask._id, taskData);
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setUpdating(false);
    }
  };
  const handleDeleteTask = async (task: Task) => {
    try {
      await taskAPI.deleteTask(task._id);
      dispatch({ type: 'DELETE_TASK', payload: task._id });
      addNotification({
        type: 'success',
        title: 'Task Deleted',
        message: `"${task.title}" has been deleted successfully`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed', 
        message: 'Failed to delete task. Please try again.',
        duration: 5000
      });
    }
  };
  const handleAddColumn = async (newColumn: { id: string; title: string; color: string }) => {
    try {
      setColumnsLoading(true);
      
      // If no specific project is selected, show a notification but don't prevent adding
      if (!currentProjectId) {
        addNotification({
          type: 'warning',
          title: 'No Project Selected',
          message: 'Creating column in default view. For project-specific columns, please select a project.',
          duration: 5000
        });
        // Continue with column creation without projectId
      }
      
      // Make sure the color is properly captured from the modal selection
      console.log('Creating column with color:', newColumn.color);
      
      // Pass both the title and selected color to the API
      await kanbanAPI.addColumn(newColumn.title, newColumn.color, currentProjectId);
      await loadColumns(); // Reload columns from server
      
      addNotification({
        type: 'success',
        title: 'Column Added',
        message: `"${newColumn.title}" column has been added successfully.`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Failed to add column:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Add Column',
        message: error.response?.data?.message || 'Unable to add the new column. Please try again.',
        duration: 5000
      });
    } finally {
      setColumnsLoading(false);
    }
  };

  const handleRemoveColumn = async (columnId: string) => {
    if (!currentProjectId) {
      addNotification({
        type: 'warning',
        title: 'Project Required',
        message: 'Please select a project before removing columns.',
        duration: 5000
      });
      return;
    }

    try {
      setColumnsLoading(true);
      await kanbanAPI.deleteColumn(columnId, currentProjectId);
      await loadColumns(); // Reload columns from server
      
      addNotification({
        type: 'success',
        title: 'Column Removed',
        message: 'Column has been removed successfully.',
        duration: 3000
      });
    } catch (error: any) {
      console.error('Failed to remove column:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Remove Column',
        message: error.response?.data?.message || 'Unable to remove the column. Please try again.',
        duration: 5000
      });
    } finally {
      setColumnsLoading(false);
    }
  };  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         task.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
    const matchesTags = filters.tags.length === 0 || 
                       filters.tags.some(tag => task.tags?.includes(tag));
    
    // Project filtering logic:
    // - If currentProjectId is set, the API already filtered tasks by project, so no additional filtering needed
    // - If currentProjectId is not set (All Projects), we need to filter by filters.project
    let matchesProject = true;
    if (!currentProjectId && filters.project !== 'all') {
      // Only apply frontend project filtering when viewing "All Projects" and a specific project filter is set
      const taskProjectId = typeof task.projectId === 'string' 
        ? task.projectId 
        : (task.projectId as any)?._id || task.projectId;
      matchesProject = String(taskProjectId) === String(filters.project);
      console.log('🔍 TasksKanban frontend filtering:', {
        taskTitle: task.title,
        taskProjectId: task.projectId,
        extractedId: taskProjectId,
        filterProject: filters.project,
        matchesProject
      });
    } else if (currentProjectId) {
      // When a specific project is selected, API already filtered, so all tasks match
      console.log('🔍 TasksKanban API filtering active for project:', currentProjectId);
      matchesProject = true;
    }
    
    const finalMatch = matchesSearch && matchesPriority && matchesTags && matchesProject;
    
    if (!finalMatch) {
      console.log('❌ Task filtered out:', {
        title: task.title,
        matchesSearch,
        matchesPriority,
        matchesTags,
        matchesProject,
        currentProjectId,
        'filters.project': filters.project
      });
    }
    
    return finalMatch;
  });

  console.log('📊 Filtering summary:', {
    totalTasks: tasks.length,
    filteredTasks: filteredTasks.length,
    currentProjectId,
    filters
  });

  // Breadcrumb items
  const currentProject = projects.find(p => p._id === currentProjectId);
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Projects', href: '/projects', icon: <FolderOpen className="w-4 h-4" /> },
    ...(currentProject ? [
      { label: currentProject.name, href: `/projects/${currentProject._id}`, icon: <FolderOpen className="w-4 h-4" /> }
    ] : []),
    { label: 'Tasks', icon: <Layout className="w-4 h-4" /> }
  ];

  const allTags = Array.from(new Set(tasks.flatMap(task => task.tags || [])));

  const toggleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }  return (
    <div className="h-full flex flex-col">
      {/* Compact Breadcrumb */}
      <div className="pb-2">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Compact Header with Controls in Single Row */}
      <div className="flex items-center justify-between py-2 mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-100">Tasks</h1>
            {currentProjectId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <FolderOpen className="w-3 h-3 mr-1" />
                {projects.find(p => p._id === currentProjectId)?.name || 'Project'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentProjectId && (
            <Link
              to={`/projects/${currentProjectId}`}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              View Project
            </Link>
          )}

          {/* Compact View Toggle */}
          <div className="flex bg-gray-100 rounded p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-gray-700 text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layout className="w-3 h-3 mr-1 inline" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-700 text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-3 h-3 mr-1 inline" />
              List
            </button>
          </div>

          {/* Compact Column Management - Now always visible */}
          <button
            onClick={() => setShowColumnManager(true)}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-3 h-3 mr-1" />
            Columns
          </button>

          <button
            onClick={() => handleAddTask('todo')}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Task
          </button>
        </div>
      </div>{/* Compact Filters */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Filters</h3>
          <button
            onClick={() => setFilters({ search: '', priority: 'all', assignedUser: 'all', tags: [], project: 'all' })}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>

        {/* Single Row Layout for Main Filters */}
        <div className="grid grid-cols-12 gap-2 items-end mb-2">
          {/* Project Filter - Compact */}
          <div className="col-span-3">
            <div className="flex items-center space-x-1 mb-1">
              <FolderOpen className="w-3 h-3 text-gray-400" />
              <label className="text-xs font-medium text-gray-600">Project</label>
            </div>
            <select
              value={currentProjectId || 'all'}
              onChange={async (e) => {
                const newProjectId = e.target.value === 'all' ? undefined : e.target.value;
                
                console.log('🔄 Project dropdown changed:', {
                  selectedValue: e.target.value,
                  newProjectId,
                  previousProjectId: currentProjectId
                });
                
                // Leave current project room if connected
                if (currentProjectId && socketService.isConnected) {
                  socketService.leaveProject(currentProjectId);
                }
                
                setCurrentProjectId(newProjectId);
                if (newProjectId) {
                  setSearchParams({ project: newProjectId });
                  // When selecting a specific project, reset filter.project since API handles filtering
                  setFilters(prev => ({ ...prev, project: 'all' }));
                  console.log('✅ Set filters.project to "all" for API filtering');
                } else {
                  setSearchParams({});
                  // When selecting "All Projects", keep the dropdown value in filters for potential frontend filtering
                  setFilters(prev => ({ ...prev, project: e.target.value }));
                  console.log('✅ Set filters.project to:', e.target.value);
                }
                
                // Join new project room if connected
                if (newProjectId && socketService.isConnected) {
                  socketService.joinProject(newProjectId);
                }
                
                // Reload tasks for the new project
                console.log('🔄 About to reload tasks...');
                await loadTasks();
                console.log('✅ Tasks reloaded');
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter - Compact */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Search - Compact */}
          <div className="col-span-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          {/* Statistics - Right Aligned */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Statistics</label>
            <div className="flex items-center justify-end space-x-3 text-xs text-gray-600 py-1">
              <span className="font-medium">Total: {filteredTasks.length}</span>
              <span>•</span>
              <span>Categories: {allTags.length}</span>
            </div>
          </div>
        </div>

        {/* Compact Category Filters */}
        {allTags.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-center space-x-1 mb-1">
              <Tag className="w-3 h-3 text-gray-400" />
              <label className="text-xs font-medium text-gray-600">Categories</label>
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            columns={columns}
            onManageColumns={() => setShowColumnManager(true)}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
      </div>      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleCreateTask}
        initialStatus={selectedStatus}
        loading={creating}
        availableStatuses={columns.map(col => ({ id: col.id, title: col.title }))}
        project={undefined} // Basic project info from TasksKanban doesn't include members/permissions
      />{/* Edit Task Modal */}
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
        project={undefined} // Basic project info from TasksKanban doesn't include members/permissions
      />

      {/* Column Manager Modal */}
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

export default TasksPage;