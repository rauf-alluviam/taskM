import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { isActive: true };
    
    // Build access filter based on user type and organization
    if (req.user.role === 'super_admin') {
      // Super admin can see all projects
    } else if (req.user.organization) {
      // Organization members can see:
      // 1. Projects they created or are members of
      // 2. Organization-wide projects (if they are org admin)
      // 3. Team projects they have access to
      const accessConditions = [
        { createdBy: req.user._id },
        { 'members.user': req.user._id }
      ];

      // If user is org admin, they can see all organization projects
      if (req.user.isOrganizationAdmin()) {
        accessConditions.push({ organization: req.user.organization });
      } else {
        // Regular users can see team projects they're part of
        const userTeams = req.user.teams.map(t => t.team);
        if (userTeams.length > 0) {
          accessConditions.push({ team: { $in: userTeams } });
        }
      }

      filter.$or = accessConditions;
    } else {
      // Individual users can only see projects they created or are members of
      filter.$or = [
        { createdBy: req.user._id },
        { 'members.user': req.user._id },
      ];
    }

    const projects = await Project.find(filter)
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });

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
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email')
      .populate('documents');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    let hasAccess = false;

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      hasAccess = true;
    }
    // Project creator has access
    else if (project.createdBy._id.equals(req.user._id)) {
      hasAccess = true;
    }
    // Project members have access
    else if (project.members.some(member => member.user._id.equals(req.user._id))) {
      hasAccess = true;
    }
    // Organization members have access to organization projects
    else if (project.organization && req.user.organization && 
             project.organization.equals(req.user.organization)) {
      // Org admins can access all org projects
      if (req.user.isOrganizationAdmin()) {
        hasAccess = true;
      }
      // Team members can access team projects
      else if (project.team && req.user.isMemberOfTeam(project.team)) {
        hasAccess = true;
      }
      // Organization visibility allows all org members
      else if (project.visibility === 'organization') {
        hasAccess = true;
      }
    }
    // Public projects are accessible to all
    else if (project.visibility === 'public') {
      hasAccess = true;
    }

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
  body('teamId').optional().isMongoId().withMessage('Valid team ID required'),
  body('visibility').optional().isIn(['private', 'team', 'organization', 'public']),
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
      teamId,
      visibility = 'team',
      members = [],
      kanbanColumns = [
        { name: 'To Do', order: 0 },
        { name: 'In Progress', order: 1 },
        { name: 'Review', order: 2 },
        { name: 'Done', order: 3 },
      ],
      tags = [],
      color = '#3B82F6',
      icon = 'folder'
    } = req.body;

    let projectType = 'individual';
    let organization = null;
    let team = null;

    // Determine project type and associations based on user's context
    if (req.user.organization) {
      organization = req.user.organization;
      projectType = teamId ? 'team' : 'organization';

      // If teamId is provided, validate it
      if (teamId) {
        const Team = (await import('../models/Team.js')).default;
        const teamDoc = await Team.findById(teamId);
        if (!teamDoc) {
          return res.status(404).json({ message: 'Team not found' });
        }

        // Check if user is part of this team or is org admin
        if (!teamDoc.isMember(req.user._id) && !teamDoc.isLead(req.user._id) && !req.user.isOrganizationAdmin()) {
          return res.status(403).json({ message: 'Access denied to this team' });
        }

        team = teamId;
      }
    }

    const project = new Project({
      name: name.trim(),
      description,
      department,
      organization,
      team,
      visibility,
      projectType,
      createdBy: req.user._id,
      members: members.map(memberId => ({
        user: memberId,
        role: 'member',
        addedAt: new Date(),
        addedBy: req.user._id
      })),
      kanbanColumns: kanbanColumns.map((col, index) => ({
        name: col.name || col.title,
        order: col.order !== undefined ? col.order : index
      })),
      tags,
      color,
      icon
    });

    await project.save();
    
    await project.populate('createdBy', 'name email');
    await project.populate('organization', 'name');
    await project.populate('team', 'name');
    await project.populate('members.user', 'name email');

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
  body('role').optional().isIn(['org_admin', 'member', 'viewer']).withMessage('Valid role is required'),
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
    const canAddMembers = project.isAdmin(req.user._id) || 
                         req.user.role === 'super_admin' ||
                         (req.user.organization && req.user.isOrganizationAdmin());
    if (!canAddMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId, role = 'member' } = req.body;

    // Check if user exists and is in the same organization (if applicable)
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check organization membership if project belongs to an organization
    if (project.organization && (!user.organization || !user.organization.equals(project.organization))) {
      return res.status(400).json({ message: 'User must be part of the same organization' });
    }

    // Check if user is already a member
    if (project.isMember(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add member using the model method
    project.addMember(userId, role, req.user._id);
    await project.save();
    
    await project.populate('members.user', 'name email');

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
    const canRemoveMembers = project.isAdmin(req.user._id) || 
                            req.user.role === 'super_admin' ||
                            (req.user.organization && req.user.isOrganizationAdmin());
    if (!canRemoveMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;

    // Cannot remove project creator
    if (project.createdBy.equals(userId)) {
      return res.status(400).json({ message: 'Cannot remove project creator' });
    }

    // Remove member using the model method
    project.removeMember(userId);
    await project.save();
    
    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error while removing member' });
  }
});

// Update member role
router.put('/:id/members/:userId/role', authenticate, [
  body('role').isIn(['admin', 'member', 'viewer']).withMessage('Valid role is required'),
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

    // Check if user has permission to update member roles
    const canUpdateRoles = project.isAdmin(req.user._id) || 
                          req.user.role === 'super_admin' ||
                          (req.user.organization && req.user.isOrganizationAdmin());
    if (!canUpdateRoles) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Cannot change creator's role
    if (project.createdBy.equals(userId)) {
      return res.status(400).json({ message: 'Cannot change project creator role' });
    }

    // Update member role using the model method
    project.updateMemberRole(userId, role);
    await project.save();

    await project.populate('members.user', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error while updating member role' });
  }
});

export default router;