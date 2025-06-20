import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Trash2,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Presentation,
  Eye
} from 'lucide-react';
import { documentAPI, attachmentAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

interface Document {
  _id: string;
  title: string;
  content: string;
  isImported?: boolean;
  originalFileName?: string;
  mimetype?: string;
  fileSize?: number;
  s3Key?: string;
  s3Url?: string;
  projectId?: string;
  projectName?: string;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Attachment {
  _id: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  description?: string;
  createdAt: string;
}

const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotification();
  const [document, setDocument] = useState<Document | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDocument();
      loadAttachments();
    }
  }, [id]);
  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await documentAPI.getDocument(id!);
      setDocument(data);

      // If this is an imported document, get the download URL
      if (data.isImported) {
        try {
          const downloadData = await documentAPI.getDownloadUrl(id!);
          setDownloadUrl(downloadData.downloadUrl);
          
          // For images, also set as preview URL
          if (data.mimetype?.startsWith('image/')) {
            setPreviewUrl(downloadData.downloadUrl);
          }
        } catch (downloadError) {
          console.error('Failed to get download URL:', downloadError);
        }
      }
    } catch (error: any) {
      console.error('Failed to load document:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load document',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    try {
      setLoadingAttachments(true);
      const data = await attachmentAPI.getAttachments('document', id!);
      setAttachments(data);
    } catch (error: any) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) {
      return <Image className="w-8 h-8 text-green-600" />;
    }
    
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype === 'text/csv') {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    }
    
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
      return <Presentation className="w-8 h-8 text-orange-600" />;
    }
    
    if (mimetype.includes('pdf') || mimetype.includes('word') || mimetype.includes('text')) {
      return <FileText className="w-8 h-8 text-blue-600" />;
    }
    
    return <File className="w-8 h-8 text-gray-600" />;
  };

  const getFileTypeLabel = (mimetype: string) => {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'text/csv': 'CSV',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'text/plain': 'Text',
      'text/markdown': 'Markdown',
      'application/json': 'JSON',
      'text/html': 'HTML',
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/webp': 'WebP',
      'image/svg+xml': 'SVG',
    };
    
    return typeMap[mimetype] || 'File';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const handleDownload = async (attachment: Attachment) => {
    try {
      const result = await attachmentAPI.getDownloadUrl(attachment._id);
      const link = window.document.createElement('a');
      link.href = result.downloadUrl;
      link.download = attachment.originalName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error: any) {
      console.error('Download error:', error);
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.response?.data?.message || 'Failed to download file',
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await attachmentAPI.deleteAttachment(attachmentId);
      setAttachments(attachments.filter(att => att._id !== attachmentId));
      addNotification({
        type: 'success',
        title: 'File Deleted',
        message: 'File has been deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.message || 'Failed to delete file',
      });
    }
  };
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!document) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Document not found</p>
        <Link to="/documents" className="text-primary-600 hover:text-primary-700">
          Back to Documents
        </Link>
      </div>
    );
  }

  // If this is an imported document, show the file viewer
  if (document.isImported && document.originalFileName) {
    const handleFileDownload = () => {
      if (downloadUrl) {
        const link = window.document.createElement('a');
        link.href = downloadUrl;
        link.download = document.originalFileName!;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
    };

    const handleFilePreview = () => {
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      }
    };

    const canPreview = (mimetype: string) => {
      return mimetype.startsWith('image/') || 
             mimetype === 'text/plain' || 
             mimetype === 'text/html' || 
             mimetype === 'application/pdf';
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link 
              to={document.projectId ? `/documents?project=${document.projectId}` : '/documents'}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
              {document.projectName && (
                <p className="text-sm text-gray-600">Project: {document.projectName}</p>
              )}
            </div>
          </div>
        </div>

        {/* File Card */}
        <div className="bg-white border rounded-lg shadow-sm p-8">
          <div className="text-center">
            {/* File Icon */}
            <div className="flex justify-center mb-6">
              {getFileIcon(document.mimetype!)}
            </div>

            {/* File Info */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {document.originalFileName}
            </h2>
            <p className="text-gray-600 mb-2">
              {getFileTypeLabel(document.mimetype!)}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {formatFileSize(document.fileSize!)} • Created by {document.createdBy.name} • {new Date(document.createdAt).toLocaleDateString()}
            </p>

            {/* Image Preview */}
            {previewUrl && document.mimetype?.startsWith('image/') && (
              <div className="mb-6">
                <img 
                  src={previewUrl} 
                  alt={document.originalFileName}
                  className="max-w-full h-auto max-h-96 mx-auto rounded border shadow-sm"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              {canPreview(document.mimetype!) && (
                <button
                  onClick={handleFilePreview}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
              )}
              
              <button
                onClick={handleFileDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Document Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">File Type:</span>
              <span className="ml-2 text-gray-900">{document.mimetype}</span>
            </div>
            <div>
              <span className="text-gray-500">Size:</span>
              <span className="ml-2 text-gray-900">{formatFileSize(document.fileSize!)}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">{new Date(document.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Modified:</span>
              <span className="ml-2 text-gray-900">{new Date(document.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular document with attachments view
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/documents"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Documents
        </Link>
      </div>

      {/* Document Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h1>
        <div className="text-sm text-gray-500 mb-4">
          Created: {new Date(document.createdAt).toLocaleDateString()}
          {document.projectName && (
            <span className="ml-4">Project: {document.projectName}</span>
          )}
        </div>
        <div dangerouslySetInnerHTML={{ __html: document.content }} />
      </div>

      {/* Attachments Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Attached Files ({attachments.length})
        </h2>

        {loadingAttachments ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">Loading files...</span>
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No files attached to this document.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attachments.map((attachment) => (
              <div
                key={attachment._id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.mimetype)}
                  </div>
                  
                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {attachment.originalName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {getFileTypeLabel(attachment.mimetype)} • {formatFileSize(attachment.size)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      by {attachment.uploadedBy.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(attachment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(attachment._id)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
