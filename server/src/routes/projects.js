import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { authenticate, authorize } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
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
    body('members').optional().isArray().withMessage('Members must be an array of user IDs.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            name,
            description,
            department,
            teamId, // Now correctly validated as MongoID or undefined
            visibility = 'team',
            members: memberIds = [], // Renamed for clarity
            kanbanColumns: inputColumns,
            tags = [],
            color = '#3B82F6',
            icon = 'folder'
        } = req.body;

        const { user: currentUser } = req;
        let organization = null;
        let projectType = 'individual';
        let team = null;
                const teamDoc = await Team.findById(teamId).populate('members.user', 'email name');

        // 1. IMPROVEMENT: Determine project type and validate associations
        if (currentUser.organization) {
            organization = currentUser.organization;
            projectType = teamId ? 'team' : 'organization';

            if (teamId) {
                console.log('teamDoc.organization:', teamDoc.organization.toString());
                console.log('current organization:', organization._id.toString());
                console.log('teamDoc.members:', teamDoc.members);
                console.log('currentUser._id:', currentUser._id.toString());
                if (!teamDoc || !teamDoc.organization.equals(organization._id)) {
                    return res.status(404).json({ message: 'Team not found or does not belong to your organization' });
                }
                if (!teamDoc.members.some(m => m.user.equals(currentUser._id)) && !currentUser.isOrganizationAdmin()) {
                    return res.status(403).json({ message: 'Access denied to this team' });
                }
                team = teamId;
            }
        }
        
        // 2. IMPROVEMENT: Automatically add the creator as a project admin
        const projectMembers = memberIds.map(memberId => ({
            user: memberId,
            role: 'member',
            addedAt: new Date(),
            addedBy: currentUser._id
        }));

        // Ensure the creator is not duplicated if they are also in the members list
        if (!memberIds.includes(currentUser._id.toString())) {
            projectMembers.unshift({
                user: currentUser._id,
                role: 'admin', // The creator should be an admin
                addedAt: new Date(),
                addedBy: currentUser._id
            });
        }

        const defaultColumns = [
            { name: 'To Do', order: 0 },
            { name: 'In Progress', order: 1 },
            { name: 'Review', order: 2 },
            { name: 'Done', order: 3 },
        ];

        const project = new Project({
            name: name.trim(),
            description,
            department,
            organization,
            team,
            visibility,
            projectType,
            createdBy: currentUser._id,
            members: projectMembers, // Use the new prepared members array
            kanbanColumns: (inputColumns && inputColumns.length > 0) ? inputColumns : defaultColumns,
            tags,
            color,
            icon
        });

        await project.save();
        const projectLink = `${process.env.DOMAIN || 'http://localhost:3000'}/projects/${project._id}`;
        await project.populate('members.user', 'name email');
        // Send email to all team members (not just creator)
        let recipients = [];
        if (teamId) {
            // Use teamDoc.members
            recipients = teamDoc.members.map(m => m.user.email).filter(Boolean);
        } else if (organization) {
            // Fallback: all org users
            const orgDoc = await Organization.findById(organization._id).populate('members', 'email name');
            recipients = orgDoc.members.map(u => u.email).filter(Boolean);
        }
        await Promise.all(
            recipients.map(email =>
                emailService.sendProjectCreatedEmail(email, {
                    projectName: project.name,
                    projectLink,
                    creatorName: currentUser.name
                })
            )
        );
        // 4. IMPROVEMENT: Chain populate calls for cleaner code
        // We already populated 'members.user', so we can skip it here if we return the existing project object.
        // For consistency, we'll re-populate everything for the final response.
        await project.populate([
            { path: 'createdBy', select: 'name email' },
            { path: 'organization', select: 'name' },
            { path: 'team', select: 'name' },
            { path: 'members.user', select: 'name email' }
        ]);
        res.status(201).json(project);

    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Server error while creating project' });
    }
});


