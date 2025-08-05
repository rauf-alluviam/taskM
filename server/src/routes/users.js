import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate, admin } from '../middleware/auth.js';
import { uploadToS3, getSignedUrl } from '../services/s3Service.js';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.memoryStorage();

const avatarFileFilter = (req, file, cb) => {
  // Only allow image files for avatars
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed for avatars.'), false);
  }
};

const avatarUpload = multer({
  storage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, '-password')
      .populate('organization', 'name _id')
      .populate('teams.team', 'name _id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = user.toObject();

    // Generate signed URL for avatar if it exists
    if (user.avatar) {
      try {
        userResponse.avatarUrl = await getSignedUrl(user.avatar);
      } catch (error) {
        console.error('Error generating avatar URL:', error);
        // Don't fail the request if avatar URL generation fails
        userResponse.avatarUrl = null;
      }
    }

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
});

// Update current user profile
router.put('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().trim(),
  body('organization').optional().custom((value) => {
    // Allow null, undefined, or valid ObjectId
    if (value === null || value === undefined || value === '') {
      return true;
    }
    // Check if it's a valid ObjectId format
    if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) {
      return true;
    }
    throw new Error('Organization must be a valid ObjectId or null');
  }),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, mobile, organization } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields with proper validation
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    
    // Handle organization field properly
    if (organization !== undefined) {
      if (organization === null || organization === '') {
        user.organization = null; // Unset organization
      } else {
        user.organization = organization; // Should be a valid ObjectId string
      }
    }
    
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Generate signed URL for avatar if it exists
    if (user.avatar) {
      try {
        userResponse.avatarUrl = await getSignedUrl(user.avatar);
      } catch (error) {
        console.error('Error generating avatar URL:', error);
        userResponse.avatarUrl = null;
      }
    }

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Get all users for member selection (simple API)
router.get('/members-selection', authenticate, async (req, res) => {
  try {
   
    
    // Simple query to get all active users
    const users = await User.find(
      { 
        isActive: { $ne: false },
        status: { $ne: 'suspended' }
      }, 
      'name email avatar role userType organization createdAt'
    )
    .populate('organization', 'name')
    .sort({ name: 1 })
    .limit(100); // Reasonable limit for dropdown

   

    // Generate signed URLs for avatars
    const usersWithAvatars = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (user.avatar) {
          try {
            userObj.avatarUrl = await getSignedUrl(user.avatar);
          } catch (error) {
            console.error('Error generating avatar URL:', error);
            userObj.avatarUrl = null;
          }
        }
        return userObj;
      })
    );

    res.json({
      users: usersWithAvatars,
      count: usersWithAvatars.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Upload avatar for current user
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file provided' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate unique filename for the avatar
    const fileExtension = req.file.originalname.split('.').pop();
    const avatarKey = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    // Upload to S3
    const uploadResult = await uploadToS3(req.file, avatarKey);
    
    // Update user's avatar field with the S3 key
    user.avatar = avatarKey;
    await user.save();

    // Generate signed URL for immediate use
    const avatarUrl = await getSignedUrl(avatarKey);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    userResponse.avatarUrl = avatarUrl;

    res.json({
      message: 'Avatar uploaded successfully',
      user: userResponse,
      avatarUrl
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar', error: error.message });
  }
});

// Get all users (admin only)
router.get('/', authenticate, admin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get enhanced user details with projects and role management
router.get('/enhanced', authenticate, async (req, res) => {
  try {
    let users = [];
    const Project = (await import('../models/Project.js')).default;
    
    if (req.user.role === 'super_admin') {
      users = await User.find({}, '-password')
        .populate('organization', 'name _id')
        .populate('teams.team', 'name _id')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'org_admin' && req.user.organization) {
      users = await User.find({ organization: req.user.organization }, '-password')
        .populate('organization', 'name _id')
        .populate('teams.team', 'name _id')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: 'Not authorized to view user management' });
    }

    // Enhanced user data with project information
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        // Find projects where user is involved
        const projects = await Project.find({
          $or: [
            { createdBy: user._id },
            { 'members.user': user._id }
          ],
          isActive: true
        }, 'name _id createdBy members.user members.role status department')
          .populate('createdBy', 'name _id')
          .lean();

        // Add project information with detailed roles
        userObj.projects = projects.map(project => {
          let role = 'member';
          let joinedAt = null;
          
          if (project.createdBy._id.toString() === user._id.toString()) {
            role = 'owner';
          } else {
            const member = project.members.find(m => m.user.toString() === user._id.toString());
            if (member) {
              role = member.role;
              joinedAt = member.addedAt;
            }
          }
          
          return {
            _id: project._id,
            name: project.name,
            role: role,
            status: project.status,
            department: project.department,
            isOwner: project.createdBy._id.toString() === user._id.toString(),
            joinedAt: joinedAt
          };
        });

        // Add project statistics
        userObj.projectStats = {
          total: userObj.projects.length,
          owned: userObj.projects.filter(p => p.isOwner).length,
          adminOf: userObj.projects.filter(p => p.role === 'admin').length,
          memberOf: userObj.projects.filter(p => p.role === 'member').length
        };

        // Generate signed URL for avatar if it exists
        if (user.avatar) {
          try {
            userObj.avatarUrl = await getSignedUrl(user.avatar);
          } catch (error) {
            console.error('Error generating avatar URL:', error);
            userObj.avatarUrl = null;
          }
        }

        return userObj;
      })
    );

    res.json(enhancedUsers);
  } catch (error) {
    console.error('Enhanced users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch enhanced user data', error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = user.toObject();

    // Generate signed URL for avatar if it exists
    if (user.avatar) {
      try {
        userResponse.avatarUrl = await getSignedUrl(user.avatar);
      } catch (error) {
        console.error('Error generating avatar URL:', error);
        userResponse.avatarUrl = null;
      }
    }

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Create new user (admin only)
router.post('/', authenticate, admin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password, role });
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

// Update user
router.put('/:id', authenticate, [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['super_admin', 'org_admin', 'team_lead', 'member', 'viewer']).withMessage('Valid role is required'),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('Valid status is required'),
  body('organization').optional().custom((value) => {
    // Allow null, undefined, or valid ObjectId
    if (value === null || value === undefined || value === '') {
      return true;
    }
    // Check if it's a valid ObjectId format
    if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) {
      return true;
    }
    throw new Error('Organization must be a valid ObjectId or null');
  }),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, mobile, organization, role, status } = req.body;
    const userId = req.params.id;

    // Fetch user to update
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Permission logic
    const isSelf = req.user._id.toString() === userId;
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOrgAdmin = req.user.role === 'org_admin';
    
    // Handle both populated and unpopulated organization field for comparison
    let currentUserOrg = req.user.organization;
    let targetUserOrg = user.organization;
    
    // Convert to string if it's an object with _id
    if (currentUserOrg && typeof currentUserOrg === 'object' && currentUserOrg._id) {
      currentUserOrg = currentUserOrg._id.toString();
    } else if (currentUserOrg) {
      currentUserOrg = currentUserOrg.toString();
    }
    
    if (targetUserOrg && typeof targetUserOrg === 'object' && targetUserOrg._id) {
      targetUserOrg = targetUserOrg._id.toString();
    } else if (targetUserOrg) {
      targetUserOrg = targetUserOrg.toString();
    }
    
    // For organization admins, they can update users in their organization
    // or users without an organization (individual users they might be managing)
    const canOrgAdminUpdate = isOrgAdmin && (
      (currentUserOrg && targetUserOrg && currentUserOrg === targetUserOrg) ||
      (!targetUserOrg) // Org admin can manage individual users
    );

    if (!isSelf && !isSuperAdmin && !canOrgAdminUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    
    // Handle organization field properly
    if (organization !== undefined && (isSuperAdmin || canOrgAdminUpdate)) {
      if (organization === null || organization === '') {
        user.organization = null; // Unset organization
      } else {
        user.organization = organization; // Should be a valid ObjectId string
      }
    }
    
    // Only super_admin or org_admin can change roles, and only within their org
    if (role && (isSuperAdmin || canOrgAdminUpdate)) user.role = role;
    // Only super_admin or org_admin can change status, and only within their org
    if (status && (isSuperAdmin || canOrgAdminUpdate)) user.status = status;

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Generate signed URL for avatar if it exists
    if (user.avatar) {
      try {
        userResponse.avatarUrl = await getSignedUrl(user.avatar);
      } catch (error) {
        console.error('Error generating avatar URL:', error);
        userResponse.avatarUrl = null;
      }
    }

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Validate assignable users
router.post('/validate-assignable', authenticate, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds array is required' });
    }
    
    // Remove duplicates and validate format
    const uniqueUserIds = [...new Set(userIds)];
    const validObjectIds = uniqueUserIds.filter(id => 
      id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
    );
    
    if (validObjectIds.length !== uniqueUserIds.length) {
      return res.json({
        valid: false,
        invalidUsers: uniqueUserIds.filter(id => 
          !id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)
        ),
        message: 'Some user IDs are not valid ObjectIds'
      });
    }
    
    // Check if users exist and are assignable
    const users = await User.find(
      { _id: { $in: validObjectIds } },
      '_id name email status role isActive'
    );
    
    const foundUserIds = users.map(u => u._id.toString());
    const notFoundUserIds = validObjectIds.filter(id => !foundUserIds.includes(id));
    
    // Check for inactive or non-assignable users
    const inactiveUsers = users
      .filter(u => u.status !== 'active' || u.isActive === false || u.role === 'viewer')
      .map(u => u._id.toString());
    
    const isValid = notFoundUserIds.length === 0 && inactiveUsers.length === 0;
    
    const response = {
      valid: isValid,
      totalRequested: userIds.length,
      validUsers: users
        .filter(u => u.status === 'active' && u.isActive !== false && u.role !== 'viewer')
        .map(u => ({ _id: u._id, name: u.name, email: u.email }))
    };
    
    if (notFoundUserIds.length > 0) {
      response.invalidUsers = notFoundUserIds;
    }
    
    if (inactiveUsers.length > 0) {
      response.inactiveUsers = inactiveUsers;
    }
    
    if (!isValid) {
      response.message = 'Some users cannot be assigned to tasks';
    }
    
    res.json(response);
  } catch (error) {
    console.error('Validate assignable users error:', error);
    res.status(500).json({ message: 'Server error while validating users' });
  }
});

