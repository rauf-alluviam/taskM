import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  FileText,
  Users,
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  User,
  Building2,
  Calendar,
  CheckSquare,
  Plus,
  ChevronDown,
  Eye,
  Activity,
  Clock
} from 'lucide-react';
import { useTask, Task, Project } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, taskAPI, kanbanAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import EditTaskModal from '../components/Tasks/EditTaskModal';
import CreateTaskModal from '../components/Tasks/CreateTaskModal';
import KanbanBoard from '../components/Tasks/KanbanBoard';
import ColumnManager from '../components/Tasks/ColumnManager';
import UserSelector from '../components/UI/UserSelector';
import { useForm } from 'react-hook-form';
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
  const [memberActionDropdownOpen, setMemberActionDropdownOpen] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // State and ref for the new members popover
  const [isMembersPopoverOpen, setIsMembersPopoverOpen] = useState(false);
  const membersPopoverRef = useRef<HTMLDivElement>(null);
  const membersButtonRef = useRef<HTMLButtonElement>(null);

  // Form hooks for member management
  const { register: registerMember, handleSubmit: handleSubmitMember, reset: resetMember, formState: { errors: memberErrors } } = useForm<AddMemberForm>();
  const { register: registerRole, handleSubmit: handleSubmitRole, setValue: setRoleValue, formState: { errors: roleErrors } } = useForm<UpdateRoleForm>();

  useEffect(() => {
    if (id) {
      console.log('🔍 ProjectDetail: Debugging authentication...');
      debugAuth();
      testApiAuth();
      loadProjectData();
    }
  }, [id]);

  // Effect to handle clicks outside of popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close member action dropdown
      if (memberActionDropdownOpen) {
        setMemberActionDropdownOpen(null);
      }

      // Close main members popover
      if (
        isMembersPopoverOpen &&
        membersPopoverRef.current &&
        !membersPopoverRef.current.contains(event.target as Node) &&
        membersButtonRef.current &&
        !membersButtonRef.current.contains(event.target as Node)
      ) {
        setIsMembersPopoverOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMembersPopoverOpen, memberActionDropdownOpen]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, tasksData] = await Promise.all([
        projectAPI.getProject(id!),
        taskAPI.getTasks(id),
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
      for (const userId of selectedUserIds) {
        await projectAPI.addMember(project._id, userId, data.role);
      }
      addNotification({ type: 'success', title: 'Member(s) Added', message: `${selectedUserIds.length} member(s) added successfully` });
      resetMember();
      setSelectedUserIds([]);
      setShowAddMemberModal(false);
      loadProjectData(); // Refresh project data
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to add member(s)' });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    // A simple custom modal could replace this confirm dialog for better UX
    if (!project || !window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }

    try {
      await projectAPI.removeMember(project._id, memberId);
      addNotification({ type: 'success', title: 'Member Removed', message: `${memberName} has been removed from the project` });
      loadProjectData(); // Refresh data
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to remove member' });
    }
  };

  const openUpdateRoleModal = (member: any) => {
    if (!member.user) return;
    setSelectedMember(member);
    setRoleValue('role', member.role);
    setShowUpdateRoleModal(true);
    setIsMembersPopoverOpen(false); // Close popover when modal opens
  };

  const onUpdateRole = async (data: UpdateRoleForm) => {
    if (!selectedMember || !selectedMember.user || !project) return;

    try {
      await projectAPI.updateMemberRole(project._id, selectedMember.user._id, data.role);
      addNotification({ type: 'success', title: 'Role Updated', message: `${selectedMember.user.name}'s role has been updated` });
      setShowUpdateRoleModal(false);
      setSelectedMember(null);
      loadProjectData(); // Refresh data
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to update role' });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-amber-500" />;
      case 'member': return <User className="w-4 h-4 text-blue-500" />;
      default: return <Eye className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200';
      case 'member': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200';
      default: return 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 border-slate-200';
    }
  };

  const getColorForColumn = (columnId: string) => {
    const colorMap: { [key: string]: string } = {
      'todo': 'bg-slate-200', 'in-progress': 'bg-blue-200', 'review': 'bg-yellow-200',
      'done': 'bg-green-200', 'testing': 'bg-purple-200', 'blocked': 'bg-red-200',
      'deployed': 'bg-teal-200',
    };
    return colorMap[columnId] || 'bg-gray-200';
  };

  const onCreateTask = async (data: any) => {
    setCreating(true);
    try {
      const taskData = {
        ...data,
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

  const projectTasks = tasks.filter(task => String((task.projectId as any)?._id || task.projectId) === String(id));

  const handleDeleteTask = async (task: Task) => {
    try {
      await taskAPI.deleteTask(task._id);
      dispatch({ type: 'DELETE_TASK', payload: task._id });
      addNotification({ type: 'success', title: 'Task Deleted', message: `"${task.title}" has been deleted successfully` });
    } catch (error) {
      console.error('Failed to delete task:', error);
      addNotification({ type: 'error', title: 'Delete Failed', message: 'Failed to delete task.' });
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
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : data.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean) || [],
        assignedUsers: data.assignedUsers || [],
        projectId: id,
      };
      const updatedTask = await taskAPI.updateTask(selectedTask._id, taskData);
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      setShowEditModal(false);
      setSelectedTask(null);
      addNotification({ type: 'success', title: 'Task Updated', message: `"${updatedTask.title}" has been updated.` });
    } catch (error) {
      console.error('Failed to update task:', error);
      addNotification({ type: 'error', title: 'Update Failed', message: 'Failed to update task.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    const updatedTask = projectTasks.find(t => t._id === taskId);
    if (updatedTask) {
      const newTask = { ...updatedTask, ...updates };
      dispatch({ type: 'UPDATE_TASK', payload: newTask });
    }
  };

  const handleAddColumn = async (newColumn: { id: string; title: string; color: string }) => {
    if (!project) return;
    try {
      await kanbanAPI.addColumn(newColumn.title, newColumn.color, project._id);
      loadProjectData();
      addNotification({ type: 'success', title: 'Column Added', message: `"${newColumn.title}" column added.` });
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Failed to Add Column', message: error.response?.data?.message || 'Unable to add column.' });
    }
  };

  const handleRemoveColumn = async (columnId: string) => {
    if (!project) return;
    try {
      await kanbanAPI.deleteColumn(columnId, project._id);
      loadProjectData();
      addNotification({ type: 'success', title: 'Column Removed', message: 'Column removed successfully.' });
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Failed to Remove Column', message: error.response?.data?.message || 'Unable to remove column.' });
    }
  };

  const canManageMembers = user && project && (
    project.createdBy === user._id ||
    project.members?.some(m => m.user?._id === user._id && m.role === 'admin') ||
    user.role === 'super_admin' ||
    (user.organization && user.role === 'org_admin')
  );

  // Calculate project stats
  const completedTasks = projectTasks.filter(task => task.status === 'done' || task.status === 'completed').length;
  const completionPercentage = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
  const activeTasks = projectTasks.filter(task => task.status === 'in-progress' || task.status === 'in progress').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600 animate-pulse">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Project not found</h2>
          <p className="text-slate-500 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/projects" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-white via-blue-50 to-indigo-100 border-b border-slate-200 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4 min-w-0">
              <Link 
                to="/projects" 
                className="group p-3 text-slate-600 hover:text-blue-600 hover:bg-white/70 rounded-xl flex-shrink-0 transition-all duration-300 ease-out hover:scale-110 hover:shadow-lg"
              >
                <ArrowLeft className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform duration-300" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {project.name}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${completionPercentage >= 100 ? 'bg-green-400' : completionPercentage >= 50 ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-xs font-medium text-slate-500">{Math.round(completionPercentage)}% Complete</span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm sm:text-base line-clamp-2 leading-relaxed">{project.description}</p>
              </div>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="relative flex items-center space-x-3 flex-shrink-0">
              {/* Members Popover Button */}
              <button
                ref={membersButtonRef}
                onClick={() => setIsMembersPopoverOpen(!isMembersPopoverOpen)}
                className={`group relative overflow-hidden px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ease-out border-2 ${
                  isMembersPopoverOpen 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-500/25' 
                    : 'bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/25'
                } transform hover:scale-105 hover:-translate-y-0.5`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Members</span>
                  <span className="text-xs bg-slate-800/20 px-2 py-0.5 rounded-full">
                    {project.members?.length || 0}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMembersPopoverOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Enhanced Members Popover */}
              <div
                ref={membersPopoverRef}
                className={`absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 z-30 transition-all duration-300 ease-out origin-top-right ${
                  isMembersPopoverOpen 
                    ? 'opacity-100 scale-100 translate-y-0' 
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="p-6 border-b border-slate-200/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">Project Team</h3>
                      <p className="text-sm text-slate-500 mt-1">{project.members?.length || 0} members</p>
                    </div>
                    {canManageMembers && (
                      <button
                        onClick={() => {
                          setShowAddMemberModal(true);
                          setIsMembersPopoverOpen(false);
                        }}
                        className="group px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                      >
                        <UserPlus className="w-4 h-4 mr-2 inline" />
                        Add Member
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                  {project.members && project.members.length > 0 ? (
                    project.members
                      .filter(member => member.user)
                      .map((member, index) => (
                        <div 
                          key={member.user._id} 
                          className="group flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-lg">
                                <span className="text-white font-semibold text-sm">
                                  {member.user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="absolute -bottom-1 -right-1">
                                {getRoleIcon(member.role)}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-800 text-sm truncate">{member.user.name}</p>
                              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(member.role)}`}>
                                {getRoleIcon(member.role)}
                                <span>{getRoleName(member.role)}</span>
                              </div>
                            </div>
                          </div>
                          {canManageMembers && (
                            <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberActionDropdownOpen(memberActionDropdownOpen === member.user._id ? null : member.user._id);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-all duration-300 hover:shadow-md"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {memberActionDropdownOpen === member.user._id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden">
                                  <div className="py-2">
                                    <button 
                                      onClick={() => openUpdateRoleModal(member)} 
                                      className="flex items-center w-full px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200"
                                    >
                                      <Edit className="w-4 h-4 mr-3" /> 
                                      Change Role
                                    </button>
                                    {member.user._id !== user?._id && (
                                      <button 
                                        onClick={() => handleRemoveMember(member.user._id, member.user.name)} 
                                        className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                                      >
                                        <Trash2 className="w-4 h-4 mr-3" /> 
                                        Remove Member
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
                    <div className="text-center py-12 text-slate-500">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-medium">No team members yet</p>
                      <p className="text-sm mt-1">Add members to start collaborating</p>
                    </div>
                  )}
                </div>
              </div>

              <Link 
                to={`/documents?project=${id}`} 
                className="group px-4 py-2.5 bg-white/80 backdrop-blur-sm text-slate-700 rounded-xl font-medium border-2 border-slate-200 transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105 hover:-translate-y-0.5"
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                <span className="hidden sm:inline">Documents</span>
              </Link>
              
              <button className="group px-4 py-2.5 bg-white/80 backdrop-blur-sm text-slate-700 rounded-xl font-medium border-2 border-slate-200 transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 hover:text-white hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 hover:-translate-y-0.5">
                <Settings className="w-4 h-4 mr-2 inline" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Project Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg"><Building2 className="w-6 h-6 text-slate-500" /></div>
                    <div><span className="text-sm text-slate-500">Department</span><p className="font-bold text-lg text-slate-800 truncate">{project.department}</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg"><Calendar className="w-6 h-6 text-slate-500" /></div>
                    <div><span className="text-sm text-slate-500">Created</span><p className="font-bold text-lg text-slate-800">{new Date(project.createdAt).toLocaleDateString()}</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg"><CheckSquare className="w-6 h-6 text-slate-500" /></div>
                    <div><span className="text-sm text-slate-500">Tasks</span><p className="font-bold text-lg text-slate-800">{projectTasks.length}</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-lg"><Users className="w-6 h-6 text-slate-500" /></div>
                    <div><span className="text-sm text-slate-500">Members</span><p className="font-bold text-lg text-slate-800">{project.members?.length || 0}</p></div>
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
          columns={project.kanbanColumns?.map(col => ({ id: col.name, title: col.name, color: col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-')) })) || []}
          onManageColumns={() => setShowColumnManager(true)}
        />
      </div>

      {/* Modals */}
      <CreateTaskModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} onSubmit={onCreateTask} loading={creating} initialStatus={selectedColumn} availableStatuses={project?.kanbanColumns?.map(col => ({ id: col.name, title: col.name })) || []} project={project ? { _id: project._id, createdBy: project.createdBy, members: project.members?.filter(m => m.user).map(m => ({ user: { _id: m.user._id }, role: m.role })), organization: project.organization?._id, visibility: project.visibility } : undefined} />
      <EditTaskModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTask(null); }} onSubmit={handleUpdateTask} onDelete={() => selectedTask && handleDeleteTask(selectedTask)} task={selectedTask} loading={updating} availableStatuses={project?.kanbanColumns?.map(col => ({ id: col.name, title: col.name })) || []} project={project ? { _id: project._id, createdBy: project.createdBy, members: project.members?.filter(m => m.user).map(m => ({ user: { _id: m.user._id }, role: m.role })), organization: project.organization?._id, visibility: project.visibility } : undefined} />
      <Modal isOpen={showAddMemberModal} onClose={() => { setShowAddMemberModal(false); setSelectedUserIds([]); resetMember(); }} title="Add Project Member">
        <form onSubmit={handleSubmitMember(onAddMember)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Users</label>
            <UserSelector selectedUserIds={selectedUserIds} onSelectionChange={setSelectedUserIds} placeholder="Search and select users..." allowMultiple={true} showAvatars={true} className="w-full" project={project ? { _id: project._id, createdBy: project.createdBy, members: project.members?.filter(m => m.user).map(m => ({ user: { _id: m.user._id }, role: m.role })), organization: project.organization?._id, visibility: project.visibility } : undefined} />
            {selectedUserIds.length === 0 && <p className="mt-1 text-sm text-red-600">Please select at least one user</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select {...registerMember('role', { required: 'Please select a role' })} className="input-field">
              <option value="">Select role...</option>
              <option value="viewer">Viewer - Can view project and tasks</option>
              <option value="member">Member - Can create and edit tasks</option>
              <option value="admin">Admin - Can manage project and members</option>
            </select>
            {memberErrors.role && <p className="mt-1 text-sm text-red-600">{memberErrors.role.message}</p>}
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
            <h4 className="font-medium mb-2 text-slate-800">Role Permissions:</h4>
            <ul className="space-y-1 text-xs"><li><strong>Viewer:</strong> View project, tasks, and documents</li><li><strong>Member:</strong> All viewer permissions + create/edit tasks</li><li><strong>Admin:</strong> All member permissions + manage project settings and members</li></ul>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => { setShowAddMemberModal(false); setSelectedUserIds([]); resetMember(); }} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary" disabled={selectedUserIds.length === 0}><UserPlus className="w-4 h-4 mr-2" />Add Member{selectedUserIds.length > 1 ? 's' : ''}</button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={showUpdateRoleModal} onClose={() => { setShowUpdateRoleModal(false); setSelectedMember(null); }} title="Update Member Role">
        {selectedMember && selectedMember.user && (
          <form onSubmit={handleSubmitRole(onUpdateRole)} className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center"><span className="text-white font-medium">{selectedMember.user.name.charAt(0).toUpperCase()}</span></div>
              <div><p className="font-medium text-slate-900">{selectedMember.user.name}</p><p className="text-sm text-slate-500">{selectedMember.user.email}</p></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Role</label>
              <select {...registerRole('role', { required: 'Please select a role' })} className="input-field">
                <option value="viewer">Viewer</option><option value="member">Member</option><option value="admin">Admin</option>
              </select>
              {roleErrors.role && <p className="mt-1 text-sm text-red-600">{roleErrors.role.message}</p>}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => { setShowUpdateRoleModal(false); setSelectedMember(null); }} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary"><Edit className="w-4 h-4 mr-2" />Update Role</button>
            </div>
          </form>
        )}
      </Modal>
      <ColumnManager isOpen={showColumnManager} onClose={() => setShowColumnManager(false)} columns={project.kanbanColumns?.map(col => ({ id: col.name.toLowerCase().replace(/\s+/g, '-'), title: col.name, color: col.color || getColorForColumn(col.name.toLowerCase().replace(/\s+/g, '-')) })) || []} onAddColumn={handleAddColumn} onRemoveColumn={handleRemoveColumn} />
    </div>
  );
};

export default ProjectDetail;
