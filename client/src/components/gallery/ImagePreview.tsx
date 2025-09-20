import React from 'react';
import { Box, IconButton, Typography, styled } from '@mui/material';
import { Delete, InsertDriveFile } from '@mui/icons-material';

interface ImagePreviewProps {
  images: string[];
  onDeleteImage: (index: number) => void;
  showFileName?: boolean;
}

const PreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

const PreviewItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 100,
  height: 100,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
}));

const ImagePreview: React.FC<ImagePreviewProps> = ({
  images,
  onDeleteImage,
  showFileName = false
}) => {
  const getFileNameFromUrl = (url: string) => {
    const segments = url.split('/');
    return segments[segments.length - 1];
  };

  return (
    <PreviewContainer>
      {images.map((image, index) => (
        <PreviewItem key={image}>
          {image.match(/\.(jpg|jpeg|png|gif)$/i) ? (
            <img
              src={image}
              alt={`Preview ${index}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
              }}
            >
              <InsertDriveFile color="primary" />
              {showFileName && (
                <Typography variant="caption" noWrap sx={{ px: 1 }}>
                  {getFileNameFromUrl(image)}
                </Typography>
              )}
            </Box>
          )}
          <DeleteButton
            size="small"
            onClick={() => onDeleteImage(index)}
          >
            <Delete fontSize="small" />
          </DeleteButton>
        </PreviewItem>
      ))}
    </PreviewContainer>
  );
};

export default ImagePreview;
