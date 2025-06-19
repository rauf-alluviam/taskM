import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderOpen, Calendar, Users, MoreVertical, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useTask, Project } from '../contexts/TaskContext';
import { useNotification } from '../contexts/NotificationContext';
import { projectAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';

interface ProjectForm {
  name: string;
  description: string;
  department: string;
}

const Projects: React.FC = () => {
  const { projects, dispatch } = useTask();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>();

  useEffect(() => {
    loadProjects();
  }, []);

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
      const errorMessage = error.response?.data?.message || 'Failed to load projects';
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

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your project portfolio</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary btn-md mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error loading projects</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="ml-auto btn-outline btn-sm text-red-700 border-red-300 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="input pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id} className="card hover:shadow-md transition-shadow">
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
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {dropdownOpen === project._id && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDropdownOpen(null);
                            // Add edit functionality later
                            alert('Edit project functionality - to be implemented');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Link to={`/projects/${project._id}`} className="block">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600">
                    {project.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                </Link>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                    {project.department}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {project.kanbanColumns.length} columns
                    </span>
                    <Link
                      to={`/projects/${project._id}`}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Create your first project to get started'
            }
          </p>
          {!searchTerm && (
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
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        size="md"
      >
        <form onSubmit={handleSubmit(onCreateProject)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Project Name *
            </label>
            <input
              {...register('name', { required: 'Project name is required' })}
              className="input w-full"
              placeholder="Enter project name..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              className="textarea w-full"
              placeholder="Describe the project..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Department *
            </label>
            <input
              {...register('department', { required: 'Department is required' })}
              className="input w-full"
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
              <p className="mt-1 text-sm text-error-600">{errors.department.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-md"
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