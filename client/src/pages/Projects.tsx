import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Calendar, MoreVertical, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useTask, Project } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, teamAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import ProjectFilters, { ProjectFilters as ProjectFiltersType } from '../components/Filters/ProjectFilters';
import { useForm } from 'react-hook-form';

interface ProjectForm {
  name: string;
  description: string;
  department: string;
  teamId?: string;
  visibility: 'private' | 'team' | 'organization' | 'public';
}

const Projects: React.FC = () => {
  const { projects, dispatch } = useTask();
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const teamIdFromUrl = searchParams.get('team');
  
  const [loading, setLoading] = useState(true);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [filters, setFilters] = useState<ProjectFiltersType>({
    search: '',
    department: '',
    dateRange: { start: '', end: '' },
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProjectForm>();

  useEffect(() => {
    loadProjects();
    loadTeams();
    
    // Set default team if coming from team page
    if (teamIdFromUrl) {
      setValue('teamId', teamIdFromUrl);
      setValue('visibility', 'team');
    }
    
    // Auto-open create modal if accessing /projects/create
    if (location.pathname === '/projects/create') {
      setShowCreateModal(true);
    }
  }, [teamIdFromUrl, location.pathname]);

  const loadTeams = async () => {
    if (!user?.organization) return;
    
    try {
      const data = await teamAPI.getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectAPI.getProjects();
      dispatch({ type: 'SET_PROJECTS', payload: data });
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      
      let errorMessage = 'Failed to load projects';
      
      // Provide more specific error messages
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Projects',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const onCreateProject = async (data: ProjectForm) => {
    setCreating(true);
    try {
      const newProject = await projectAPI.createProject({
        ...data,
        kanbanColumns: [
          { name: 'todo', order: 0 },
          { name: 'in-progress', order: 1 },
          { name: 'review', order: 2 },
          { name: 'done', order: 3 },
        ],
      });
      dispatch({ type: 'ADD_PROJECT', payload: newProject });
      reset();
      setShowCreateModal(false);
      
      // Navigate back to /projects if we came from /projects/create
      if (location.pathname === '/projects/create') {
        navigate('/projects', { replace: true });
      }
      
      addNotification({
        type: 'success',
        title: 'Project Created',
        message: `"${newProject.name}" has been created successfully`,
      });
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create project';
      addNotification({
        type: 'error',
        title: 'Error Creating Project',
        message: errorMessage,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will also delete all tasks associated with this project. This action cannot be undone.`)) {
      return;
    }

    try {
      await projectAPI.deleteProject(project._id);
      dispatch({ type: 'DELETE_PROJECT', payload: project._id });
      addNotification({
        type: 'success',
        title: 'Project Deleted',
        message: `"${project.name}" has been deleted successfully`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete project';
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage,
        duration: 5000
      });
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    reset();
    // If we came from /projects/create route, navigate back to /projects
    if (location.pathname === '/projects/create') {
      navigate('/projects', { replace: true });
    }
  };

  const departments = [...new Set(projects.map(p => p.department))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">Error loading projects</p>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="ml-auto btn-outline btn-sm text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Project Filters */}
      <ProjectFilters
        projects={projects}
        filters={filters}
        onFiltersChange={setFilters}
        onFilteredProjectsChange={setFilteredProjects}
        onCreateProject={() => setShowCreateModal(true)}
      />

      {/* Results Count */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
          {filteredProjects.length !== projects.length && (
            <span className="text-primary-600 dark:text-primary-400">
              Filtered by: {[
                filters.search && 'search',
                filters.department && 'department',
                filters.dateRange.start && 'date range'
              ].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id} className="card hover:shadow-md dark:hover:shadow-xl transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === project._id ? null : project._id);
                      }}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {dropdownOpen === project._id && (
                      <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-xl z-50 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropdownOpen(null);
                            // Add edit functionality later
                            alert('Edit project functionality - to be implemented');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropdownOpen(null);
                            handleDeleteProject(project);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Link to={`/projects/${project._id}`} className="block">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 hover:text-primary-600 dark:hover:text-primary-400">
                    {project.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                </Link>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300">
                    {project.department}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.kanbanColumns.length} columns
                    </span>
                    <Link
                      to={`/projects/${project._id}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View Project →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {filters.search || filters.department || filters.dateRange.start || filters.dateRange.end
              ? 'No projects found' 
              : 'No projects yet'
            }
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filters.search || filters.department || filters.dateRange.start || filters.dateRange.end
              ? 'Try adjusting your filters or search terms' 
              : 'Create your first project to get started'
            }
          </p>
          {!(filters.search || filters.department || filters.dateRange.start || filters.dateRange.end) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create New Project"
        size="md"
      >
        <form onSubmit={handleSubmit(onCreateProject)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Project Name *
            </label>
            <input
              {...register('name', { required: 'Project name is required' })}
              className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
              placeholder="Enter project name..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
              placeholder="Describe the project..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Department *
            </label>
            <input
              {...register('department', { required: 'Department is required' })}
              className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
              placeholder="e.g., Engineering, Marketing, Design"
              list="departments"
            />
            <datalist id="departments">
              {departments.map(dept => (
                <option key={dept} value={dept} />
              ))}
              <option value="Engineering" />
              <option value="Marketing" />
              <option value="Design" />
              <option value="Sales" />
              <option value="Support" />
            </datalist>
            {errors.department && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.department.message}</p>
            )}
          </div>

          {/* Team Selection */}
          {user?.organization && teams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Team
              </label>
              <select {...register('teamId')} className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400">
                <option value="">No specific team (Organization-wide)</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Select a team to create a team-specific project
              </p>
            </div>
          )}

          {/* Visibility Settings */}
          {user?.organization && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Project Visibility *
              </label>
              <select {...register('visibility', { required: 'Visibility is required' })} className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400">
                <option value="private">Private - Only you and invited members</option>
                <option value="team">Team - All team members can access</option>
                <option value="organization">Organization - All organization members can view</option>
                <option value="public">Public - Anyone can view (if enabled)</option>
              </select>
              {errors.visibility && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.visibility.message}</p>
              )}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="space-y-1">
                  <p>• <strong className="text-gray-700 dark:text-gray-300">Private:</strong> Only project members can access</p>
                  <p>• <strong className="text-gray-700 dark:text-gray-300">Team:</strong> All team members can participate</p>
                  <p>• <strong className="text-gray-700 dark:text-gray-300">Organization:</strong> All organization members can view</p>
                  <p>• <strong className="text-gray-700 dark:text-gray-300">Public:</strong> Anyone with the link can view</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              className="btn-outline btn-md border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;