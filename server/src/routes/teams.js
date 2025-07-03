import express from 'express';
import { body, validationResult } from 'express-validator';
import Team from '../models/Team.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all teams (filtered by user's organization)
router.get('/', authenticate, async (req, res) => {
  try {
    let query = { isActive: true };
    
    // If user is part of an organization, filter by organization
    if (req.user.organization) {
      query.organization = req.user.organization;
    } else {
      // Individual users can only see teams they're part of
      query.$or = [
        { lead: req.user._id },
        { 'members.user': req.user._id }
      ];
    }

    const teams = await Team.find(query)
      .populate('organization', 'name')
      .populate('lead', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ name: 1 });

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
});

// Get user's teams
router.get('/my-teams', authenticate, async (req, res) => {
  try {
    const teams = await Team.findByUser(req.user._id);
    res.json(teams);
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({ message: 'Server error while fetching user teams' });
  }
});

// Get single team
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('organization', 'name')
      .populate('lead', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has access to this team
    const hasAccess = team.isLead(req.user._id) ||
                     team.isMember(req.user._id) ||
                     (req.user.organization && req.user.organization.equals(team.organization)) ||
                     req.user.role === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error while fetching team' });
  }
});

// Create new team
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 2 }).withMessage('Team name must be at least 2 characters'),
  body('description').optional().trim(),
  body('organizationId').optional().isMongoId().withMessage('Valid organization ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      organizationId,
      visibility = 'organization',
      color = '#3B82F6',
      tags = []
    } = req.body;

    let organization = req.user.organization;

    // If organizationId is provided, validate it
    if (organizationId) {
      const org = await Organization.findById(organizationId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      
      // Check if user is part of this organization
      if (!req.user.organization || !req.user.organization.equals(organizationId)) {
        return res.status(403).json({ message: 'Access denied to this organization' });
      }
      
      organization = organizationId;
    }

    // Individual users can create teams without organization
    if (!organization && req.user.userType === 'individual') {
      // Allow individual team creation
    } else if (!organization) {
      return res.status(400).json({ message: 'Organization is required for organization members' });
    }

    // Check if team name already exists in the organization
    if (organization) {
      const existingTeam = await Team.findOne({ 
        name: name.trim(), 
        organization: organization,
        isActive: true 
      });
      if (existingTeam) {
        return res.status(400).json({ message: 'Team name already exists in this organization' });
      }
    }

    const team = new Team({
      name: name.trim(),
      description,
      organization,
      lead: req.user._id,
      color,
      visibility,
      tags,
      members: [{
        user: req.user._id,
        role: 'lead',
        joinedAt: new Date()
      }]
    });

    await team.save();

    // Update user's teams array
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        teams: {
          team: team._id,
          role: 'lead',
          joinedAt: new Date()
        }
      }
    });

    await team.populate('organization', 'name');
    await team.populate('lead', 'name email avatar');
    await team.populate('members.user', 'name email avatar');

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error while creating team' });
  }
});

// Update team
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user can update this team
    const canUpdate = team.isLead(req.user._id) ||
                     (req.user.organization && req.user.organization.equals(team.organization) && req.user.isOrganizationAdmin()) ||
                     req.user.role === 'super_admin';

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    
    // Check if name is being changed and if new name exists
    if (updates.name && updates.name !== team.name && team.organization) {
      const existingTeam = await Team.findOne({ 
        name: updates.name.trim(), 
        organization: team.organization,
        isActive: true,
        _id: { $ne: team._id }
      });
      if (existingTeam) {
        return res.status(400).json({ message: 'Team name already exists in this organization' });
      }
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('organization', 'name')
      .populate('lead', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json(updatedTeam);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Server error while updating team' });
  }
});

// Add member to team
router.post('/:id/members', authenticate, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').optional().isIn(['member']).withMessage('Valid role is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user can add members
    const canAddMembers = team.isLead(req.user._id) ||
                         (team.permissions.canInviteMembers && team.isMember(req.user._id)) ||
                         (req.user.organization && req.user.organization.equals(team.organization) && req.user.isOrganizationAdmin());

    if (!canAddMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId, role = 'member' } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is part of the same organization (if team has organization)
    if (team.organization && (!user.organization || !user.organization.equals(team.organization))) {
      return res.status(400).json({ message: 'User must be part of the same organization' });
    }

    // Check if user is already a member
    if (team.isMember(userId)) {
      return res.status(400).json({ message: 'User is already a member of this team' });
    }

    // Add member to team
    team.addMember(userId, role);
    await team.save();

    // Update user's teams array
    await User.findByIdAndUpdate(userId, {
      $push: {
        teams: {
          team: team._id,
          role: role,
          joinedAt: new Date()
        }
      }
    });

    await team.populate('members.user', 'name email avatar');

    res.json(team);
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: 'Server error while adding member' });
  }
});

