import React from 'react';
import { File, Image, FileText, FileSpreadsheet, Presentation, Download, Eye, Edit2, Trash2 } from 'lucide-react';

interface FilePreviewProps {
  attachment: {
    _id: string;
    originalName: string;
    mimetype?: string;
    size: number;
    url?: string;
    uploadedBy?: {
      name: string;
      email: string;
    };
    description?: string;
    createdAt?: string;
  };
  downloadUrl?: string;
  onDownload: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  attachment,
  downloadUrl,
  onDownload,
  onPreview,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  className = ''
}) => {
  const getFileIcon = (mimetype: string | undefined | null) => {
    // Check if mimetype is valid
    if (!mimetype) {
      return <File className="w-8 h-8 text-gray-600" />;
    }
    
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

  const getFileTypeLabel = (mimetype: string | undefined | null) => {
    if (!mimetype) return 'Unknown File Type';
    
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF Document',
      'application/msword': 'Word Document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.ms-excel': 'Excel Spreadsheet',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
      'text/csv': 'CSV File',
      'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
      'text/plain': 'Text File',
      'text/markdown': 'Markdown File',
      'application/json': 'JSON File',
      'text/html': 'HTML File',
      'image/jpeg': 'JPEG Image',
      'image/jpg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/bmp': 'BMP Image',
      'image/webp': 'WebP Image',
      'image/svg+xml': 'SVG Image',
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

  const canPreview = (mimetype: string | undefined | null) => {
    if (!mimetype) return false;
    
    return mimetype.startsWith('image/') || 
           mimetype === 'text/plain' || 
           mimetype === 'text/html' || 
           mimetype === 'application/pdf';
  };

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start space-x-3">
        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileIcon(attachment.mimetype)}
        </div>
        
        {/* File Details */}
        <div className="flex-1 min-w-0">          <h3 className="text-sm font-medium text-gray-900 truncate">
            {attachment.originalName}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {getFileTypeLabel(attachment.mimetype)} • {formatFileSize(attachment.size)}
            {attachment.uploadedBy && (
              <>
                {' • '}by {attachment.uploadedBy.name}
                {attachment.createdAt && (
                  <>
                    {' • '}{new Date(attachment.createdAt).toLocaleDateString()}
                  </>
                )}
              </>
            )}
          </p>
          {attachment.description && (
            <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
          )}
          
          {/* Preview for images */}
          {attachment.mimetype?.startsWith('image/') && downloadUrl && (
            <div className="mt-2">
              <img 
                src={downloadUrl} 
                alt={attachment.originalName}
                className="max-w-full h-auto max-h-32 rounded border"
                style={{ maxWidth: '200px' }}
              />
            </div>
          )}
        </div>
          {/* Actions */}
        <div className="flex-shrink-0 flex space-x-2">
          {canPreview(attachment.mimetype) && onPreview && (
            <button
              onClick={onPreview}
              className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={onDownload}
            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>

          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-50"
              title="Edit description"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
