import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  styled
} from '@mui/material';
import {
  CloudUpload,
  Close as CloseIcon,
  InsertDriveFile,
  Image as ImageIcon,
  Description
} from '@mui/icons-material';

interface FileUploadProps {
  onFilesUploaded: (files: string[]) => void;
  bucketPath?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  style?: React.CSSProperties;
  label?: string;
  className?: string;
}

const DropZone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  transition: 'all 0.2s ease',
  backgroundColor: theme.palette.background.default,
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.dragActive': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
}));

const FilePreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  bucketPath = 'uploads',
  multiple = true,
  maxFiles = 5,
  maxSize = 10,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  style,
  label = "Upload Files",
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    // Validate file count
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes and types
    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxSize}MB`);
        return false;
      }
      return acceptedTypes.some(type => {
        if (type === 'image/*') return file.type.startsWith('image/');
        return file.type === type || file.name.endsWith(type);
      });
    });

    setFiles(prev => [...prev, ...validFiles]);

    // Simulate file upload and generate URLs
    // In a real implementation, you would upload to your server/bucket here
    const uploadedUrls = validFiles.map(file => URL.createObjectURL(file));
    onFilesUploaded(uploadedUrls);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon color="primary" />;
    } else if (file.type.includes('pdf') || file.type.includes('document')) {
      return <Description color="error" />;
    }
    return <InsertDriveFile color="action" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box className={className}>
      <DropZone
        className={dragActive ? 'dragActive' : ''}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <VisuallyHiddenInput
          ref={inputRef}
          type="file"
          multiple={multiple}
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
        />
        
        <CloudUpload sx={{ fontSize: 40, color: 'action.active', mb: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Drag & drop files here or click to browse
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
          Maximum {maxFiles} files, up to {maxSize}MB each
        </Typography>
      </DropZone>

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {files.map((file, index) => (
            <FilePreview key={index}>
              {getFileIcon(file)}
              <Box sx={{ ml: 1, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={() => removeFile(index)}
                sx={{ color: 'text.secondary' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </FilePreview>
          ))}
        </Box>
      )}

      {uploading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Uploading...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;
