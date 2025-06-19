import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  FileText,
  Calendar,
  Users,
  Flag
} from 'lucide-react';
import { useTask, Task, Project } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { projectAPI, taskAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import KanbanBoard from '../components/Tasks/KanbanBoard';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tasks, dispatch } = useTask();
  const { addNotification } = useNotification();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

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

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, tasksData] = await Promise.all([
        projectAPI.getProject(id!),
        taskAPI.getTasks(id), // This will filter tasks by project ID
      ]);
      setProject(projectData);
      dispatch({ type: 'SET_TASKS', payload: tasksData });
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onCreateTask = async (data: any) => {
    setCreating(true);
    try {
      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        startDate: data.startDate,
        endDate: data.endDate,
        tags: Array.isArray(data.tags) ? data.tags : [],
        projectId: id,
        status: selectedColumn,
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

  const handleAddTask = (columnName: string) => {
    setSelectedColumn(columnName);
    setShowTaskModal(true);
  };

  const projectTasks = tasks.filter(task => {
    // Handle both string and object projectId
    const taskProjectId = typeof task.projectId === 'string' 
      ? task.projectId 
      : (task.projectId as any)?._id || task.projectId;
    return String(taskProjectId) === String(id);
  });

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

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (data: any) => {
    if (!selectedTask) return;
    
    setUpdating(true);
    try {
      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        tags: Array.isArray(data.tags) ? data.tags : data.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean) || [],
        projectId: id // Ensure the task stays in this project
      };

      const updatedTask = await taskAPI.updateTask(selectedTask._id, taskData);
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      
      setShowEditModal(false);
      setSelectedTask(null);
      
      addNotification({
        type: 'success',
        title: 'Task Updated',
        message: `"${updatedTask.title}" has been updated successfully`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update task. Please try again.',
        duration: 5000
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>, skipSocketEmit = false) => {
    const updatedTask = projectTasks.find(t => t._id === taskId);
    if (updatedTask) {
      const newTask = { ...updatedTask, ...updates };
      dispatch({ type: 'UPDATE_TASK', payload: newTask });
      
      // Only emit socket event if not skipping (to prevent loops during drag operations)
      if (!skipSocketEmit && updates.status && updates.status !== updatedTask.status) {
        // You can add socket emission here if needed for project-specific updates
        console.log('Project task status updated:', { taskId, newStatus: updates.status });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Project not found</h2>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/projects"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link to={`/documents?project=${id}`} className="btn-outline btn-md">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </Link>
          <button className="btn-outline btn-md">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-sm text-gray-500">Department</span>
              <p className="font-medium text-gray-900">{project.department}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tasks</span>
              <p className="font-medium text-gray-900">{projectTasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={projectTasks}
        onTaskUpdate={handleTaskUpdate}
        onAddTask={handleAddTask}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        columns={project.kanbanColumns?.map(col => ({
          id: col.name,
          title: col.name,
          color: 'bg-gray-100' // Default color for project columns
        })) || []}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={onCreateTask}
        loading={creating}
        initialStatus={selectedColumn}
        availableStatuses={project?.kanbanColumns?.map(col => ({ id: col.name, title: col.name })) || []}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
        }}
        onSubmit={handleUpdateTask}
        onDelete={() => selectedTask && handleDeleteTask(selectedTask)}
        task={selectedTask}
        loading={updating}
        availableStatuses={project?.kanbanColumns?.map(col => ({ id: col.name, title: col.name })) || []}
      />
    </div>
  );
};

export default ProjectDetail;