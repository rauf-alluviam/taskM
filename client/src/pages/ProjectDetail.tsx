import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  FileText,
  Calendar,
  Users,
  Flag,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Shield,
  User
} from 'lucide-react';
import { useTask, Task, Project } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI, organizationAPI, userAPI, kanbanAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import KanbanBoard from '../components/Tasks/KanbanBoard';
import ColumnManager from '../components/Tasks/ColumnManager';
import UserSelector from '../components/UI/UserSelector';
import { useForm } from 'react-hook-form';
import { debounce } from '../utils/debounce';
import { debugAuth, testApiAuth } from '../utils/debugAuth';

// Add interfaces for member management
interface AddMemberForm {
  userIds: string[];
  role: 'admin' | 'member' | 'viewer';
}

interface UpdateRoleForm {
  role: 'admin' | 'member' | 'viewer';
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tasks, dispatch } = useTask();
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Member management state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showUpdateRoleModal, setShowUpdateRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Form hooks for member management
  const { register: registerMember, handleSubmit: handleSubmitMember, reset: resetMember, formState: { errors: memberErrors } } = useForm<AddMemberForm>();
  const { register: registerRole, handleSubmit: handleSubmitRole, setValue: setRoleValue, formState: { errors: roleErrors } } = useForm<UpdateRoleForm>();

  useEffect(() => {
    if (id) {
      // Debug authentication status
      console.log('🔍 ProjectDetail: Debugging authentication...');
      debugAuth();
      testApiAuth();
      
      loadProjectData();
    }
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
      // Close any open dropdowns in task cards
      const event = new Event('closeDropdowns');
      document.dispatchEvent(event);
    };
    
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

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

  // Member management functions
  const onAddMember = async (data: AddMemberForm) => {
    if (!project || !selectedUserIds || selectedUserIds.length === 0) return;

    try {
      // Add members one by one
      for (const userId of selectedUserIds) {
        await projectAPI.addMember(project._id, userId, data.role);
      }
      
      addNotification({
        type: 'success',
        title: 'Member(s) Added',
        message: `${selectedUserIds.length} member(s) added successfully`,
      });
      
      resetMember();
      setSelectedUserIds([]);
      setShowAddMemberModal(false);
      loadProjectData(); // Refresh project data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member(s)',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!project || !confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }

    try {
      await projectAPI.removeMember(project._id, memberId);
      addNotification({
        type: 'success',
        title: 'Member Removed',
        message: `${memberName} has been removed from the project`,
      });
      loadProjectData(); // Refresh data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to remove member',
      });
    }
  };

  const openUpdateRoleModal = (member: any) => {
    // Only proceed if member has a valid user object
    if (!member.user) {
      console.warn('Cannot open update role modal: member.user is null');
      return;
    }
    setSelectedMember(member);
    setRoleValue('role', member.role);
    setShowUpdateRoleModal(true);
  };

  const onUpdateRole = async (data: UpdateRoleForm) => {
    if (!selectedMember || !selectedMember.user || !project) return;

    try {
      await projectAPI.updateMemberRole(project._id, selectedMember.user._id, data.role);
      addNotification({
        type: 'success',
        title: 'Role Updated',
        message: `${selectedMember.user.name}'s role has been updated`,
      });
      setShowUpdateRoleModal(false);
      setSelectedMember(null);
      loadProjectData(); // Refresh data
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update role',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'member':
        return <User className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  // Helper function to get default color for a column by ID
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
  
  // Check permissions
  // (Removed duplicate canManageMembers declaration)

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
        assignedUsers: data.assignedUsers || [],
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
        assignedUsers: data.assignedUsers || [],
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

  // Column management functions
  const handleAddColumn = async (newColumn: { id: string; title: string; color: string }) => {
    try {
      if (!project) return;
      
      await kanbanAPI.addColumn(newColumn.title, newColumn.color, project._id);
      loadProjectData(); // Reload project data to get updated columns
      
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
    }
  };

  const handleRemoveColumn = async (columnId: string) => {
    try {
      if (!project) return;
      
      await kanbanAPI.deleteColumn(columnId, project._id);
      loadProjectData(); // Reload project data to get updated columns
      
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
    }
  };

  // Permission checks
  const canManageMembers = user && project && (
    project.createdBy === user._id ||
    project.members?.some(m => m.user?._id === user._id && m.role === 'admin') ||
    user.role === 'super_admin' ||
    (user.organization && user.role === 'org_admin')
  );

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
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          <Link
            to="/projects"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <p className="text-gray-600 text-sm sm:text-base line-clamp-2">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* {canManageMembers && (
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="btn-primary btn-md"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </button>
          )} */}
          <Link to={`/documents?project=${id}`} className="btn-outline btn-sm sm:btn-md">
            <FileText className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </Link>
          <button className="btn-outline btn-sm sm:btn-md">
            <Settings className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column - Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Project Info */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 w-full">
                <div>
                  <span className="text-sm text-gray-500">Department</span>
                  <p className="font-medium text-gray-900 truncate">{project.department}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Created</span>
                  <p className="font-medium text-gray-900 text-sm">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Tasks</span>
                  <p className="font-medium text-gray-900">{projectTasks.length}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Members</span>
                  <p className="font-medium text-gray-900">{project.members?.length || 0}</p>
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
              color: col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-'))
            })) || []}
            onManageColumns={() => setShowColumnManager(true)}
          />
        </div>

        {/* Right Column - Project Members */}
        <div className="xl:w-80 xl:flex-shrink-0">
          <div className="card p-4 xl:sticky xl:top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Members ({project.members?.length || 0})</span>
                <span className="sm:hidden">({project.members?.length || 0})</span>
              </h3>
              {canManageMembers && (
                <button 
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn-primary btn-sm"
                  title="Add Project Member"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[60vh] xl:max-h-[calc(100vh-12rem)] overflow-y-auto">
              {project.members && project.members.length > 0 ? (
                project.members
                  .filter(member => member.user) // Filter out members with null user objects
                  .map((member) => (
                  <div
                    key={member.user._id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{member.user.name}</p>
                        <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                          {getRoleIcon(member.role)}
                          <span className="text-xs font-medium text-gray-600">
                            {getRoleName(member.role)}
                          </span>
                        </div>
                        {member.addedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(member.addedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {canManageMembers && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === member.user._id ? null : member.user._id);
                          }}
                          className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md"
                        >
                          <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>

                        {dropdownOpen === member.user._id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUpdateRoleModal(member);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Change Role
                              </button>
                              {member.user._id !== user?._id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMember(member.user._id, member.user.name);
                                    setDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No members yet</p>
                  {canManageMembers && (
                    <button 
                      onClick={() => setShowAddMemberModal(true)}
                      className="btn-primary btn-sm mt-3"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Member
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={onCreateTask}
        loading={creating}
        initialStatus={selectedColumn}
        availableStatuses={project?.kanbanColumns?.map(col => ({ id: col.name, title: col.name })) || []}
        project={project ? {
          _id: project._id,
          createdBy: project.createdBy,
          members: project.members?.filter(m => m.user).map(m => ({
            user: { _id: m.user._id },
            role: m.role
          })),
          organization: project.organization?._id,
          visibility: project.visibility
        } : undefined}
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
        project={project ? {
          _id: project._id,
          createdBy: project.createdBy,
          members: project.members?.filter(m => m.user).map(m => ({
            user: { _id: m.user._id },
            role: m.role
          })),
          organization: project.organization?._id,
          visibility: project.visibility
        } : undefined}
      />

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setSelectedUserIds([]);
          resetMember();
        }}
        title="Add Project Member"
      >
        <form onSubmit={handleSubmitMember(onAddMember)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Users
            </label>
            <UserSelector
              selectedUserIds={selectedUserIds}
              onSelectionChange={(userIds) => {
                setSelectedUserIds(userIds);
              }}
              placeholder="Search and select users to add..."
              allowMultiple={true}
              showAvatars={true}
              className="w-full"
              project={project ? {
                _id: project._id,
                createdBy: project.createdBy,
                members: project.members?.filter(m => m.user).map(m => ({
                  user: { _id: m.user._id },
                  role: m.role
                })),
                organization: project.organization?._id,
                visibility: project.visibility
              } : undefined}
            />
            {selectedUserIds.length === 0 && (
              <p className="mt-1 text-sm text-red-600">Please select at least one user</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              {...registerMember('role', { required: 'Please select a role' })}
              className="input-field"
            >
              <option value="">Select role...</option>
              <option value="viewer">Viewer - Can view project and tasks</option>
              <option value="member">Member - Can create and edit tasks</option>
              <option value="admin">Admin - Can manage project and members</option>
            </select>
            {memberErrors.role && (
              <p className="mt-1 text-sm text-red-600">{memberErrors.role.message}</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <h4 className="font-medium mb-2">Role Permissions:</h4>
            <ul className="space-y-1 text-xs">
              <li><strong>Viewer:</strong> View project, tasks, and documents</li>
              <li><strong>Member:</strong> All viewer permissions + create/edit tasks</li>
              <li><strong>Admin:</strong> All member permissions + manage project settings and members</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setSelectedUserIds([]);
                resetMember();
              }}
              className="btn-outline"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={selectedUserIds.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member{selectedUserIds.length > 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Role Modal */}
      <Modal
        isOpen={showUpdateRoleModal}
        onClose={() => {
          setShowUpdateRoleModal(false);
          setSelectedMember(null);
        }}
        title="Update Member Role"
      >
        {selectedMember && selectedMember.user && (
          <form onSubmit={handleSubmitRole(onUpdateRole)} className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {selectedMember.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedMember.user.name}</p>
                <p className="text-sm text-gray-500">{selectedMember.user.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Role
              </label>
              <select
                {...registerRole('role', { required: 'Please select a role' })}
                className="input-field"
              >
                <option value="viewer">Viewer - Can view project and tasks</option>
                <option value="member">Member - Can create and edit tasks</option>
                <option value="admin">Admin - Can manage project and members</option>
              </select>
              {roleErrors.role && (
                <p className="mt-1 text-sm text-red-600">{roleErrors.role.message}</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              <h4 className="font-medium mb-2">Role Permissions:</h4>
              <ul className="space-y-1 text-xs">
                <li><strong>Viewer:</strong> View project, tasks, and documents</li>
                <li><strong>Member:</strong> All viewer permissions + create/edit tasks</li>
                <li><strong>Admin:</strong> All member permissions + manage project settings and members</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowUpdateRoleModal(false);
                  setSelectedMember(null);
                }}
                className="btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Edit className="w-4 h-4 mr-2" />
                Update Role
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Column Manager Modal */}
      <ColumnManager
        isOpen={showColumnManager}
        onClose={() => setShowColumnManager(false)}
        columns={project.kanbanColumns?.map(col => ({
          id: col.name.toLowerCase().replace(/\s+/g, '-'),
          title: col.name,
          color: col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-'))
        })) || []}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
      />
    </div>
  );
};

export default ProjectDetail;