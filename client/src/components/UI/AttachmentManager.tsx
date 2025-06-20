import React, { useState, useRef } from 'react';
import { Upload, X, File, Download, Trash2, Edit2, Check, AlertCircle, Eye } from 'lucide-react';
import { attachmentAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import FilePreview from './FilePreview';

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

interface AttachmentManagerProps {
  attachedTo: 'task' | 'document';
  attachedToId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  canUpload?: boolean;
  canDelete?: boolean;
  maxFileSize?: number; // in MB
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachedTo,
  attachedToId,
  attachments,
  onAttachmentsChange,
  canUpload = true,
  canDelete = true,
  maxFileSize = 50,
}) => {  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [previewingFile, setPreviewingFile] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{ [key: string]: string }>({});
  const [newDescription, setNewDescription] = useState('');  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotification();

  // Preload download URLs for image attachments for preview
  React.useEffect(() => {
    const loadImagePreviews = async () => {
      const imageAttachments = attachments.filter(att => att.mimetype.startsWith('image/'));
      const newDownloadUrls: { [key: string]: string } = { ...downloadUrls };
      
      for (const attachment of imageAttachments) {
        if (!newDownloadUrls[attachment._id]) {
          try {
            const result = await attachmentAPI.getDownloadUrl(attachment._id);
            newDownloadUrls[attachment._id] = result.downloadUrl;
          } catch (error) {
            console.error('Failed to load preview for', attachment.originalName);
          }
        }
      }
      
      setDownloadUrls(newDownloadUrls);
    };

    if (attachments.length > 0) {
      loadImagePreviews();
    }
  }, [attachments.map(a => a._id).join(',')]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎥';
    if (mimetype.startsWith('audio/')) return '🎵';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📺';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return '🗜️';
    return '📁';
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      addNotification({
        type: 'error',
        title: 'File Too Large',
        message: `File size must be less than ${maxFileSize}MB`,
      });
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File, description?: string) => {
    setUploading(true);
    try {
      const result = await attachmentAPI.uploadAttachment(
        file,
        attachedTo,
        attachedToId,
        description
      );
      
      onAttachmentsChange([result.attachment, ...attachments]);
      
      addNotification({
        type: 'success',
        title: 'File Uploaded',
        message: `${file.name} has been uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.response?.data?.message || 'Failed to upload file',
      });
    } finally {
      setUploading(false);
    }
  };
  const handleDownload = async (attachment: Attachment) => {
    try {
      const result = await attachmentAPI.getDownloadUrl(attachment._id);
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Download error:', error);
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.response?.data?.message || 'Failed to download file',
      });
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    try {
      const result = await attachmentAPI.getDownloadUrl(attachment._id);
      setPreviewUrl(result.downloadUrl);
      setPreviewingFile(attachment);
    } catch (error: any) {
      console.error('Preview error:', error);
      addNotification({
        type: 'error',
        title: 'Preview Failed',
        message: error.response?.data?.message || 'Failed to preview file',
      });
    }
  };

  const isPreviewable = (mimetype: string) => {
    return mimetype.startsWith('image/') || 
           mimetype === 'application/pdf' ||
           mimetype.startsWith('text/');
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await attachmentAPI.deleteAttachment(attachmentId);
      onAttachmentsChange(attachments.filter(a => a._id !== attachmentId));
      
      addNotification({
        type: 'success',
        title: 'Attachment Deleted',
        message: 'Attachment has been deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.message || 'Failed to delete attachment',
      });
    }
  };

  const handleUpdateDescription = async (attachmentId: string) => {
    try {
      const updatedAttachment = await attachmentAPI.updateAttachment(attachmentId, newDescription);
      onAttachmentsChange(
        attachments.map(a => a._id === attachmentId ? updatedAttachment : a)
      );
      setEditingDescription(null);
      setNewDescription('');
      
      addNotification({
        type: 'success',
        title: 'Description Updated',
        message: 'Attachment description has been updated',
      });
    } catch (error: any) {
      console.error('Update error:', error);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.message || 'Failed to update description',
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUpload && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div
            className={`text-center ${dragActive ? 'bg-primary-50 border-primary-300' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
            />
            
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop files here or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Max file size: {maxFileSize}MB. Supports images, documents, videos, and audio files.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Attachments ({attachments.length})
          </h4>          <div className="space-y-3">
            {attachments.map((attachment) => (
              <FilePreview
                key={attachment._id}
                attachment={attachment}
                downloadUrl={downloadUrls[attachment._id]}
                onDownload={() => handleDownload(attachment)}
                onPreview={isPreviewable(attachment.mimetype) ? () => handlePreview(attachment) : undefined}
                onEdit={() => {
                  setEditingDescription(attachment._id);
                  setNewDescription(attachment.description || '');
                }}
                onDelete={() => handleDelete(attachment._id)}
                canEdit={true}
                canDelete={canDelete}
                className="border-none bg-gray-50 hover:bg-gray-100"
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Description Modal */}
      {editingDescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Description
            </h3>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add a description for this attachment..."
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setEditingDescription(null);
                  setNewDescription('');
                }}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateDescription(editingDescription)}
                className="btn-primary btn-sm"
              >
                Update
              </button>
            </div>          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewingFile && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {previewingFile.originalName}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(previewingFile.size)} • {previewingFile.mimetype}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewingFile(null);
                  setPreviewUrl(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-auto">
              {previewingFile.mimetype.startsWith('image/') && (
                <img
                  src={previewUrl}
                  alt={previewingFile.originalName}
                  className="max-w-full h-auto mx-auto"
                />
              )}
              
              {previewingFile.mimetype === 'application/pdf' && (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh]"
                  title={previewingFile.originalName}
                />
              )}
              
              {previewingFile.mimetype.startsWith('text/') && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <iframe
                    src={previewUrl}
                    className="w-full h-[60vh] border-0"
                    title={previewingFile.originalName}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Uploaded by {previewingFile.uploadedBy.name} on{' '}
                {new Date(previewingFile.createdAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleDownload(previewingFile)}
                className="btn-primary btn-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;
