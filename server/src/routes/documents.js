import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import Document from '../models/Document.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/rtf',
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Other
    'application/json',
    'text/html',
    'text/xml',
    'application/xml'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload a supported file format.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit to accommodate larger files
  },
});

// Function to extract text content from different file types
const extractTextFromFile = (file) => {
  try {
    console.log('🔍 Extracting text from file type:', file.mimetype);
    
    // For different file types, we might want to process differently
    switch (file.mimetype) {
      case 'text/plain':
      case 'text/markdown':
        const textContent = file.buffer.toString('utf8');
        console.log('✅ Text extraction completed, length:', textContent.length);
        return textContent;
        
      case 'application/pdf':
        // For PDF, we'd need a PDF parser library, for now return placeholder
        const pdfPlaceholder = `[PDF Document: ${file.originalname}]\n\nThis PDF document has been imported. Content extraction from PDF files will be implemented in a future update.\n\nOriginal filename: ${file.originalname}\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        console.log('✅ PDF placeholder created');
        return pdfPlaceholder;
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // For Word docs, we'd need a library like mammoth.js, for now return placeholder
        const wordPlaceholder = `[Word Document: ${file.originalname}]\n\nThis Word document has been imported. Content extraction from Word files will be implemented in a future update.\n\nOriginal filename: ${file.originalname}\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\nTo view the full content, please download the original file.`;
        console.log('✅ Word placeholder created');
        return wordPlaceholder;
        
      case 'application/rtf':
        // Basic RTF handling (removing RTF codes)
        const rtfContent = file.buffer.toString('utf8').replace(/\{\\.*?\}|\\\w+\s?/g, '').trim();
        console.log('✅ RTF extraction completed, length:', rtfContent.length);
        return rtfContent;
        
      default:
        const defaultContent = `[Document: ${file.originalname}]\n\nFile type: ${file.mimetype}\nFile size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\nThis file has been imported but content extraction is not supported for this file type. Please download the original file to view its contents.`;
        console.log('✅ Default placeholder created');
        return defaultContent;
    }
  } catch (error) {
    console.error('❌ Error extracting text from file:', error);
    return `[Import Error: ${file.originalname}]\n\nThere was an error processing this file. Please try importing again or contact support.\n\nError: ${error.message}`;
  }
};

// Get all documents (with optional project filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (projectId) {
      // When projectId is specified, ensure user has access to that project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                              project.members.includes(req.user._id) ||
                              req.user.role === 'admin';

      if (!hasProjectAccess) {
        return res.status(403).json({ message: 'Access denied to project documents' });
      }

      // Get documents for this specific project only
      const documents = await Document.find({ projectId })
        .populate('createdBy', 'name email')
        .populate('lastEditedBy', 'name email')
        .populate('projectId', 'name')
        .sort({ updatedAt: -1 });

      return res.json(documents);
    } else {
      // If no projectId specified, only return personal documents (not in any project)
      // This prevents users from seeing all project documents when accessing /documents directly
      
      const documentFilter = req.user.role === 'admin' ? 
        // Admin can see all personal documents (documents without projectId)
        { 
          $or: [
            { projectId: null },
            { projectId: { $exists: false } }
          ]
        } :
        // Regular users see only their own personal documents or public personal documents
        {
          $and: [
            // Document is not in any project
            {
              $or: [
                { projectId: null },
                { projectId: { $exists: false } }
              ]
            },
            // And either created by user or is public
            {
              $or: [
                { createdBy: req.user._id }, // Created by user
                { isPublic: true } // Or public
              ]
            }
          ]
        };

      const documents = await Document.find(documentFilter)
        .populate('createdBy', 'name email')
        .populate('lastEditedBy', 'name email')
        .populate('projectId', 'name')
        .sort({ updatedAt: -1 });

      res.json(documents);
    }
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error while fetching documents' });
  }
});

// Get single document
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('projectId', 'name');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to this document
    let hasAccess = false;

    // Admin has access to everything
    if (req.user.role === 'admin') {
      hasAccess = true;
    }
    // Document creator has access
    else if (document.createdBy._id.equals(req.user._id)) {
      hasAccess = true;
    }
    // Public documents (not in projects) are accessible
    else if (document.isPublic && !document.projectId) {
      hasAccess = true;
    }
    // Check project access for project documents
    else if (document.projectId) {
      const project = await Project.findById(document.projectId);
      if (project) {
        hasAccess = project.createdBy.equals(req.user._id) ||
                   project.members.includes(req.user._id);
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this document' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Server error while fetching document' });
  }
});

// Create new document
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').optional().trim(),
  body('projectId').optional().isMongoId(),
  body('isPublic').optional().isBoolean(),
], async (req, res) => {
  try {
    console.log('📝 Document creation request received:');
    console.log('User:', req.user._id);
    console.log('Body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      content = '',
      projectId,
      isPublic = false,
    } = req.body;

    // If projectId is provided, verify user has access to the project
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                              project.members.includes(req.user._id) ||
                              req.user.role === 'admin';

      if (!hasProjectAccess) {
        return res.status(403).json({ message: 'Access denied to project' });
      }

      // Documents created within a project should not be public by default
      // and should be accessible only to project members
      const document = new Document({
        title,
        content,
        projectId,
        createdBy: req.user._id,
        lastEditedBy: req.user._id,
        isPublic: false, // Force project documents to be private to project members only
      });

      await document.save();
      await document.populate('createdBy', 'name email');
      await document.populate('projectId', 'name');

      // Add document to project
      await Project.findByIdAndUpdate(
        projectId,
        { $push: { documents: document._id } }
      );

      return res.status(201).json(document);
    } else {
      // Document not associated with any project
      const document = new Document({
        title,
        content,
        createdBy: req.user._id,
        lastEditedBy: req.user._id,
        isPublic: isPublic || false,
      });

      await document.save();
      await document.populate('createdBy', 'name email');

      return res.status(201).json(document);
    }
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Server error while creating document' });
  }
});

// Import document from file
router.post('/import', authenticate, upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Document import request received:');
    console.log('User:', req.user._id);
    console.log('File:', req.file ? {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { projectId } = req.body;

    // Extract title from filename (remove extension)
    const title = req.file.originalname.replace(/\.[^/.]+$/, '');
    console.log('📝 Extracted title:', title);
    
    // Upload file directly to S3 first
    console.log('📤 Uploading file to S3...');
    const { uploadToS3 } = await import('../services/s3Service.js');
    
    // Generate unique S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = req.file.originalname.split('.').pop() || '';
    const s3Key = `imported-documents/${timestamp}-${randomString}.${fileExtension}`;
    
    // Upload to S3
    const s3Result = await uploadToS3(req.file, s3Key);
    console.log('✅ File uploaded to S3:', s3Result.key);

    // If projectId is provided, verify user has access to the project
    if (projectId) {
      console.log('🔍 Checking project access for:', projectId);
      const project = await Project.findById(projectId);
      if (!project) {
        console.log('❌ Project not found:', projectId);
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                              project.members.includes(req.user._id) ||
                              req.user.role === 'admin';

      if (!hasProjectAccess) {
        console.log('❌ Access denied to project:', projectId);
        return res.status(403).json({ message: 'Access denied to project' });
      }
      console.log('✅ Project access granted');

      // Create document within project
      console.log('📝 Creating document within project...');
      const document = new Document({
        title,
        content: '', // No Quill content for imported files
        projectId,
        createdBy: req.user._id,
        lastEditedBy: req.user._id,
        isPublic: false,
        isImported: true,
        originalFileName: req.file.originalname,
        mimetype: req.file.mimetype,
        fileSize: req.file.size,
        s3Key: s3Result.key,
        s3Url: s3Result.url,
      });

      await document.save();
      console.log('✅ Document saved:', document._id);
      
      // No need to create attachment record since file info is in document itself
      
      await document.populate('createdBy', 'name email');
      await document.populate('projectId', 'name');
      console.log('✅ Document populated');

      // Add document to project
      await Project.findByIdAndUpdate(
        projectId,
        { $push: { documents: document._id } }
      );
      console.log('✅ Document added to project');

      return res.status(201).json(document);
    } else {
      // Create personal document (not associated with any project)
      console.log('📝 Creating personal document...');
      const document = new Document({
        title,
        content: '', // No Quill content for imported files
        createdBy: req.user._id,
        lastEditedBy: req.user._id,
        isPublic: false,
        isImported: true,
        originalFileName: req.file.originalname,
        mimetype: req.file.mimetype,
        fileSize: req.file.size,
        s3Key: s3Result.key,
        s3Url: s3Result.url,
      });

      await document.save();
      console.log('✅ Document saved:', document._id);
      
      // No need to create attachment record since file info is in document itself
      
      await document.populate('createdBy', 'name email');
      console.log('✅ Document populated');

      return res.status(201).json(document);
    }
  } catch (error) {
    console.error('Import document error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while importing document' 
    });
  }
});

// Update document
router.put('/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim(),
  body('isPublic').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to update this document
    let canUpdate = document.createdBy.equals(req.user._id) || req.user.role === 'admin';

    // If document belongs to a project, check project access
    if (!canUpdate && document.projectId) {
      const project = await Project.findById(document.projectId);
      if (project) {
        canUpdate = project.createdBy.equals(req.user._id) ||
                   project.members.includes(req.user._id);
      }
    }

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied to modify this document' });
    }

    // Prevent changing projectId - documents should stay in their original project
    const updates = {
      ...req.body,
      lastEditedBy: req.user._id,
      version: document.version + 1,
    };
    
    // Remove projectId from updates to prevent project reassignment
    delete updates.projectId;
    
    // For project documents, prevent making them public
    if (document.projectId && updates.isPublic === true) {
      return res.status(400).json({ 
        message: 'Project documents cannot be made public. They are private to project members only.' 
      });
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('projectId', 'name');

    res.json(updatedDocument);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Server error while updating document' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to delete this document
    let canDelete = document.createdBy.equals(req.user._id) || req.user.role === 'admin';

    // If document belongs to a project, only project owner/admin can delete
    if (document.projectId) {
      const project = await Project.findById(document.projectId);
      if (project) {
        canDelete = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
        // Project members cannot delete documents, only project owner and document creator
        if (!canDelete && document.createdBy.equals(req.user._id)) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied to delete this document' });
    }

    // Remove document from project if it belongs to one
    if (document.projectId) {
      await Project.findByIdAndUpdate(
        document.projectId,
        { $pull: { documents: document._id } }
      );
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error while deleting document' });
  }
});

// Get download URL for imported document
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    console.log('⬇️ Download URL request for document:', req.params.id);
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has access to this document
    if (document.projectId) {
      const project = await Project.findById(document.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasAccess = project.createdBy.equals(req.user._id) ||
                       project.members.includes(req.user._id) ||
                       req.user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      // Personal document - check ownership
      if (!document.createdBy.equals(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Check if this is an imported document
    if (!document.isImported || !document.s3Key) {
      return res.status(400).json({ message: 'This is not an imported document' });
    }

    // Generate signed URL for download
    const { getSignedUrl } = await import('../services/s3Service.js');
    const signedUrl = await getSignedUrl(document.s3Key, 3600); // 1 hour expiry
    
    res.json({
      downloadUrl: signedUrl,
      filename: document.originalFileName,
      size: document.fileSize,
      mimetype: document.mimetype,
    });
  } catch (error) {
    console.error('Get document download URL error:', error);
    res.status(500).json({ message: 'Server error while generating download URL' });
  }
});

export default router;