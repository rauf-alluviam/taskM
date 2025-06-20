import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import Attachment from '../models/Attachment.js';
import Task from '../models/Task.js';
import Document from '../models/Document.js';
import Project from '../models/Project.js';
import { uploadToS3, deleteFromS3, getSignedUrl } from '../services/s3Service.js';

const router = express.Router();

// Test route to check if attachment routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Attachment routes are working', timestamp: new Date().toISOString() });
});

// Test route to check attachment retrieval
router.get('/test-attachment/:id', authenticate, async (req, res) => {
  try {
    console.log('🧪 Testing attachment retrieval for ID:', req.params.id);
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      console.log('❌ Attachment not found');
      return res.status(404).json({ message: 'Attachment not found' });
    }
    console.log('✅ Attachment found:', {
      id: attachment._id,
      name: attachment.originalName,
      active: attachment.isActive
    });
    res.json({ 
      message: 'Attachment found',
      attachment: {
        id: attachment._id,
        name: attachment.originalName,
        active: attachment.isActive,
        s3Key: attachment.s3Key
      }
    });
  } catch (error) {
    console.error('❌ Test attachment error:', error);
    res.status(500).json({ message: 'Error testing attachment retrieval' });
  }
});

// Configure multer for memory storage (for S3 upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/csv': true,
    'text/plain': true,
    'audio/mpeg': true,
    'audio/wav': true,
    'audio/ogg': true,
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'application/zip': true,
    'application/x-rar-compressed': true,
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please check the allowed file formats.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to check access permissions
const checkAccess = async (attachedTo, attachedToId, userId, userRole) => {
  if (userRole === 'admin') return true;

  if (attachedTo === 'task') {
    const task = await Task.findById(attachedToId).populate('projectId');
    if (!task) return false;
    
    // Check if user is assigned to task or has project access
    if (task.assignedUsers.includes(userId)) return true;
    
    if (task.projectId) {
      const project = await Project.findById(task.projectId);
      return project && (
        project.createdBy.equals(userId) || 
        project.members.includes(userId)
      );
    }
    return true; // Personal task
  }

  if (attachedTo === 'document') {
    const document = await Document.findById(attachedToId);
    if (!document) return false;
    
    if (document.createdBy.equals(userId)) return true;
    
    if (document.projectId) {
      const project = await Project.findById(document.projectId);
      return project && (
        project.createdBy.equals(userId) || 
        project.members.includes(userId)
      );
    }
    return document.isPublic;
  }

  return false;
};

// Upload attachment
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    console.log('📎 Attachment upload request received');
    console.log('User:', req.user ? req.user._id : 'No user');
    console.log('File:', req.file ? req.file.originalname : 'No file');
    console.log('Body:', req.body);
    console.log('AWS Config Check:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }    const { attachedTo, attachedToId, description } = req.body;

    if (!attachedTo || !attachedToId) {
      return res.status(400).json({ message: 'attachedTo and attachedToId are required' });
    }

    // Validate attachedTo value
    if (!['task', 'document'].includes(attachedTo)) {
      return res.status(400).json({ message: 'attachedTo must be either "task" or "document"' });
    }// Check if user has access to attach files to this resource
    console.log('🔐 Checking access permissions...');
    const hasAccess = await checkAccess(attachedTo, attachedToId, req.user._id, req.user.role);
    if (!hasAccess) {
      console.log('❌ Access denied for user:', req.user._id);
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log('✅ Access granted');

    // Generate unique S3 key
    console.log('🔑 Generating S3 key...');
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(req.file.originalname);
    const s3Key = `${attachedTo}s/${attachedToId}/${timestamp}-${randomString}${fileExtension}`;
    console.log('Generated S3 key:', s3Key);

    // Upload to S3
    console.log('📤 Starting S3 upload...');
    const s3Result = await uploadToS3(req.file, s3Key);
    console.log('✅ S3 upload completed:', s3Result);

    // Create attachment record
    console.log('💾 Creating attachment record...');
    const attachment = new Attachment({
      originalName: req.file.originalname,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: s3Result.url,
      s3Key: s3Result.key,
      uploadedBy: req.user._id,
      attachedTo,
      attachedToId,
      attachedToModel: attachedTo === 'task' ? 'Task' : 'Document',
      description: description || '',
    });

    await attachment.save();
    console.log('✅ Attachment record saved:', attachment._id);
    
    await attachment.populate('uploadedBy', 'name email');
    console.log('✅ Attachment populated');

    res.status(201).json({
      message: 'File uploaded successfully',
      attachment,
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during file upload',
    });
  }
});

