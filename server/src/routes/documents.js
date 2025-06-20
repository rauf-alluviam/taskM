import express from 'express';
import { body, validationResult } from 'express-validator';
import Document from '../models/Document.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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

export default router;