// Update project
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Project name must not be empty'),
  body('description').optional().trim(),
  body('department').optional().trim().isLength({ min: 1 }).withMessage('Department must not be empty'),
  body('teamId').optional().custom((value) => {
    // Allow empty string, null, undefined, or valid MongoDB ObjectId
    if (!value || value === '' || value === null || value === undefined) {
      return true;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new Error('Valid team ID required');
    }
    return true;
  }),
  body('visibility').optional().isIn(['private', 'team', 'organization', 'public']).withMessage('Invalid visibility option'),
  body('status').optional().isIn(['active', 'paused', 'completed', 'archived']).withMessage('Invalid status'),
  body('kanbanColumns').optional().isArray().withMessage('Kanban columns must be an array'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  body('icon').optional().trim(),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Enhanced permission checking
    let canUpdate = false;

    // Super admin can update any project
    if (req.user.role === 'super_admin') {
      canUpdate = true;
    }
    // Project creator can update
    else if (project.createdBy._id.equals(req.user._id)) {
      canUpdate = true;
    }
    // Project admins can update
    else if (project.isAdmin(req.user._id)) {
      canUpdate = true;
    }
    // Organization admins can update organization projects
    else if (project.organization && req.user.organization && 
             project.organization._id.equals(req.user.organization) && 
             req.user.isOrganizationAdmin()) {
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied - insufficient permissions to edit this project' });
    }

    const {
      name,
      description,
      department,
      teamId,
      visibility,
      status,
      kanbanColumns,
      tags,
      color,
      icon,
      startDate,
      endDate,
      settings
    } = req.body;

    // Prepare update object
    const updateData = {};

    // Basic fields
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (department !== undefined) updateData.department = department.trim();
    if (visibility !== undefined) updateData.visibility = visibility;
    if (status !== undefined) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (settings !== undefined) {
      updateData.settings = { ...project.settings, ...settings };
    }

    // Handle team assignment (only if user has org admin rights or is super admin)
    if (teamId !== undefined && (req.user.role === 'super_admin' || 
        (req.user.organization && req.user.isOrganizationAdmin()))) {
      
      if (teamId && teamId !== '') {
        const Team = (await import('../models/Team.js')).default;
        const teamDoc = await Team.findById(teamId);
        if (!teamDoc) {
          return res.status(404).json({ message: 'Team not found' });
        }

        // Validate team belongs to same organization
        if (project.organization && !teamDoc.organization.equals(project.organization._id)) {
          return res.status(400).json({ message: 'Team must belong to the same organization' });
        }

        updateData.team = teamId;
        updateData.projectType = 'team';
      } else {
        updateData.team = null;
        updateData.projectType = project.organization ? 'organization' : 'individual';
      }
    }

    // Handle kanban columns with validation
    if (kanbanColumns !== undefined) {
      if (!Array.isArray(kanbanColumns)) {
        return res.status(400).json({ message: 'Kanban columns must be an array' });
      }

      updateData.kanbanColumns = kanbanColumns.map((col, index) => {
        if (!col.name || col.name.trim() === '') {
          throw new Error(`Column at index ${index} must have a name`);
        }
        return {
          name: col.name.trim(),
          order: col.order !== undefined ? col.order : index
        };
      });
    }

    // Validate date range
    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      if (start >= end) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    // Validate visibility changes
    if (updateData.visibility) {
      // If changing to organization visibility, ensure project belongs to an organization
      if (updateData.visibility === 'organization' && !project.organization) {
        return res.status(400).json({ message: 'Cannot set organization visibility for non-organization project' });
      }
      // If changing to team visibility, ensure project has a team
      if (updateData.visibility === 'team' && !project.team && !updateData.team) {
        return res.status(400).json({ message: 'Cannot set team visibility without a team assignment' });
      }
    }

    // Perform the update
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors 
      });
    }

    // Handle custom errors
    if (error.message && error.message.includes('Column at index')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Server error while updating project' });
  }
});

// Update project settings specifically
router.patch('/:id/settings', authenticate, [
  body('settings').isObject().withMessage('Settings must be an object'),
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

    // Check permissions
    const canUpdate = project.isAdmin(req.user._id) || 
                     req.user.role === 'super_admin' ||
                     (req.user.organization && req.user.isOrganizationAdmin());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { settings } = req.body;
    
    // Merge with existing settings
    const updatedSettings = { ...project.settings, ...settings };

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { settings: updatedSettings },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    res.json({
      message: 'Project settings updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project settings error:', error);
    res.status(500).json({ message: 'Server error while updating project settings' });
  }
});

// Update project status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['active', 'paused', 'completed', 'archived']).withMessage('Invalid status'),
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

    // Check permissions
    const canUpdate = project.isAdmin(req.user._id) || 
                     req.user.role === 'super_admin' ||
                     (req.user.organization && req.user.isOrganizationAdmin());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    res.json({
      message: 'Project status updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ message: 'Server error while updating project status' });
  }
});

// Update kanban columns
router.patch('/:id/kanban-columns', authenticate, [
  body('kanbanColumns').isArray().withMessage('Kanban columns must be an array'),
  body('kanbanColumns.*.name').trim().isLength({ min: 1 }).withMessage('Column name is required'),
  body('kanbanColumns.*.order').isNumeric().withMessage('Column order must be numeric'),
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

    // Check permissions
    const canUpdate = project.isAdmin(req.user._id) || 
                     req.user.role === 'super_admin' ||
                     (req.user.organization && req.user.isOrganizationAdmin());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { kanbanColumns } = req.body;

    // Validate and format columns
    const formattedColumns = kanbanColumns.map((col, index) => ({
      name: col.name.trim(),
      order: col.order !== undefined ? col.order : index
    }));

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { kanbanColumns: formattedColumns },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    res.json({
      message: 'Kanban columns updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update kanban columns error:', error);
    res.status(500).json({ message: 'Server error while updating kanban columns' });
  }
});

// Archive/Unarchive project
router.patch('/:id/archive', authenticate, [
  body('archived').isBoolean().withMessage('Archived must be a boolean value'),
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

    // Check permissions
    const canUpdate = project.isAdmin(req.user._id) || 
                     req.user.role === 'super_admin' ||
                     (req.user.organization && req.user.isOrganizationAdmin());
    
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { archived } = req.body;
    const status = archived ? 'archived' : 'active';

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { status, isActive: !archived },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .populate('team', 'name')
      .populate('members.user', 'name email');

    res.json({
      message: `Project ${archived ? 'archived' : 'unarchived'} successfully`,
      project: updatedProject
    });

  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({ message: 'Server error while archiving project' });
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
  body('role').optional().isIn(['admin', 'member']).withMessage('Valid role is required'),
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
    if (project.members.some(m => {
      const memberId = (typeof m.user === 'object' && m.user._id) ? m.user._id : m.user;
      return memberId.toString() === userId.toString();
    })) {
      return res.status(400).json({ message: 'User is already a member' });
    }
    console.log('project.members:', project.members);

    // Add member using the model method
    project.addMember(userId, role, req.user._id);
    await project.save();
    
    await project.populate('members.user', 'name email');

    // Send email notification to the newly added member
    const newMember = project.members.find(m => m.user._id.equals(user._id));
    if (newMember && user.email) {
      const projectLink = `${process.env.DOMAIN || `${process.env.DOMAIN}`}/projects/${project._id}`;
      await emailService.sendProjectMemberAddedEmail(user.email, {
        userName: user.name,
        projectName: project.name,
        projectLink
      });
    }
    console.log('Member', newMember);

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
  body('role').isIn(['admin', 'member']).withMessage('Valid role is required'),
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