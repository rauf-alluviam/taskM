import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all tasks (with optional project filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const filter = {};

    // Build filter based on query parameters
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedUsers = assignedTo;

    // Users can see tasks they created or are assigned to
    const userFilter = {
      $or: [
        { createdBy: req.user._id },
        { assignedUsers: req.user._id },
      ],
    };

    const tasks = await Task.find({ ...filter, ...userFilter })
      .populate('createdBy', 'name email')
      .populate('assignedUsers', 'name email')
      .populate('projectId', 'name')
      .populate('subtasks')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// Get single task
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedUsers', 'name email')
      .populate('projectId', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    const hasAccess = task.createdBy._id.equals(req.user._id) ||
                     task.assignedUsers.some(user => user._id.equals(req.user._id));

    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
});

// Create new task
router.post('/', authenticate, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().trim(),
  body('projectId').optional().isMongoId(),
  body('tags').optional().isArray(),
  body('assignedUsers').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      priority = 'medium',
      tags = [],
      status = 'todo',
      projectId,
      assignedUsers = [],
    } = req.body;

    // If projectId is provided, verify user has access to the project
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                              project.members.includes(req.user._id);

      if (!hasProjectAccess && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied to project' });
      }
    }

    const task = new Task({
      title,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      priority,
      tags,
      status,
      projectId: projectId || undefined,
      assignedUsers,
      createdBy: req.user._id,
    });

    await task.save();
    await task.populate('createdBy', 'name email');
    await task.populate('assignedUsers', 'name email');
    await task.populate('projectId', 'name');

    // Emit real-time event
    const io = req.app.get('io');
    if (projectId) {
      io.to(`project:${projectId}`).emit('task:created', task);
    } else {
      io.emit('task:created', task);
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

// Update task
router.put('/:id', authenticate, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().trim(),
  body('tags').optional().isArray(),
  body('assignedUsers').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to update this task
    const canUpdate = task.createdBy.equals(req.user._id) ||
                     task.assignedUsers.includes(req.user._id) ||
                     req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    console.log('🔄 Server: Updating task', req.params.id, 'with data:', updates);
    
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedUsers', 'name email')
      .populate('projectId', 'name');

    console.log('✅ Server: Task updated successfully:', { 
      id: updatedTask._id, 
      title: updatedTask.title, 
      status: updatedTask.status 
    });

    // Emit real-time event
    const io = req.app.get('io');
    if (updatedTask.projectId) {
      io.to(`project:${updatedTask.projectId._id}`).emit('task:updated', updatedTask);
    } else {
      io.emit('task:updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only task creator or admin can delete
    const canDelete = task.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Emit real-time event before deletion
    const io = req.app.get('io');
    if (task.projectId) {
      io.to(`project:${task.projectId}`).emit('task:deleted', task._id);
    } else {
      io.emit('task:deleted', task._id);
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

// Create subtask
router.post('/:id/subtasks', authenticate, async (req, res) => {
  try {
    const { id: parentTaskId } = req.params;
    const { title, description, priority = 'medium', startDate, endDate } = req.body;

    // Verify parent task exists
    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) {
      return res.status(404).json({ message: 'Parent task not found' });
    }

    // Create subtask
    const subtask = new Task({
      title,
      description,
      priority,
      startDate,
      endDate,
      status: 'todo',
      projectId: parentTask.projectId,
      parentTask: parentTaskId,
      isSubtask: true,
      createdBy: req.user._id,
    });

    await subtask.save();

    // Update parent task's subtasks array
    parentTask.subtasks.push(subtask._id);
    parentTask.subtaskProgress.total = parentTask.subtasks.length;
    await parentTask.save();

    const populatedSubtask = await Task.findById(subtask._id)
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedSubtask);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create subtask', error: error.message });
  }
});

// Get subtasks for a task
router.get('/:id/subtasks', authenticate, async (req, res) => {
  try {
    const { id: parentTaskId } = req.params;

    const subtasks = await Task.find({ parentTask: parentTaskId })
      .populate('assignedUsers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });

    res.json(subtasks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subtasks', error: error.message });
  }
});

// Update subtask
router.put('/:id/subtasks/:subtaskId', authenticate, async (req, res) => {
  try {
    const { id: parentTaskId, subtaskId } = req.params;
    const updateData = req.body;

    const subtask = await Task.findOneAndUpdate(
      { _id: subtaskId, parentTask: parentTaskId },
      updateData,
      { new: true }
    ).populate('assignedUsers', 'name email')
     .populate('createdBy', 'name email');

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Update parent task progress if subtask status changed
    if (updateData.status) {
      const parentTask = await Task.findById(parentTaskId);
      if (parentTask) {
        const completedSubtasks = await Task.countDocuments({
          parentTask: parentTaskId,
          status: 'done'
        });
        
        parentTask.subtaskProgress.completed = completedSubtasks;
        await parentTask.save();
      }
    }

    res.json(subtask);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subtask', error: error.message });
  }
});

// Delete subtask
router.delete('/:id/subtasks/:subtaskId', authenticate, async (req, res) => {
  try {
    const { id: parentTaskId, subtaskId } = req.params;

    const subtask = await Task.findOneAndDelete({
      _id: subtaskId,
      parentTask: parentTaskId
    });

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Update parent task
    const parentTask = await Task.findById(parentTaskId);
    if (parentTask) {
      parentTask.subtasks = parentTask.subtasks.filter(
        id => id.toString() !== subtaskId
      );
      parentTask.subtaskProgress.total = parentTask.subtasks.length;
      
      const completedSubtasks = await Task.countDocuments({
        parentTask: parentTaskId,
        status: 'done'
      });
      parentTask.subtaskProgress.completed = completedSubtasks;
      
      await parentTask.save();
    }

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete subtask', error: error.message });
  }
});

export default router;