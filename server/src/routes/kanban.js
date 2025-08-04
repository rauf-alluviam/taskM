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

    // Transform columns to include color property consistently
    const transformedColumns = columns.map(column => ({
      _id: column._id ? column._id.toString() : column._id,
      name: column.name,
      order: column.order,
      color: column.color || getDefaultColorForColumn(column.name.toLowerCase().replace(/\s+/g, '-'))
    }));

    res.json(transformedColumns);
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
        color: col.color
        // Don't manually set _id - let Mongoose handle ObjectId generation
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
  body('title').notEmpty().withMessage('Column title is required')
    .isLength({ min: 2, max: 50 }).withMessage('Column title must be between 2 and 50 characters'),
  body('color').notEmpty().withMessage('Column color is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
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

      // Check maximum column limit
      const MAX_COLUMNS = 12;
      if (project.kanbanColumns.length >= MAX_COLUMNS) {
        return res.status(400).json({ 
          message: `Maximum ${MAX_COLUMNS} columns allowed for optimal performance and user experience` 
        });
      }

      // Check for duplicate column names (case insensitive)
      const normalizedTitle = title.toLowerCase().trim();
      const isDuplicate = project.kanbanColumns.some(col => 
        col.name.toLowerCase() === normalizedTitle
      );
      
      if (isDuplicate) {
        return res.status(400).json({ 
          message: 'A column with this name already exists' 
        });
      }

      // Add new column
      const newColumn = {
        name: title.trim(),
        order: project.kanbanColumns.length,
        color: color, // Store the color in the database
      };
      
      project.kanbanColumns.push(newColumn);
      await project.save();

      // Get the newly added column (Mongoose will have assigned an _id)
      const addedColumn = project.kanbanColumns[project.kanbanColumns.length - 1];

      // Emit real-time event
      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('columns:updated', project.kanbanColumns);

      // Return the new column with client format
      const clientColumn = {
        id: addedColumn._id.toString(), // Use the generated ObjectId as string
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

// Edit/Update individual column
router.put('/columns/:columnId', authenticate, [
  body('projectId').optional().isMongoId(),
  body('title').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Column title must be between 2 and 50 characters'),
  body('color').optional().notEmpty().withMessage('Column color is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: errors.array()[0].msg,
        errors: errors.array() 
      });
    }

    const { columnId } = req.params;
    const { projectId, title, color } = req.body;

    if (!title && !color) {
      return res.status(400).json({ message: 'At least one field (title or color) must be provided for update' });
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
      }

      // Find the column to update
      const columnIndex = project.kanbanColumns.findIndex(col => {
        if (col._id && col._id.toString() === columnId) return true;
        const nameBasedId = col.name.toLowerCase().replace(/\s+/g, '-');
        return nameBasedId === columnId;
      });

      if (columnIndex === -1) {
        return res.status(404).json({ message: 'Column not found' });
      }

      const column = project.kanbanColumns[columnIndex];
      
      // Prevent editing default columns names
      const defaultColumns = ['todo', 'in-progress', 'review', 'done'];
      const isDefaultColumn = defaultColumns.includes(column.name.toLowerCase().replace(/\s+/g, '-'));
      
      if (isDefaultColumn && title && title.toLowerCase().replace(/\s+/g, '-') !== column.name.toLowerCase().replace(/\s+/g, '-')) {
        return res.status(400).json({ message: 'Cannot rename default columns (To Do, In Progress, Review, Done). Only colors can be changed.' });
      }

      // Check for duplicate names if title is being changed
      if (title && title.trim().toLowerCase() !== column.name.toLowerCase()) {
        const normalizedTitle = title.toLowerCase().trim();
        const isDuplicate = project.kanbanColumns.some((col, index) => 
          index !== columnIndex && col.name.toLowerCase() === normalizedTitle
        );
        
        if (isDuplicate) {
          return res.status(400).json({ message: 'A column with this name already exists' });
        }
      }

      // Update the column
      if (title) project.kanbanColumns[columnIndex].name = title.trim();
      if (color) project.kanbanColumns[columnIndex].color = color;

      await project.save();

      // Emit real-time event
      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('columns:updated', project.kanbanColumns);

      // Return updated column
      const updatedColumn = project.kanbanColumns[columnIndex];
      const clientColumn = {
        id: updatedColumn._id.toString(),
        title: updatedColumn.name,
        color: updatedColumn.color
      };

      res.json({ 
        message: 'Column updated successfully',
        column: clientColumn 
      });
    } else {
      // For personal columns - just return success for now
      res.json({ 
        message: 'Personal column updated successfully',
        column: {
          id: columnId,
          title: title || 'Updated Column',
          color: color || 'bg-gray-100'
        }
      });
    }
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ message: 'Server error while updating column' });
  }
});

// Delete a column from project
router.delete('/columns/:columnId', authenticate, async (req, res) => {
  try {
    const { columnId } = req.params;
    const { projectId } = req.query;

    // Prevent deletion of default columns (check by name since default columns might not have ObjectIds)
    const defaultColumnNames = ['todo', 'in-progress', 'review', 'done'];
    
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

      // Find the column to check if it's a default column
      const columnToDelete = project.kanbanColumns.find(col => {
        if (col._id && col._id.toString() === columnId) return true;
        const nameBasedId = col.name.toLowerCase().replace(/\s+/g, '-');
        return nameBasedId === columnId;
      });

      if (columnToDelete && defaultColumnNames.includes(columnToDelete.name.toLowerCase().replace(/\s+/g, '-'))) {
        return res.status(400).json({ message: 'Cannot delete default columns' });
      }      // Remove column by ObjectId or fallback to name-based matching for legacy columns
      const initialLength = project.kanbanColumns.length;
      project.kanbanColumns = project.kanbanColumns.filter(col => {
        // Try to match by ObjectId first (for new columns)
        if (col._id && col._id.toString() === columnId) {
          return false;
        }
        // Fallback to name-based matching for legacy columns
        const nameBasedId = col.name.toLowerCase().replace(/\s+/g, '-');
        return nameBasedId !== columnId;
      });
      
      // Check if any column was actually removed
      if (project.kanbanColumns.length === initialLength) {
        return res.status(404).json({ message: 'Column not found' });
      }
      
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
    { _id: 'todo', name: 'todo', order: 0, color: 'bg-slate-100' },
    { _id: 'in-progress', name: 'in-progress', order: 1, color: 'bg-blue-100' },
    { _id: 'review', name: 'review', order: 2, color: 'bg-yellow-100' },
    { _id: 'done', name: 'done', order: 3, color: 'bg-green-100' },
  ];
}

// Helper function to get default color for a column by ID
function getDefaultColorForColumn(columnId) {
  const colorMap = {
    'todo': 'bg-slate-100',
    'in-progress': 'bg-blue-100',
    'review': 'bg-yellow-100',
    'done': 'bg-green-100',
    'testing': 'bg-purple-100',
    'blocked': 'bg-red-100',
    'deployed': 'bg-green-100',
  };
  return colorMap[columnId] || 'bg-gray-100';
}

export default router;
