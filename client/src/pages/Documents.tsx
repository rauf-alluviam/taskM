import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search, Calendar, User, FolderOpen, AlertCircle, Trash2 } from 'lucide-react';
import { documentAPI, projectAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useForm } from 'react-hook-form';

interface Document {
  _id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentForm {
  title: string;
  projectId?: string;
}

interface Project {
  _id: string;
  name: string;
  department: string;
}

const Documents: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { addNotification } = useNotification();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DocumentForm>();

  useEffect(() => {
    loadDocuments();
    loadProjects();
  }, [projectId]);

  const loadProjects = async () => {
    try {
      const data = await projectAPI.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If no projectId is specified, we should either:
      // 1. Redirect to projects page, or
      // 2. Only show user's personal documents (not project documents)
      // For now, let's show user's personal documents only
      
      console.log('Loading documents with projectId:', projectId);
      const data = await documentAPI.getDocuments(projectId || undefined);
      
      // If no projectId specified, filter out project documents on client side as extra safety
      const filteredData = projectId ? data : data.filter(doc => !doc.projectId);
      
      console.log('Documents received:', data.length, 'Filtered:', filteredData.length);
      setDocuments(filteredData);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load documents';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error Loading Documents',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const onCreateDocument = async (data: DocumentForm) => {
    setCreating(true);
    try {
      const documentData: any = {
        title: data.title,
        content: '',
      };
      
      // Only include projectId if it's provided
      const finalProjectId = projectId || data.projectId;
      if (finalProjectId) {
        documentData.projectId = finalProjectId;
      }
      
      console.log('Creating document with data:', documentData);
      const newDoc = await documentAPI.createDocument(documentData);
      setDocuments([newDoc, ...documents]);
      reset();
      setShowCreateModal(false);
      addNotification({
        type: 'success',
        title: 'Document Created',
        message: `"${newDoc.title}" has been created successfully`,
      });
    } catch (error: any) {
      console.error('Failed to create document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create document';
      addNotification({
        type: 'error',
        title: 'Error Creating Document',
        message: errorMessage,
      });
    } finally {
      setCreating(false);
    }
  };

  const onDeleteDocument = async (documentId: string) => {
    setDeleting(true);
    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc._id !== documentId));
      setDeleteConfirmId(null);
      addNotification({
        type: 'success',
        title: 'Document Deleted',
        message: 'Document has been deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      addNotification({
        type: 'error',
        title: 'Error Deleting Document',
        message: errorMessage,
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">
            {projectId ? 'Project Documents' : 'Personal Documents'}
          </h1>
          <p className="text-gray-600 mt-1">
            {projectId 
              ? 'Manage documents for this project'
              : 'Manage your personal documents (not associated with any project)'
            }
          </p>
          {!projectId && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> To view project documents, navigate to a specific project first. 
                Project documents are only accessible to project members.
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary btn-md mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {projectId ? 'New Project Document' : 'New Personal Document'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error loading documents</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={loadDocuments}
            className="ml-auto btn-outline btn-sm text-red-700 border-red-300 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search documents..."
          className="input pl-10 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc._id} className="card hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-accent-400 to-accent-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="relative group">
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirmId(doc._id);
                        }}
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <Link to={`/documents/${doc._id}`} className="block">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 line-clamp-2">
                    {doc.title}
                  </h3>
                </Link>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {doc.content ? 
                    doc.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' :
                    'No content yet...'
                  }
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {doc.projectName && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {doc.projectName}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    to={`/documents/${doc._id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Open Document →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : projectId 
                ? 'Create your first document for this project'
                : 'Create your first document to get started'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary btn-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </button>
          )}
        </div>
      )}

      {/* Create Document Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Document"
        size="md"
      >
        <form onSubmit={handleSubmit(onCreateDocument)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Document Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input w-full"
              placeholder="Enter document title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-error-600">{errors.title.message}</p>
            )}
          </div>

          {!projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Project (Optional)
              </label>
              <select {...register('projectId')} className="input w-full">
                <option value="">Personal Document (No Project)</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.department})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Documents created within a project are only accessible to project members.
              </p>
            </div>
          )}

          {projectId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                📁 This document will be created in the current project and will only be accessible to project members.
              </p>
            </div>
          )}

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
              {creating ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Document"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{documents.find(d => d._id === deleteConfirmId)?.title}"?
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                ⚠️ This action cannot be undone. The document will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="btn-outline btn-md"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => onDeleteDocument(deleteConfirmId)}
                disabled={deleting}
                className="btn-danger btn-md"
              >
                {deleting ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Documents;