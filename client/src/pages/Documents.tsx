import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  FolderOpen, 
  AlertCircle, 
  Trash2, 
  Upload,
  Grid3X3,
  List,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  Archive
} from 'lucide-react';
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
  isImported?: boolean;
  originalFileName?: string;
  mimetype?: string;
  fileSize?: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');


  const { register, handleSubmit, reset, formState: { errors } } = useForm<DocumentForm>();


  // Utility function to get file-specific icons with dark mode support
  const getFileIcon = (document: Document, isCardView = false) => {
    const iconClass = isCardView ? "w-6 h-6 text-white" : "w-6 h-6";
    
    if (document.isImported && document.mimetype) {
      const mimetype = document.mimetype;
      
      if (mimetype.startsWith('image/')) {
        return <Image className={`${iconClass} ${!isCardView ? 'text-green-600 dark:text-green-500' : ''}`} />;
      }
      
      if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype === 'text/csv') {
        return <FileSpreadsheet className={`${iconClass} ${!isCardView ? 'text-green-600 dark:text-green-500' : ''}`} />;
      }
      
      if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
        return <Presentation className={`${iconClass} ${!isCardView ? 'text-orange-600 dark:text-orange-500' : ''}`} />;
      }
      
      if (mimetype.includes('pdf')) {
        return <FileText className={`${iconClass} ${!isCardView ? 'text-red-600 dark:text-red-500' : ''}`} />;
      }
      
      if (mimetype.includes('word')) {
        return <FileText className={`${iconClass} ${!isCardView ? 'text-blue-600 dark:text-blue-500' : ''}`} />;
      }
      
      if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) {
        return <Archive className={`${iconClass} ${!isCardView ? 'text-purple-600 dark:text-purple-500' : ''}`} />;
      }
      
      return <File className={`${iconClass} ${!isCardView ? 'text-gray-600 dark:text-gray-400' : ''}`} />;
    }
    
    // Default icon for regular documents
    return <FileText className={`${iconClass} ${!isCardView ? 'text-blue-600 dark:text-blue-500' : ''}`} />;
  };


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


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
      
      console.log('Loading documents with projectId:', projectId);
      const data = await documentAPI.getDocuments(projectId || undefined);
      
      const filteredData = projectId ? data : data.filter((doc: { projectId: any; }) => !doc.projectId);
      
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


  const onImportDocument = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const finalProjectId = projectId;
      if (finalProjectId) {
        formData.append('projectId', finalProjectId);
      }


      console.log('Importing document with file:', file.name);
      const newDoc = await documentAPI.importDocument(formData);
      setDocuments([newDoc, ...documents]);
      addNotification({
        type: 'success',
        title: 'Document Imported',
        message: `"${newDoc.title}" has been imported successfully`,
      });
    } catch (error: any) {
      console.error('Failed to import document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to import document';
      addNotification({
        type: 'error',
        title: 'Error Importing Document',
        message: errorMessage,
      });
    } finally {
      setImporting(false);
    }
  };


  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/markdown', 'application/rtf', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/jpeg', 'image/jpg',
        'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/json', 'text/html',
        'text/xml', 'application/xml'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        addNotification({
          type: 'error', title: 'Invalid File Type',
          message: 'Please select a supported file type (PDF, Word, Excel, PowerPoint, images, text files, etc.).',
        });
        return;
      }


      if (file.size > 50 * 1024 * 1024) {
        addNotification({ type: 'error', title: 'File Too Large', message: 'File size must be less than 50MB.' });
        return;
      }


      onImportDocument(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const onDeleteDocument = async (documentId: string) => {
    setDeleting(true);
    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc._id !== documentId));
      setDeleteConfirmId(null);
      addNotification({ type: 'success', title: 'Document Deleted', message: 'Document has been deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete document';
      addNotification({ type: 'error', title: 'Error Deleting Document', message: errorMessage });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectId ? 'Project Documents' : 'Personal Documents'}
          </h1>
          <p className="text-gray-600 mt-1 dark:text-gray-300">
            {projectId 
              ? 'Manage documents for this project'
              : 'Manage your personal documents (not associated with any project)'
            }
          </p>
          {!projectId && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/50 dark:border-blue-700">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> To view project documents, navigate to a specific project first. 
                Project documents are only accessible to project members.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.rtf"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-outline btn-md"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Document'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            {projectId ? 'New Project Document' : 'New Personal Document'}
          </button>
        </div>
      </div>


      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 dark:bg-red-900/50 dark:border-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium dark:text-red-300">Error loading documents</p>
            <p className="text-red-600 text-sm dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={loadDocuments}
            className="ml-auto btn-outline btn-sm text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      )}


      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search documents..."
            className="input pl-10 w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center bg-gray-100 rounded-lg p-1 dark:bg-gray-800">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Grid3X3 className="w-4 h-4 mr-1.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4 mr-1.5" />
            List
          </button>
        </div>
      </div>


      {/* Documents Display */}
      {filteredDocuments.length > 0 ? (
        viewMode === 'card' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div key={doc._id} className="card hover:shadow-md transition-shadow dark:bg-gray-800 dark:border dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-accent-400 to-accent-600 rounded-lg flex items-center justify-center">
                      {getFileIcon(doc, true)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="relative group">
                        <button
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 dark:text-gray-500 dark:hover:text-red-500 dark:hover:bg-gray-700"
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 line-clamp-2 dark:text-white dark:hover:text-primary-400">
                      {doc.isImported ? (doc.originalFileName || doc.title) : doc.title}
                    </h3>
                  </Link>


                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 dark:text-gray-300">
                    {doc.isImported ? (
                      <span className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-900 dark:text-blue-300">
                          Imported File
                        </span>
                        {doc.fileSize && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        )}
                      </span>
                    ) : (
                      doc.content ? 
                        doc.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' :
                        'No content yet...'
                    )}
                  </p>


                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {doc.projectName && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {doc.projectName}
                      </span>
                    )}
                  </div>


                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to={`/documents/${doc._id}`}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {doc.isImported ? 'View File →' : 'Open Document →'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white shadow rounded-lg overflow-hidden dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                <div className="col-span-1">Type</div>
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Project</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-2">Modified</div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((doc) => (
                <div key={doc._id} className="px-4 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700/50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                        {getFileIcon(doc, false)}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Link 
                        to={`/documents/${doc._id}`}
                        className="block hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <div className="font-medium text-gray-900 truncate dark:text-white">
                          {doc.isImported ? (doc.originalFileName || doc.title) : doc.title}
                        </div>
                        {doc.isImported && (
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              Imported
                            </span>
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="col-span-2">
                      {doc.projectName ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                          <FolderOpen className="w-3 h-3 mr-1" />
                          {doc.projectName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm dark:text-gray-500">Personal</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 dark:text-gray-500 dark:hover:text-red-500 dark:hover:bg-gray-700"
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
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4 dark:text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-white">
            {searchTerm ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-gray-500 mb-6 dark:text-gray-400">
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
            <label className="block text-sm font-medium text-gray-900 mb-2 dark:text-gray-200">
              Document Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter document title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.title.message}</p>
            )}
          </div>


          {!projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2 dark:text-gray-200">
                Project (Optional)
              </label>
              <select {...register('projectId')} className="input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="">Personal Document (No Project)</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.department})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Documents created within a project are only accessible to project members.
              </p>
            </div>
          )}


          {projectId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/50 dark:border-blue-700">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📁 This document will be created in the current project and will only be accessible to project members.
              </p>
            </div>
          )}


          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
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
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center dark:bg-red-900/50">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Document</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete "{documents.find(d => d._id === deleteConfirmId)?.title}"?
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-md p-3 dark:bg-red-900/50 dark:border-red-700">
              <p className="text-sm text-red-800 dark:text-red-300">
                ⚠️ This action cannot be undone. The document will be permanently removed.
              </p>
            </div>


            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
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