// Get all users by organization (super_admin or org_admin only)
router.get('/by-organization/:orgId', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOrgAdmin = req.user.role === 'org_admin';
    // Handle both populated and unpopulated organization field
    let userOrg = req.user.organization;
    if (userOrg && typeof userOrg === 'object' && userOrg._id) {
      userOrg = userOrg._id.toString();
    } else if (userOrg) {
      userOrg = userOrg.toString();
    }
    // Log types and values for debugging

    // if (!isSuperAdmin && !(isOrgAdmin && userOrg === orgId)) {
    //   return res.status(403).json({ message: 'Not authorized to view users for this organization' });
    // }
    const users = await User.find({ organization: orgId }, '-password')
      .populate('organization', 'name _id')
      .populate('teams.team', 'name _id')
      .sort({ createdAt: -1 });

    // Get project information for each user
    const Project = (await import('../models/Project.js')).default;
    const usersWithProjects = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        // Find projects where user is a member or creator
        const projects = await Project.find({
          $or: [
            { createdBy: user._id },
            { 'members.user': user._id }
          ],
          isActive: true
        }, 'name _id createdBy members.user members.role')
          .populate('createdBy', 'name _id')
          .lean();

        // Add project information with roles
        userObj.projects = projects.map(project => {
          let role = 'member';
          if (project.createdBy._id.toString() === user._id.toString()) {
            role = 'owner';
          } else {
            const member = project.members.find(m => m.user.toString() === user._id.toString());
            if (member) {
              role = member.role;
            }
          }
          return {
            _id: project._id,
            name: project.name,
            role: role,
            isOwner: project.createdBy._id.toString() === user._id.toString()
          };
        });

        // Generate signed URL for avatar if it exists
        if (user.avatar) {
          try {
            userObj.avatarUrl = await getSignedUrl(user.avatar);
          } catch (error) {
            console.error('Error generating avatar URL:', error);
            userObj.avatarUrl = null;
          }
        }

        return userObj;
      })
    );

    res.json(usersWithProjects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users by organization', error: error.message });
  }
});

export default router;
