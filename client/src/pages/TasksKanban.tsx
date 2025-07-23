import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Filter, Layout, List, MoreVertical, Tag, Settings, Wifi, WifiOff, FolderOpen, Home, ChevronDown, X, Calendar, User, AlertCircle } from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { taskAPI, kanbanAPI, projectAPI, userAPI } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Breadcrumb from '../components/UI/Breadcrumb';
import KanbanBoard from '../components/Tasks/KanbanBoard';
import TaskListView from '../components/Tasks/TaskListView';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import ColumnManager from '../components/Tasks/ColumnManager';
import { Task } from '../contexts/TaskContext';
import TasksKanbanView from './TasksKanbanView';

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
  const { user } = useAuth();
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
  const [selectedStatus, setSelectedStatus] = useState('todo');
  const [columns, setColumns] = useState<Array<{ id: string; title: string; color: string }>>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(projectIdFromUrl || undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    priority: 'all',
    assignedUser: 'all',
    tags: [],
    project: projectIdFromUrl ? 'all' : 'all',
  });
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgUsersLoading, setOrgUsersLoading] = useState(false);



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

  useEffect(() => {
    const handleClickOutside = () => {
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

  const fetchOrgUsers = async () => {
    if (user?.organization?._id) {
      setOrgUsersLoading(true);
      try {
        const users = await userAPI.getUsersByOrganization(user.organization._id);
        setOrgUsers(users);
      } catch (e) {
        setOrgUsers([]);
      } finally {
        setOrgUsersLoading(false);
      }
    } else {
      setOrgUsers([]);
    }
  };

  useEffect(() => {
    fetchOrgUsers();
  }, [user?.organization?._id]);

  const setupRealTimeConnection = () => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      setIsConnected(socketService.isConnected);

      if (currentProjectId) {
        socketService.joinProject(currentProjectId);
      }

      socketService.onTaskCreate((task) => {
        dispatch({ type: 'ADD_TASK', payload: task });
        addNotification({
          type: 'info',
          title: 'New Task Created',
          message: `${task.title} has been added`,
          duration: 3000
        });
      });

      socketService.onTaskUpdate((task) => {
        console.log('📡 Received socket task update:', task);
        dispatch({ type: 'UPDATE_TASK', payload: task });
        addNotification({
          type: 'success',
          title: 'Task Updated',
          message: `${task.title} has been updated`,
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
      });

      socketService.onColumnsUpdate((serverColumns) => {
        const clientColumns = serverColumns.map((col: any) => {
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

      const socket = socketService.connect(token);
      socket?.on('connect', () => setIsConnected(true));
      socket?.on('disconnect', () => setIsConnected(false));
    }
  };

  const loadColumns = async () => {
    try {
      setColumnsLoading(true);
      const serverColumns = await kanbanAPI.getColumns(currentProjectId);
      
      const clientColumns = serverColumns.map((col: any) => {
        const columnColor = col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-'));
        
        return {
          id: col.name.toLowerCase().replace(/\s+/g, '-'),
          title: col.name,
          color: columnColor
        };
      });
      
      setColumns(clientColumns);
    } catch (error) {
      console.error('Failed to load columns:', error);
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
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskAPI.getTasks(currentProjectId);
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
      // Ensure assignedUsers includes self if empty
      let assignedUsers = data.assignedUsers && data.assignedUsers.length > 0 ? data.assignedUsers : (user ? [user._id] : []);
      const taskData = {
        ...data,
        tags: data.tags || [],
        projectId: currentProjectId,
        assignedUsers,
      };
      
      const newTask = await taskAPI.createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      setShowTaskModal(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any, skipSocketEmit = false) => {
    const updatedTask = tasks.find(t => t._id === taskId);
    if (updatedTask) {
      const newTask = { ...updatedTask, ...updates };
      
      dispatch({ type: 'UPDATE_TASK', payload: newTask });
      
      if (!skipSocketEmit && updates.status && updates.status !== updatedTask.status) {
        if (socketEmitTimeoutRef.current) {
          clearTimeout(socketEmitTimeoutRef.current);
        }
        socketEmitTimeoutRef.current = setTimeout(() => {
          socketService.emitTaskStatusChange(taskId, updates.status, currentProjectId);
        }, 300);
      }
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
        message: `${task.title} has been deleted successfully`,
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
      
      if (!currentProjectId) {
        addNotification({
          type: 'warning',
          title: 'No Project Selected',
          message: 'Creating column in default view. For project-specific columns, please select a project.',
          duration: 5000
        });
      }
      
      await kanbanAPI.addColumn(newColumn.title, newColumn.color, currentProjectId);
      await loadColumns();
      
      addNotification({
        type: 'success',
        title: 'Column Added',
        message: `${newColumn.title} column has been added successfully.`,
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
      await loadColumns();
      
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
  };

const filteredTasks = tasks.filter(task => {
  const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                       task.description.toLowerCase().includes(filters.search.toLowerCase());
  const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
  const matchesTags = filters.tags.length === 0 || 
                     filters.tags.some(tag => task.tags?.includes(tag));
  
  let matchesProject = true;
  if (!currentProjectId && filters.project !== 'all') {
    const taskProjectId = typeof task.projectId === 'string' 
      ? task.projectId 
      : (task.projectId as any)?._id || task.projectId;
    matchesProject = String(taskProjectId) === String(filters.project);
  } else if (currentProjectId) {
    matchesProject = true;
  }
  
  const result = matchesSearch && matchesPriority && matchesTags && matchesProject;
  if (!result) {
    console.log('Filtered out task:', task, { matchesSearch, matchesPriority, matchesTags, matchesProject });
  }
  return result;
});

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

  const activeFiltersCount = [
    filters.search,
    filters.priority !== 'all',
    filters.tags.length > 0,
    filters.project !== 'all'
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <TasksKanbanView
      loading={loading}
      isConnected={isConnected}
      breadcrumbItems={breadcrumbItems}
      currentProject={currentProject}
      currentProjectId={currentProjectId}
      projects={projects}
      viewMode={viewMode}
      setViewMode={setViewMode}
      setShowColumnManager={setShowColumnManager}
      handleAddTask={handleAddTask}
      filters={filters}
      setFilters={setFilters}
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      activeFiltersCount={activeFiltersCount}
      columns={columns}
      allTags={allTags}
      toggleTagFilter={toggleTagFilter}
      filteredTasks={filteredTasks}
      handleTaskUpdate={handleTaskUpdate}
      handleEditTask={handleEditTask}
      handleDeleteTask={handleDeleteTask}
      handleAddColumn={handleAddColumn}
      handleRemoveColumn={handleRemoveColumn}
      showTaskModal={showTaskModal}
      setShowTaskModal={setShowTaskModal}
      handleCreateTask={handleCreateTask}
      selectedStatus={selectedStatus}
      creating={creating}
      showEditModal={showEditModal}
      setShowEditModal={setShowEditModal}
      selectedTask={selectedTask}
      handleUpdateTask={handleUpdateTask}
      updating={updating}
      showColumnManager={showColumnManager}
      setSelectedTask={setSelectedTask}
      orgUsers={orgUsers}
      orgUsersLoading={orgUsersLoading}
    />
  );
};

export default TasksPage;