// Remove member from team
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const { userId } = req.params;

    // Check if user can remove members
    const canRemoveMembers = team.isLead(req.user._id) ||
                            req.user._id.equals(userId) || // Users can remove themselves
                            (req.user.organization && req.user.organization.equals(team.organization) && req.user.isOrganizationAdmin());

    if (!canRemoveMembers) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Cannot remove team lead
    if (team.lead.equals(userId)) {
      return res.status(400).json({ message: 'Cannot remove team lead. Transfer leadership first.' });
    }

    // Remove member from team
    team.removeMember(userId);
    await team.save();

    // Update user's teams array
    await User.findByIdAndUpdate(userId, {
      $pull: {
        teams: { team: team._id }
      }
    });

    await team.populate('members.user', 'name email avatar');

    res.json(team);
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ message: 'Server error while removing member' });
  }
});

// Update member role
router.put('/:id/members/:userId/role', authenticate, [
  body('role').isIn(['lead', 'member']).withMessage('Valid role is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Check if user can update member roles
    const canUpdateRoles = team.isLead(req.user._id) ||
                          (req.user.organization && req.user.organization.equals(team.organization) && req.user.isOrganizationAdmin());

    if (!canUpdateRoles) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If changing to lead, update the lead field and demote current lead
    if (role === 'lead') {
      const currentLead = team.lead;
      
      // Update current lead to member
      team.updateMemberRole(currentLead, 'member');
      
      // Set new lead
      team.lead = userId;
      
      // Update user's team role in User model
      await User.findOneAndUpdate(
        { _id: currentLead, 'teams.team': team._id },
        { $set: { 'teams.$.role': 'member' } }
      );
      
      await User.findOneAndUpdate(
        { _id: userId, 'teams.team': team._id },
        { $set: { 'teams.$.role': 'lead' } }
      );
    } else {
      // Update member role
      team.updateMemberRole(userId, role);
      
      // Update user's team role in User model
      await User.findOneAndUpdate(
        { _id: userId, 'teams.team': team._id },
        { $set: { 'teams.$.role': role } }
      );
    }

    await team.save();
    await team.populate('lead', 'name email avatar');
    await team.populate('members.user', 'name email avatar');

    res.json(team);
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error while updating member role' });
  }
});

// Get team projects
router.get('/:id/projects', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has access to this team
    const hasAccess = team.isLead(req.user._id) ||
                     team.isMember(req.user._id) ||
                     (req.user.organization && req.user.organization.equals(team.organization));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const projects = await Project.findByTeam(req.params.id);

    res.json(projects);
  } catch (error) {
    console.error('Get team projects error:', error);
    res.status(500).json({ message: 'Server error while fetching team projects' });
  }
});

// Get team statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has access to this team
    const hasAccess = team.isLead(req.user._id) ||
                     team.isMember(req.user._id) ||
                     (req.user.organization && req.user.organization.equals(team.organization));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const projectCount = await Project.countDocuments({ team: req.params.id, isActive: true });
    const memberCount = team.members.length;

    res.json({
      memberCount,
      projectCount,
      createdAt: team.createdAt,
      lastActivity: team.updatedAt
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({ message: 'Server error while fetching team statistics' });
  }
});

// Delete team
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user can delete this team
    const canDelete = team.isLead(req.user._id) ||
                     (req.user.organization && req.user.organization.equals(team.organization) && req.user.isOrganizationAdmin()) ||
                     req.user.role === 'super_admin';

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete - mark as inactive
    team.isActive = false;
    await team.save();

    // Remove team from all users' teams array
    await User.updateMany(
      { 'teams.team': team._id },
      { $pull: { teams: { team: team._id } } }
    );

    // TODO: Handle team projects - either reassign or archive

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error while deleting team' });
  }
});

export default router;
