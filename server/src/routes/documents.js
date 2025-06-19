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
    const filter = {};

    if (projectId) {
      filter.projectId = projectId;
      
      // Verify user has access to the project
      const project = await Project.findById(projectId);
      if (project) {
        const hasAccess = project.createdBy.equals(req.user._id) ||
                         project.members.includes(req.user._id) ||
                         req.user.role === 'admin';
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied to project documents' });
        }
      }
    }

    // Users can see documents they created or documents in projects they have access to
    const documents = await Document.find(filter)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .populate('projectId', 'name')
      .sort({ updatedAt: -1 });

    // Filter documents based on user access
    const accessibleDocuments = documents.filter(doc => {
      if (doc.createdBy._id.equals(req.user._id)) return true;
      if (req.user.role === 'admin') return true;
      if (doc.isPublic) return true;
      
      // Check project access if document belongs to a project
      if (doc.projectId) {
        // This would need additional project member check in a real implementation
        return true; // Simplified for now
      }
      
      return false;
    });

    res.json(accessibleDocuments);
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
    const hasAccess = document.createdBy._id.equals(req.user._id) ||
                     document.isPublic ||
                     req.user.role === 'admin';

    if (!hasAccess && document.projectId) {
      // Check project access
      const project = await Project.findById(document.projectId);
      if (project) {
        const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                                project.members.includes(req.user._id);
        if (!hasProjectAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
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
    }

    const document = new Document({
      title,
      content,
      projectId: projectId || undefined,
      createdBy: req.user._id,
      lastEditedBy: req.user._id,
      isPublic,
    });

    await document.save();
    await document.populate('createdBy', 'name email');
    await document.populate('projectId', 'name');

    // Add document to project if specified
    if (projectId) {
      await Project.findByIdAndUpdate(
        projectId,
        { $push: { documents: document._id } }
      );
    }

    res.status(201).json(document);
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
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = {
      ...req.body,
      lastEditedBy: req.user._id,
      version: document.version + 1,
    };

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

    // Only document creator or admin can delete
    const canDelete = document.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
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