import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import TaskHistory from '../models/TaskHistory.js';
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

    // Enhanced access control: Users can see tasks they have access to
    const userFilter = {
      $or: [
        { createdBy: req.user._id },
        { assignedUsers: req.user._id },
      ],
    };

    // If admin, can see all tasks
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // Admin can see all tasks, no additional filtering needed
    } else {
      // For project-specific requests, check project membership
      if (projectId) {
        const project = await Project.findById(projectId);
        if (project) {
          // Check if user has access to this project
          const hasProjectAccess = project.createdBy.equals(req.user._id) ||
                                  project.isMember(req.user._id) ||
                                  (project.organization && req.user.organization && 
                                   project.organization.equals(req.user.organization) && 
                                   project.visibility === 'organization') ||
                                  project.visibility === 'public';

          if (hasProjectAccess) {
            // User has project access, so they can see all tasks in this project
            // Remove the user filter for this case
            const tasks = await Task.find(filter)
              .populate('createdBy', 'name email')
              .populate('assignedUsers', 'name email')
              .populate('projectId', 'name')
              .populate('subtasks')
              .sort({ createdAt: -1 });

            return res.json(tasks);
          } else {
            // User doesn't have project access, return empty array
            return res.json([]);
          }
        }
      } else {
        // For general task listing (no specific project), include tasks from projects user is a member of
        const userProjects = await Project.find({
          $or: [
            { createdBy: req.user._id },
            { 'members.user': req.user._id },
            ...(req.user.organization ? [{
              organization: req.user.organization,
              visibility: 'organization'
            }] : []),
            { visibility: 'public' }
          ]
        }).select('_id');

        const projectIds = userProjects.map(p => p._id);
        
        // Add project access to user filter
        userFilter.$or.push({ projectId: { $in: projectIds } });
      }
    }

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

    // Enhanced access check: Check if user has access to this task
    let hasAccess = false;

    // Admin access
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      hasAccess = true;
    }
    // Task creator access
    else if (task.createdBy._id.equals(req.user._id)) {
      hasAccess = true;
    }
    // Assigned user access
    else if (task.assignedUsers.some(user => user._id.equals(req.user._id))) {
      hasAccess = true;
    }
    // Project member access
    else if (task.projectId) {
      const project = await Project.findById(task.projectId);
      if (project) {
        hasAccess = project.createdBy.equals(req.user._id) ||
                   project.isMember(req.user._id) ||
                   (project.organization && req.user.organization && 
                    project.organization.equals(req.user.organization) && 
                    project.visibility === 'organization') ||
                   project.visibility === 'public';
      }
    }

    if (!hasAccess) {
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
                              project.members(req.user._id);

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
    
    // Log task creation
    await logTaskChange(task._id, 'created', {
      details: `Task "${task.title}" created`
    }, req.user._id, req.user.name);
    
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

    const task = await Task.findById(req.params.id)
      .populate('assignedUsers', 'name email');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Enhanced permission check: Check if user has permission to update this task
    let canUpdate = false;

    // Admin access
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      canUpdate = true;
    }
    // Task creator access
    else if (task.createdBy.equals(req.user._id)) {
      canUpdate = true;
    }
    // Assigned user access
    else if (task.assignedUsers.some(user => user._id.equals(req.user._id))) {
      canUpdate = true;
    }
    // Project member access
    else if (task.projectId) {
      const project = await Project.findById(task.projectId);
      if (project) {
        canUpdate = project.createdBy.equals(req.user._id) ||
                   project.isMember(req.user._id);
      }
    }

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    const userName = req.user.name;
    const userId = req.user._id;
    
    console.log('🔄 Server: Updating task', req.params.id, 'with data:', updates);
    
    // Log changes for each field
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = task[field];
      
      // Skip if value hasn't changed
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      
      switch (field) {
        case 'title':
          if (oldValue !== newValue) {
            await logTaskChange(task._id, 'title_updated', {
              field,
              oldValue,
              newValue
            }, userId, userName);
          }
          break;
          
        case 'description':
          if (oldValue !== newValue) {
            // Check if this is a voice note addition
            const isVoiceNoteAddition = newValue && newValue.includes('[🎤 Voice Note recorded at');
            const previousHadVoiceNote = oldValue && oldValue.includes('[🎤 Voice Note recorded at');
            
            if (isVoiceNoteAddition && !previousHadVoiceNote) {
              await logTaskChange(task._id, 'voice_note_added', {
                field,
                oldValue: oldValue ? 'Previous description' : 'No description',
                newValue: 'Description with voice note added',
                details: 'Voice note added to description'
              }, userId, userName);
            } else if (isVoiceNoteAddition && previousHadVoiceNote) {
              await logTaskChange(task._id, 'voice_note_added', {
                field,
                oldValue: 'Previous description with voice note',
                newValue: 'Updated description with voice note',
                details: 'Voice note added to existing description'
              }, userId, userName);
            } else {
              await logTaskChange(task._id, 'description_updated', {
                field,
                oldValue: oldValue ? 'Previous description' : 'No description',
                newValue: newValue ? 'Updated description' : 'Removed description'
              }, userId, userName);
            }
          }
          break;
          
        case 'status':
          if (oldValue !== newValue) {
            await logTaskChange(task._id, 'status_changed', {
              field,
              oldValue,
              newValue
            }, userId, userName);
          }
          break;
          
        case 'priority':
          if (oldValue !== newValue) {
            await logTaskChange(task._id, 'priority_changed', {
              field,
              oldValue,
              newValue
            }, userId, userName);
          }
          break;
          
        case 'endDate':
          if (oldValue?.getTime() !== new Date(newValue)?.getTime()) {
            await logTaskChange(task._id, 'due_date_changed', {
              field,
              oldValue,
              newValue: new Date(newValue)
            }, userId, userName);
          }
          break;
          
        case 'startDate':
          if (oldValue?.getTime() !== new Date(newValue)?.getTime()) {
            await logTaskChange(task._id, 'start_date_changed', {
              field,
              oldValue,
              newValue: new Date(newValue)
            }, userId, userName);
          }
          break;
          
        case 'assignedUsers':
          // Handle assignment changes
          const oldAssignedIds = (oldValue || []).map(id => id.toString());
          const newAssignedIds = (newValue || []).map(id => id.toString());
          
          // Find newly assigned users
          const newlyAssigned = newAssignedIds.filter(id => !oldAssignedIds.includes(id));
          // Find unassigned users
          const unassigned = oldAssignedIds.filter(id => !newAssignedIds.includes(id));
          
          for (const userId of newlyAssigned) {
            await logTaskChange(task._id, 'assigned', {
              field,
              newValue: userId // Will be populated with user name in history view
            }, req.user._id, userName);
          }
          
          for (const userId of unassigned) {
            await logTaskChange(task._id, 'unassigned', {
              field,
              oldValue: userId // Will be populated with user name in history view
            }, req.user._id, userName);
          }
          break;
          
        case 'tags':
          // Handle tag changes
          const oldTags = oldValue || [];
          const newTags = newValue || [];
          
          const addedTags = newTags.filter(tag => !oldTags.includes(tag));
          const removedTags = oldTags.filter(tag => !newTags.includes(tag));
          
          for (const tag of addedTags) {
            await logTaskChange(task._id, 'tag_added', {
              field,
              newValue: tag
            }, userId, userName);
          }
          
          for (const tag of removedTags) {
            await logTaskChange(task._id, 'tag_removed', {
              field,
              oldValue: tag
            }, userId, userName);
          }
          break;
      }
    }
    
    // Apply date conversions
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

    // Enhanced permission check: Check if user can delete this task
    let canDelete = false;

    // Admin access
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      canDelete = true;
    }
    // Task creator access
    else if (task.createdBy.equals(req.user._id)) {
      canDelete = true;
    }
    // Project admin access (only project admins can delete tasks, not regular members)
    else if (task.projectId) {
      const project = await Project.findById(task.projectId);
      if (project) {
        canDelete = project.createdBy.equals(req.user._id) ||
                   project.isAdmin(req.user._id);
      }
    }

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

    // Log subtask creation
    await logTaskChange(parentTaskId, 'subtask_added', {
      field: 'subtasks',
      newValue: title,
      details: `Subtask "${title}" created`
    }, req.user._id, req.user.name);

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

    // Get current subtask data for change tracking
    const currentSubtask = await Task.findById(subtaskId);
    if (!currentSubtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    const subtask = await Task.findOneAndUpdate(
      { _id: subtaskId, parentTask: parentTaskId },
      updateData,
      { new: true }
    ).populate('assignedUsers', 'name email')
     .populate('createdBy', 'name email');

    // Log subtask updates
    for (const [field, newValue] of Object.entries(updateData)) {
      const oldValue = currentSubtask[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        if (field === 'status' && newValue === 'done') {
          await logTaskChange(parentTaskId, 'subtask_completed', {
            field: 'subtasks',
            newValue: currentSubtask.title,
            details: `Subtask "${currentSubtask.title}" marked as completed`
          }, req.user._id, req.user.name);
        } else if (field === 'status') {
          await logTaskChange(parentTaskId, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask "${currentSubtask.title}" status changed from "${oldValue}" to "${newValue}"`
          }, req.user._id, req.user.name);
        } else if (field === 'title') {
          await logTaskChange(parentTaskId, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask title changed from "${oldValue}" to "${newValue}"`
          }, req.user._id, req.user.name);
        } else if (field === 'description') {
          await logTaskChange(parentTaskId, 'subtask_updated', {
            field: 'subtasks',
            details: `Subtask "${currentSubtask.title}" description updated`
          }, req.user._id, req.user.name);
        }
      }
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

    // Get subtask before deletion for logging
    const subtask = await Task.findOne({
      _id: subtaskId,
      parentTask: parentTaskId
    });

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    // Log subtask deletion
    await logTaskChange(parentTaskId, 'subtask_deleted', {
      field: 'subtasks',
      oldValue: subtask.title,
      details: `Subtask "${subtask.title}" deleted`
    }, req.user._id, req.user.name);

    // Delete the subtask
    await Task.findOneAndDelete({
      _id: subtaskId,
      parentTask: parentTaskId
    });

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

// Get task history
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user has access to this task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    const hasAccess = task.createdBy.equals(req.user._id) || 
                     task.assignedUsers.some(userId => userId.equals(req.user._id));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const history = await TaskHistory.find({ taskId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TaskHistory.countDocuments({ taskId });

    // Format history entries with descriptions
    const formattedHistory = history.map(entry => ({
      ...entry.toObject(),
      formattedDescription: entry.getFormattedDescription(),
    }));

    res.json({
      history: formattedHistory,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
      },
    });
  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({ message: 'Server error while fetching task history' });
  }
});

// Helper function to log task changes
async function logTaskChange(taskId, action, data, userId, userName) {
  try {
    await TaskHistory.logChange(taskId, action, data, userId, userName);
  } catch (error) {
    console.error('Error logging task change:', error);
    // Don't throw error to prevent breaking the main operation
  }
}

export default router;