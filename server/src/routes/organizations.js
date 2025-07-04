import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Get all organizations (for super admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    // Only super admins can see all organizations
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const organizations = await Organization.find({ isActive: true })
      .populate('owner', 'name email')
      .populate('admins', 'name email')
      .sort({ createdAt: -1 });

    // Add member count and project count for each organization
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await User.countDocuments({ organization: org._id, isActive: true });
        const teamCount = await Team.countDocuments({ organization: org._id, isActive: true });
        const projectCount = await Project.countDocuments({ organization: org._id, isActive: true });
        
        return {
          ...org.toObject(),
          memberCount,
          teamCount,
          projectCount
        };
      })
    );

    res.json(organizationsWithStats);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ message: 'Server error while fetching organizations' });
  }
});

// Get user's organization
router.get('/my-organization', authenticate, async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(404).json({ message: 'User is not part of any organization' });
    }

    const organization = await Organization.findById(req.user.organization)
      .populate('owner', 'name email avatar')
      .populate('admins', 'name email avatar');

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get user organization error:', error);
    res.status(500).json({ message: 'Server error while fetching organization' });
  }
});

// Get single organization
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id || req.params.id === 'undefined' || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    const organization = await Organization.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('admins', 'name email avatar');

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user has access to this organization
    const hasAccess = await organization.isMember(req.user._id) || 
                     organization.isAdmin(req.user._id) ||
                     req.user.role === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: 'Server error while fetching organization' });
  }
});

// Create new organization
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 2 }).withMessage('Organization name must be at least 2 characters'),
  body('description').optional().trim(),
  body('domain').optional().trim().isLength({ min: 3 }).withMessage('Domain must be at least 3 characters'),
  body('industry').optional().trim(),
  body('size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      domain,
      website,
      industry,
      size,
      address,
      settings
    } = req.body;

    // Check if organization name already exists
    const existingOrg = await Organization.findOne({ name: name.trim() });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization name already exists' });
    }

    // Check if domain already exists (if provided)
    if (domain) {
      const existingDomain = await Organization.findOne({ domain: domain.toLowerCase() });
      if (existingDomain) {
        return res.status(400).json({ message: 'Domain already exists' });
      }
    }

    const organization = new Organization({
      name: name.trim(),
      description,
      domain: domain ? domain.toLowerCase() : undefined,
      website,
      industry,
      size,
      address,
      settings,
      owner: req.user._id,
      admins: [req.user._id], // Owner is also an admin
    });

    await organization.save();

    // Update user to be part of this organization
    await User.findByIdAndUpdate(req.user._id, {
      organization: organization._id,
      userType: 'organization_member',
      role: 'org_admin'
    });

    await organization.populate('owner', 'name email avatar');
    await organization.populate('admins', 'name email avatar');

    res.status(201).json(organization);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ message: 'Server error while creating organization' });
  }
});

// Update organization
router.put('/:id', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
  body('domain').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user is organization admin
    if (!organization.isAdmin(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    
    // Check if name is being changed and if new name exists
    if (updates.name && updates.name !== organization.name) {
      const existingOrg = await Organization.findOne({ name: updates.name.trim() });
      if (existingOrg) {
        return res.status(400).json({ message: 'Organization name already exists' });
      }
    }

    // Check if domain is being changed and if new domain exists
    if (updates.domain && updates.domain !== organization.domain) {
      const existingDomain = await Organization.findOne({ domain: updates.domain.toLowerCase() });
      if (existingDomain) {
        return res.status(400).json({ message: 'Domain already exists' });
      }
    }

    const updatedOrganization = await Organization.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email avatar')
      .populate('admins', 'name email avatar');

    res.json(updatedOrganization);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ message: 'Server error while updating organization' });
  }
});

// Add admin to organization
router.post('/:id/admins', authenticate, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Only organization owner can add admins
    if (!organization.owner.equals(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.body;

    // Check if user exists and is part of the organization
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.organization || !user.organization.equals(organization._id)) {
      return res.status(400).json({ message: 'User is not a member of this organization' });
    }

    // Check if user is already an admin
    if (organization.admins.includes(userId)) {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    organization.admins.push(userId);
    await organization.save();

    // Update user role
    await User.findByIdAndUpdate(userId, { role: 'org_admin' });

    await organization.populate('admins', 'name email avatar');

    res.json(organization);
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({ message: 'Server error while adding admin' });
  }
});

// Remove admin from organization
router.delete('/:id/admins/:userId', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Only organization owner can remove admins
    if (!organization.owner.equals(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId } = req.params;

    // Cannot remove owner
    if (organization.owner.equals(userId)) {
      return res.status(400).json({ message: 'Cannot remove organization owner' });
    }

    organization.admins = organization.admins.filter(admin => !admin.equals(userId));
    await organization.save();

    // Update user role
    await User.findByIdAndUpdate(userId, { role: 'member' });

    await organization.populate('admins', 'name email avatar');

    res.json(organization);
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ message: 'Server error while removing admin' });
  }
});

// Get organization members
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id || req.params.id === 'undefined' || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid organization ID format' });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user has access to this organization
    const hasAccess = await organization.isMember(req.user._id) || 
                     organization.isAdmin(req.user._id) ||
                     req.user.role === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      organization: req.params.id,
      status: { $ne: 'suspended' }
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await User.find(query)
      .select('-password')
      .populate('teams.team', 'name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      members,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Get organization members error:', error);
    res.status(500).json({ message: 'Server error while fetching members' });
  }
});

