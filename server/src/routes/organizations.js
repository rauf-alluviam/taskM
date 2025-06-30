import express from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

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

    res.json(organizations);
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

// Delete organization (owner only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Only organization owner can delete
    if (!organization.owner.equals(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // TODO: Implement soft delete and data cleanup
    // For now, just mark as inactive
    organization.isActive = false;
    await organization.save();

    // Update all members to individual users
    await User.updateMany(
      { organization: req.params.id },
      { 
        $unset: { organization: 1 },
        $set: { 
          userType: 'individual',
          role: 'member'
        }
      }
    );

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ message: 'Server error while deleting organization' });
  }
});

export default router;
