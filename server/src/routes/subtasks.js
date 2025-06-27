import express from 'express';
import mongoose from 'mongoose';
import Subtask from '../models/Subtask.js';
import Task from '../models/Task.js';
import TaskHistory from '../models/TaskHistory.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all subtasks for a parent task
router.get('/task/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Verify the parent task exists and user has access
    const parentTask = await Task.findById(taskId);
    if (!parentTask) {
      return res.status(404).json({ message: 'Parent task not found' });
    }

    const subtasks = await Subtask.find({ parentTaskId: taskId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: 1 });

    res.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    res.status(500).json({ message: 'Failed to fetch subtasks', error: error.message });
  }
});

// Get a specific subtask
router.get('/:id', authenticate, async (req, res) => {
  try {
    const subtask = await Subtask.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('parentTaskId', 'title');

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    res.json(subtask);
  } catch (error) {
    console.error('Error fetching subtask:', error);
    res.status(500).json({ message: 'Failed to fetch subtask', error: error.message });
  }
});

// Create a new subtask
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      parentTaskId,
      priority = 'medium',
      assignedTo,
      estimatedHours,
      startDate,
      endDate,
      tags
    } = req.body;

    // Verify the parent task exists
    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) {
      return res.status(404).json({ message: 'Parent task not found' });
    }

    // Get the next order number for this parent task
    const lastSubtask = await Subtask.findOne({ parentTaskId })
      .sort({ order: -1 });
    const order = lastSubtask ? lastSubtask.order + 1 : 0;

    const subtask = new Subtask({
      title,
      description,
      parentTaskId,
      priority,
      assignedTo,
      estimatedHours,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      tags: tags || [],
      order,
      createdBy: req.user._id,
    });

    await subtask.save();
    
    // Log subtask creation
    await logTaskChange(parentTaskId, 'subtask_added', {
      field: 'subtasks',
      newValue: title,
      details: `Subtask "${title}" created`
    }, req.user._id, req.user.name);
    
    const populatedSubtask = await Subtask.findById(subtask._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedSubtask);
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ message: 'Failed to create subtask', error: error.message });
  }
});

// Update a subtask
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get the current subtask to track changes
    const currentSubtask = await Subtask.findById(id).populate('parentTaskId', 'title');
    if (!currentSubtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Handle date conversion
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const updatedSubtask = await Subtask.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Log subtask update
    const changedFields = [];
    for (const [field, newValue] of Object.entries(updateData)) {
      const oldValue = currentSubtask[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(field);
        
        // Log specific field changes
        if (field === 'status' && oldValue !== newValue) {
          if (newValue === 'done') {
            await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_completed', {
              field: 'subtasks',
              newValue: currentSubtask.title,
              details: `Subtask "${currentSubtask.title}" marked as completed`
            }, req.user._id, req.user.name);
          } else {
            await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_updated', {
              field: 'subtasks',
              details: `Subtask "${currentSubtask.title}" status changed from "${oldValue}" to "${newValue}"`
            }, req.user._id, req.user.name);
          }
        } else if (field === 'title' && oldValue !== newValue) {
          await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask title changed from "${oldValue}" to "${newValue}"`
          }, req.user._id, req.user.name);
        } else if (field === 'description' && oldValue !== newValue) {
          await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask "${currentSubtask.title}" description updated`
          }, req.user._id, req.user.name);
        } else if (field === 'priority' && oldValue !== newValue) {
          await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask "${currentSubtask.title}" priority changed from "${oldValue}" to "${newValue}"`
          }, req.user._id, req.user.name);
        }
      }
    }

    // Generic update log if multiple fields changed
    if (changedFields.length > 1) {
      await logTaskChange(currentSubtask.parentTaskId._id, 'subtask_updated', {
        field: 'subtasks',
        details: `Subtask "${currentSubtask.title}" updated (${changedFields.join(', ')})`
      }, req.user._id, req.user.name);
    }

    res.json(updatedSubtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Failed to update subtask', error: error.message });
  }
});

// Delete a subtask
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the subtask before deletion to log history
    const subtask = await Subtask.findById(id).populate('parentTaskId', 'title');
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Log subtask deletion
    await logTaskChange(subtask.parentTaskId._id, 'subtask_deleted', {
      field: 'subtasks',
      oldValue: subtask.title,
      details: `Subtask "${subtask.title}" deleted`
    }, req.user._id, req.user.name);

    // Delete the subtask
    await Subtask.findByIdAndDelete(id);

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ message: 'Failed to delete subtask', error: error.message });
  }
});

// Update subtask order (for drag and drop)
router.patch('/:id/order', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { newOrder, parentTaskId } = req.body;

    // Update the subtask order
    const subtask = await Subtask.findByIdAndUpdate(
      id,
      { order: newOrder },
      { new: true }
    );

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Reorder other subtasks in the same parent task
    await Subtask.updateMany(
      {
        parentTaskId,
        _id: { $ne: id },
        order: { $gte: newOrder }
      },
      { $inc: { order: 1 } }
    );

    res.json(subtask);
  } catch (error) {
    console.error('Error updating subtask order:', error);
    res.status(500).json({ message: 'Failed to update subtask order', error: error.message });
  }
});

// Get subtask statistics for a parent task
router.get('/task/:taskId/stats', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;

    const stats = await Subtask.aggregate([
      { $match: { parentTaskId: new mongoose.Types.ObjectId(taskId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSubtasks = await Subtask.countDocuments({ parentTaskId: taskId });
    const completedSubtasks = stats.find(s => s._id === 'done')?.count || 0;
    const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    res.json({
      total: totalSubtasks,
      completed: completedSubtasks,
      inProgress: stats.find(s => s._id === 'in-progress')?.count || 0,
      todo: stats.find(s => s._id === 'todo')?.count || 0,
      progressPercentage
    });
  } catch (error) {
    console.error('Error fetching subtask stats:', error);
    res.status(500).json({ message: 'Failed to fetch subtask statistics', error: error.message });
  }
});

export default router;

// Helper function to log task changes
async function logTaskChange(taskId, action, data, userId, userName) {
  try {
    await TaskHistory.logChange(taskId, action, data, userId, userName);
  } catch (error) {
    console.error('Error logging task change:', error);
    // Don't throw error to prevent breaking the main operation
  }
}
