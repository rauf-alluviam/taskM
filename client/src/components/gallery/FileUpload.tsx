import React from 'react';
import { Button, styled } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

interface FileUploadProps {
  bucketPath: string;
  onFilesUploaded: (files: string[]) => void;
  multiple?: boolean;
  style?: React.CSSProperties;
  label?: string;
}

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
  bucketPath,
  onFilesUploaded,
  multiple = false,
  style,
  label = "Upload"
}) => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // In a real implementation, you would handle file upload to your server/bucket here
    // For now, we'll just simulate by returning the file names
    const fileUrls = Array.from(files).map(file => URL.createObjectURL(file));
    onFilesUploaded(fileUrls);
  };

  return (
    <Button
      component="label"
      variant="contained"
      startIcon={<CloudUpload />}
      style={style}
    >
      {label}
      <VisuallyHiddenInput
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
      />
    </Button>
  );
};

export default FileUpload;