// Get organization statistics
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user has access to this organization
    const hasAccess = await organization.isMember(req.user._id) || 
                     organization.isAdmin(req.user._id) ||
                     req.user.role === 'super_admin';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [memberCount, teamCount, projectCount] = await Promise.all([
      User.countDocuments({ organization: req.params.id, status: { $ne: 'suspended' } }),
      Team.countDocuments({ organization: req.params.id, isActive: true }),
      Project.countDocuments({ organization: req.params.id, isActive: true })
    ]);

    res.json({
      memberCount,
      teamCount,
      projectCount,
      billingPlan: organization.billing.plan,
      storageUsed: 0, // TODO: Calculate actual storage usage
      storageLimit: organization.billing.storageLimit
    });
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

// Invite members to organization
router.post('/:id/invite', authenticate, [
  body('emails').isArray().withMessage('Emails array is required'),
  body('role').isIn(['member', 'team_lead']).withMessage('Valid role is required'),
  body('message').optional().trim(),
  body('teamAssignments').optional().isArray().withMessage('Team assignments must be an array'),
  body('projectAssignments').optional().isArray().withMessage('Project assignments must be an array'),
  body('invitationContext').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user can invite members
    if (!organization.isAdmin(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { emails, role, message, teamAssignments = [], projectAssignments = [], invitationContext } = req.body;
    const inviteResults = [];

    // Validate team assignments
    if (teamAssignments.length > 0) {
      for (const teamAssignment of teamAssignments) {
        const team = await Team.findById(teamAssignment.team);
        if (!team || !team.organization.equals(organization._id)) {
          return res.status(400).json({ 
            message: `Team ${teamAssignment.team} not found or not part of this organization` 
          });
        }
      }
    }

    // Validate project assignments
    if (projectAssignments.length > 0) {
      for (const projectAssignment of projectAssignments) {
        const project = await Project.findById(projectAssignment.project);
        if (!project || !project.organization.equals(organization._id)) {
          return res.status(400).json({ 
            message: `Project ${projectAssignment.project} not found or not part of this organization` 
          });
        }
      }
    }

    // Validate email service is available
    if (!emailService || typeof emailService.sendInvitationEmail !== 'function') {
      console.error('Email service is not properly configured');
      return res.status(500).json({ message: 'Email service is not available' });
    }

    for (const email of emails) {
      try {
        // Check if user already exists and is part of this organization
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser && existingUser.organization && existingUser.organization.equals(organization._id)) {
          inviteResults.push({
            email,
            status: 'already_member',
            message: 'User is already a member'
          });
          continue;
        }

        // Generate invite token using crypto
        let inviteToken;
        try {
          inviteToken = crypto.randomBytes(32).toString('hex');
        } catch (cryptoError) {
          console.error('Crypto error:', cryptoError);
          throw new Error('Failed to generate invite token');
        }

        const inviteExpires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

        if (existingUser) {
          // Update existing user with pending invitation
          existingUser.pendingInvitation = {
            organization: organization._id,
            role,
            token: inviteToken,
            expires: inviteExpires,
            invitedBy: req.user._id,
            invitedAt: new Date(),
            teamAssignments: teamAssignments.map(assignment => ({
              team: assignment.team,
              role: assignment.role || 'member'
            })),
            projectAssignments: projectAssignments.map(assignment => ({
              project: assignment.project,
              role: assignment.role || 'member'
            })),
            invitationContext,
            message
          };
          await existingUser.save();
        } else {
          // Create pending user record
          const pendingUser = new User({
            email: email.toLowerCase(),
            name: email.split('@')[0], // Temporary name
            status: 'pending',
            verified_email: false,
            // Add a placeholder password that will be replaced when the user accepts the invite
            password: crypto.randomBytes(16).toString('hex'),
            pendingInvitation: {
              organization: organization._id,
              role,
              token: inviteToken,
              expires: inviteExpires,
              invitedBy: req.user._id,
              invitedAt: new Date(),
              teamAssignments: teamAssignments.map(assignment => ({
                team: assignment.team,
                role: assignment.role || 'member'
              })),
              projectAssignments: projectAssignments.map(assignment => ({
                project: assignment.project,
                role: assignment.role || 'member'
              })),
              invitationContext,
              message
            }
          });
          await pendingUser.save();
        }

        // Fetch team and project details for the email
        const teamDetails = await Promise.all(
          teamAssignments.map(async (assignment) => {
            const team = await Team.findById(assignment.team).select('name description');
            return { ...team.toObject(), role: assignment.role || 'member' };
          })
        );

        const projectDetails = await Promise.all(
          projectAssignments.map(async (assignment) => {
            const project = await Project.findById(assignment.project).select('name description');
            return { ...project.toObject(), role: assignment.role || 'member' };
          })
        );

        // Send invitation email with enhanced details
        try {
          await emailService.sendInvitationEmail(
            email,
            organization.name,
            req.user.name,
            inviteToken,
            {
              message,
              invitationContext,
              teamAssignments: teamDetails,
              projectAssignments: projectDetails
            }
          );

          inviteResults.push({
            email,
            status: 'sent',
            message: 'Invitation sent successfully'
          });
        } catch (emailError) {
          console.error(`Failed to send invitation to ${email}:`, emailError);
          inviteResults.push({
            email,
            status: 'failed',
            message: 'Failed to send invitation email'
          });
        }

      } catch (emailError) {
        console.error(`Failed to process invitation for ${email}:`, emailError);
        inviteResults.push({
          email,
          status: 'failed',
          message: 'Failed to process invitation'
        });
      }
    }

    res.json({
      inviteResults,
      message: `Sent ${inviteResults.filter(r => r.status === 'sent').length} invitation(s)`
    });

  } catch (error) {
    console.error('Invite members error:', error);
    res.status(500).json({ message: 'Server error while sending invitations' });
  }
});

export default router;