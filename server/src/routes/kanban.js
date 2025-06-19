import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user's kanban columns (from user preferences or default project)
router.get('/columns', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    let columns;
    if (projectId) {
      // Get columns from specific project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user has access to project
      const hasAccess = project.createdBy.equals(req.user._id) ||
                       project.members.includes(req.user._id);
      
      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied to project' });
      }
      
      columns = project.kanbanColumns.length > 0 
        ? project.kanbanColumns 
        : getDefaultColumns();
    } else {
      // Get user's personal columns from their profile or default
      // For now, we'll use default columns if no project specified
      columns = getDefaultColumns();
    }

    res.json(columns);
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({ message: 'Server error while fetching columns' });
  }
});

// Update kanban columns for a project
router.put('/columns', authenticate, [
  body('projectId').optional().isMongoId(),
  body('columns').isArray().withMessage('Columns must be an array'),
  body('columns.*.id').notEmpty().withMessage('Column ID is required'),
  body('columns.*.title').notEmpty().withMessage('Column title is required'),
  body('columns.*.color').notEmpty().withMessage('Column color is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, columns } = req.body;

    if (projectId) {
      // Update project's kanban columns
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if user has permission to update project
      const canUpdate = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
      if (!canUpdate) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Convert client columns to kanban column format
      const kanbanColumns = columns.map((col, index) => ({
        name: col.title,
        order: index,
        _id: col.id === col.title.toLowerCase().replace(/\s+/g, '-') ? undefined : col.id
      }));      project.kanbanColumns = kanbanColumns;
      await project.save();

      // Emit real-time event
      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('columns:updated', project.kanbanColumns);

      res.json({ 
        message: 'Columns updated successfully',
        columns: project.kanbanColumns 
      });
    } else {
      // For now, return success - in future we could store in user preferences
      res.json({ 
        message: 'Personal columns updated successfully',
        columns: columns 
      });
    }
  } catch (error) {
    console.error('Update columns error:', error);
    res.status(500).json({ message: 'Server error while updating columns' });
  }
});

// Add a new column to project
router.post('/columns', authenticate, [
  body('projectId').optional().isMongoId(),
  body('title').notEmpty().withMessage('Column title is required'),
  body('color').notEmpty().withMessage('Column color is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, title, color } = req.body;

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check permissions
      const canUpdate = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
      if (!canUpdate) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Add new column
      const newColumn = {
        name: title,
        order: project.kanbanColumns.length,
      };      project.kanbanColumns.push(newColumn);
      await project.save();

      // Emit real-time event
      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('columns:updated', project.kanbanColumns);

      // Return the new column with client format
      const clientColumn = {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title: title,
        color: color
      };

      res.status(201).json(clientColumn);
    } else {
      // Return success for personal columns
      const newColumn = {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title: title,
        color: color
      };
      res.status(201).json(newColumn);
    }
  } catch (error) {
    console.error('Add column error:', error);
    res.status(500).json({ message: 'Server error while adding column' });
  }
});

// Delete a column from project
router.delete('/columns/:columnId', authenticate, async (req, res) => {
  try {
    const { columnId } = req.params;
    const { projectId } = req.query;

    // Prevent deletion of default columns
    const defaultColumns = ['todo', 'in-progress', 'review', 'done'];
    if (defaultColumns.includes(columnId)) {
      return res.status(400).json({ message: 'Cannot delete default columns' });
    }

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check permissions
      const canUpdate = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
      if (!canUpdate) {
        return res.status(403).json({ message: 'Access denied' });
      }      // Remove column
      project.kanbanColumns = project.kanbanColumns.filter(
        col => col.name.toLowerCase().replace(/\s+/g, '-') !== columnId
      );
      
      await project.save();

      // Emit real-time event
      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('columns:updated', project.kanbanColumns);
    }

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ message: 'Server error while deleting column' });
  }
});

// Helper function to get default columns
function getDefaultColumns() {
  return [
    { _id: 'todo', name: 'todo', order: 0 },
    { _id: 'in-progress', name: 'in-progress', order: 1 },
    { _id: 'review', name: 'review', order: 2 },
    { _id: 'done', name: 'done', order: 3 },
  ];
}

export default router;
