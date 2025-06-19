import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    
    // Non-admin users can only see projects they created or are members of
    if (req.user.role !== 'admin') {
      filter.$or = [
        { createdBy: req.user._id },
        { members: req.user._id },
      ];
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email')
      .populate('documents');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.createdBy._id.equals(req.user._id) ||
                     project.members.some(member => member._id.equals(req.user._id)) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

// Create new project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1 }).withMessage('Project name is required'),
  body('description').optional().trim(),
  body('department').trim().isLength({ min: 1 }).withMessage('Department is required'),
  body('kanbanColumns').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      department,
      members = [],
      kanbanColumns = [
        { name: 'todo', order: 0 },
        { name: 'in-progress', order: 1 },
        { name: 'review', order: 2 },
        { name: 'done', order: 3 },
      ],
    } = req.body;

    const project = new Project({
      name,
      description,
      department,
      createdBy: req.user._id,
      members,
      kanbanColumns,
    });

    await project.save();
    await project.populate('createdBy', 'name email');
    await project.populate('members', 'name email');

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

// Update project
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('department').optional().trim().isLength({ min: 1 }),
  body('members').optional().isArray(),
  body('kanbanColumns').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to update this project
    const canUpdate = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('members', 'name email');

    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

// Delete project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project creator or admin can delete
    const canDelete = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ projectId: req.params.id });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

// Add member to project
router.post('/:id/members', authenticate, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to add members
    const canAddMembers = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canAddMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.body;

    // Check if user is already a member
    if (project.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error while adding member' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to remove members
    const canRemoveMembers = project.createdBy.equals(req.user._id) || req.user.role === 'admin';
    if (!canRemoveMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    project.members = project.members.filter(
      member => !member.equals(req.params.userId)
    );
    
    await project.save();
    await project.populate('members', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error while removing member' });
  }
});

export default router;