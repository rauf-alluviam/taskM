import express from 'express';
import multer from 'multer';
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
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, email, mobile, organization } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (organization !== undefined) user.organization = organization;    await user.save();

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
    console.log('Getting all users for member selection');
    
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

    console.log(`Found ${users.length} users`);

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
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, email, mobile, organization, role } = req.body;
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
    const sameOrg = req.user.organization && user.organization && req.user.organization.toString() === user.organization.toString();

    if (!isSelf && !isSuperAdmin && !(isOrgAdmin && sameOrg)) {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (organization !== undefined && (isSuperAdmin || (isOrgAdmin && sameOrg))) user.organization = organization;
    // Only super_admin or org_admin can change roles, and only within their org
    if (role && (isSuperAdmin || (isOrgAdmin && sameOrg))) user.role = role;

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
    console.log('[UserOrg Debug]', {
      orgId, orgIdType: typeof orgId, userOrg, userOrgType: typeof userOrg, role: req.user.role
    });
    if (!isSuperAdmin && !(isOrgAdmin && userOrg === orgId)) {
      return res.status(403).json({ message: 'Not authorized to view users for this organization' });
    }
    const users = await User.find({ organization: orgId }, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users by organization', error: error.message });
  }
});

export default router;
