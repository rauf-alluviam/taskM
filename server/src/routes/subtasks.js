import express from 'express';
import mongoose from 'mongoose';
import Subtask from '../models/Subtask.js';
import Task from '../models/Task.js';
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

    // Handle date conversion
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const subtask = await Subtask.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    res.json(subtask);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ message: 'Failed to update subtask', error: error.message });
  }
});

// Delete a subtask
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const subtask = await Subtask.findByIdAndDelete(id);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

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