// Get attachment download URL
router.get('/download/:attachmentId', authenticate, async (req, res) => {
  try {
    console.log('⬇️ Download URL request received for attachment:', req.params.attachmentId);
    console.log('User:', req.user._id);
      const attachment = await Attachment.findById(req.params.attachmentId);
    if (!attachment || !attachment.isActive) {
      console.log('❌ Attachment not found or inactive:', req.params.attachmentId);
      return res.status(404).json({ message: 'Attachment not found' });
    }    console.log('✅ Attachment found:', {
      id: attachment._id,
      name: attachment.originalName,
      s3Key: attachment.s3Key
    });

    // Check access
    console.log('🔐 Checking access permissions...');
    const hasAccess = await checkAccess(
      attachment.attachedTo, 
      attachment.attachedToId, 
      req.user._id, 
      req.user.role
    );
    if (!hasAccess) {
      console.log('❌ Access denied for user:', req.user._id);
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log('✅ Access granted');

    // Generate signed URL for download
    console.log('🔗 Generating signed URL for S3 key:', attachment.s3Key);
    const signedUrl = await getSignedUrl(attachment.s3Key, 3600); // 1 hour expiry
    console.log('✅ Signed URL generated successfully');

    res.json({
      downloadUrl: signedUrl,
      filename: attachment.originalName,
      size: attachment.size,
      mimetype: attachment.mimetype,
    });
  } catch (error) {
    console.error('❌ Get download URL error:', error);
    res.status(500).json({ message: 'Server error while generating download URL' });
  }
});

// Get attachments for a resource
router.get('/:attachedTo/:attachedToId', authenticate, async (req, res) => {
  try {
    console.log('📋 Get attachments request received');
    console.log('Params:', req.params);
    console.log('User:', req.user._id);
    
    const { attachedTo, attachedToId } = req.params;

    // Validate attachedTo value
    if (!['task', 'document'].includes(attachedTo)) {
      console.log('❌ Invalid attachedTo value:', attachedTo);
      return res.status(400).json({ message: 'attachedTo must be either "task" or "document"' });
    }

    // Check access
    console.log('🔐 Checking access permissions...');
    const hasAccess = await checkAccess(attachedTo, attachedToId, req.user._id, req.user.role);
    if (!hasAccess) {
      console.log('❌ Access denied for user:', req.user._id);
      return res.status(403).json({ message: 'Access denied' });
    }
    console.log('✅ Access granted');

    console.log('🔍 Searching for attachments...');
    const attachments = await Attachment.find({
      attachedTo,
      attachedToId,
      isActive: true,
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

    console.log('✅ Found attachments:', attachments.length);

    res.json(attachments);
  } catch (error) {
    console.error('❌ Get attachments error:', error);
    res.status(500).json({ message: 'Server error while fetching attachments' });
  }
});

// Delete attachment
router.delete('/:attachmentId', authenticate, async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.attachmentId);
    if (!attachment || !attachment.isActive) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check if user can delete this attachment
    const canDelete = attachment.uploadedBy.equals(req.user._id) || 
                     req.user.role === 'admin' ||
                     await checkAccess(
                       attachment.attachedTo, 
                       attachment.attachedToId, 
                       req.user._id, 
                       req.user.role
                     );

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete from S3
    if (attachment.s3Key) {
      await deleteFromS3(attachment.s3Key);
    }

    // Mark as inactive instead of deleting (for audit trail)
    attachment.isActive = false;
    await attachment.save();

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Server error while deleting attachment' });
  }
});

// Update attachment (description only)
router.patch('/:attachmentId', authenticate, async (req, res) => {
  try {
    const { description } = req.body;
    const attachment = await Attachment.findById(req.params.attachmentId);
    
    if (!attachment || !attachment.isActive) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check if user can update this attachment
    const canUpdate = attachment.uploadedBy.equals(req.user._id) || 
                     req.user.role === 'admin' ||
                     await checkAccess(
                       attachment.attachedTo, 
                       attachment.attachedToId, 
                       req.user._id, 
                       req.user.role
                     );

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    attachment.description = description || attachment.description;
    await attachment.save();
    await attachment.populate('uploadedBy', 'name email');

    res.json(attachment);
  } catch (error) {
    console.error('Update attachment error:', error);
    res.status(500).json({ message: 'Server error while updating attachment' });
  }
});

export default router;
