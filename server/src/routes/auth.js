import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import emailService from '../services/emailService.js';

const router = express.Router();

// Validate JWT_SECRET on module load
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
], async (req, res) => {
  try {
    console.log('📝 Registration request:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role = 'member' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: ['admin', 'manager', 'member', 'viewer'].includes(role) ? role : 'member',
      verified_email: false, // Explicitly set to false (though it's the default)
    });

    // Generate secure random email verification token
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    console.log(`📧 Sending verification email to ${user.email}...`);
    try {
      // Send verification email
      await emailService.sendVerificationEmail(user.email, token);
      console.log(`✅ Verification email sent to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Delete the user if email sending fails to maintain data consistency
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again.',
        error: emailError.message 
      });
    }

    // DO NOT generate JWT token for unverified users
    // They must verify email first before they can log in
    
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      email: user.email,
      verificationSent: true,
      // No token provided - user must verify email first
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email })
      .populate('organization', 'name _id')
      .populate('teams.team', 'name _id');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.verified_email) {
      return res.status(403).json({
        message: 'Your email is not verified. Please verify to continue.',
        resend: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Verify token
router.get('/verify', authenticate, async (req, res) => {
  res.json(req.user);
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  res.json(req.user);
});

// Update profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('department').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, department } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (department) updates.department = department;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// Email verification route
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Invalid or missing token.' });
    }
    
    // Find user with valid token
    const user = await User.findOne({ 
      emailVerificationToken: token, 
      emailVerificationTokenExpires: { $gt: Date.now() } 
    });
    
    if (!user) {
      // Check if token exists but expired
      const expiredUser = await User.findOne({ emailVerificationToken: token });
      if (expiredUser) {
        return res.status(400).json({ 
          message: 'Verification token has expired. Please request a new one.',
          expired: true
        });
      }
      return res.status(400).json({ message: 'Invalid verification token.' });
    }
    
    // Mark email as verified
    user.verified_email = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    
    // Generate a JWT token so the user can be logged in immediately
    const tokenJWT = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: 'Email verified successfully. You can now log in.',
      verified: true,
      token: tokenJWT
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Server error during email verification.' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    console.log('📧 Resend verification email request:', req.body);
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.verified_email) return res.status(400).json({ message: 'Email already verified.' });
    
   

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    
    // Try to send verification email before saving the token
    try {
      console.log(`📧 Sending verification email to ${user.email}...`);
      await emailService.sendVerificationEmail(user.email, token);
      console.log(`✅ Verification email sent to ${user.email}`);
      
      // Only save the token if the email was sent successfully
      await user.save();
      
      res.json({ 
        message: 'Verification email sent successfully.',
        expiresAt: user.emailVerificationTokenExpires,
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      res.status(500).json({ 
        message: 'Failed to send verification email',
        error: emailError.message,
        // Don't apply rate limiting for server errors
        //canRetryImmediately: true
      });
    }
  } catch (error) {
    console.error('❌ Error resending verification email:', error);
    res.status(500).json({ 
      message: 'Failed to resend verification email',
      error: error.message,
      // Don't apply rate limiting for server errors
      canRetryImmediately: true
    });
  }
});

// Accept invitation
router.post('/accept-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;
    console.log('🎯 Accepting invitation with token:', token.substring(0, 8) + '...');

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Find user with pending invitation
    console.log(`🔍 Looking for invitation token: ${token.substring(0, 8)}...`);
    const user = await User.findOne({
      'pendingInvitation.token': token,
      'pendingInvitation.expires': { $gt: new Date() }
    }).populate('pendingInvitation.organization', 'name')
      .populate('pendingInvitation.invitedBy', 'name email');

    if (!user) {
      console.log('❌ No user found with valid invitation token for acceptance');
      
      // Check if token exists but expired
      const expiredUser = await User.findOne({ 'pendingInvitation.token': token });
      if (expiredUser) {
        console.log('⏰ Token found but expired during acceptance:', {
          email: expiredUser.email,
          expired: new Date(expiredUser.pendingInvitation.expires),
          now: new Date()
        });
        return res.status(400).json({ message: 'Invitation token has expired' });
      }
      
      console.log('🔍 Token not found in database - checking for partial matches...');
      const allTokens = await User.find(
        { 'pendingInvitation.token': { $exists: true } }, 
        { email: 1, 'pendingInvitation.token': 1 }
      );
      console.log(`📊 Found ${allTokens.length} pending invitations in database`);
      
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    console.log(`✅ Found valid invitation for user: ${user.email}`);

    console.log('✅ Processing invitation acceptance for user:', user.email);

    const Organization = (await import('../models/Organization.js')).default;
    const organization = await Organization.findById(user.pendingInvitation.organization);
    
    if (!organization) {
      return res.status(400).json({ message: 'Organization no longer exists' });
    }

    // Update user with invitation details
    user.name = name;
    user.password = password;
    user.organization = user.pendingInvitation.organization;
    user.role = user.pendingInvitation.role;
    user.userType = 'organization_member';
    user.status = 'active';
    user.verified_email = true; // Auto-verify invited users
    
    // Store team and project assignments for processing
    const teamAssignments = user.pendingInvitation.teamAssignments || [];
    const projectAssignments = user.pendingInvitation.projectAssignments || [];
    
    user.pendingInvitation = undefined;
    await user.save();

    // Process team assignments
    const Team = (await import('../models/Team.js')).default;
    const assignedTeams = [];
    
    for (const assignment of teamAssignments) {
      try {
        const team = await Team.findById(assignment.team);
        if (team) {
          // Add user to team
          if (!team.isMember(user._id)) {
            team.addMember(user._id, assignment.role);
            await team.save();
          }
          
          // Add team to user's teams array
          user.teams.push({
            team: team._id,
            role: assignment.role,
            joinedAt: new Date()
          });
          
          assignedTeams.push({
            _id: team._id,
            name: team.name,
            role: assignment.role
          });
        }
      } catch (error) {
        console.error(`Error assigning user to team ${assignment.team}:`, error);
      }
    }

    // Process project assignments
    const Project = (await import('../models/Project.js')).default;
    const assignedProjects = [];
    
    for (const assignment of projectAssignments) {
      try {
        const project = await Project.findById(assignment.project);
        if (project) {
          // Add user to project
          if (!project.isMember(user._id)) {
            project.addMember(user._id, assignment.role, user.pendingInvitation?.invitedBy);
            await project.save();
          }
          
          assignedProjects.push({
            _id: project._id,
            name: project.name,
            role: assignment.role
          });
        }
      } catch (error) {
        console.error(`Error assigning user to project ${assignment.project}:`, error);
      }
    }

    // Save user with team assignments
    await user.save();

    // Generate JWT token
    const authToken = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data and token with assignment details
    const userResponse = await User.findById(user._id, '-password')
      .populate('organization', 'name _id')
      .populate('teams.team', 'name _id');

    res.json({
      token: authToken,
      user: userResponse,
      message: `Welcome to ${organization.name}!`,
      assignments: {
        teams: assignedTeams,
        projects: assignedProjects
      },
      onboarding: {
        showWelcome: true,
        hasTeamAssignments: assignedTeams.length > 0,
        hasProjectAssignments: assignedProjects.length > 0
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Server error while accepting invitation' });
  }
});

// Get invitation details
router.get('/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log('🔍 Looking up invitation token:', token.substring(0, 8) + '...');

    const user = await User.findOne({
      'pendingInvitation.token': token,
      'pendingInvitation.expires': { $gt: new Date() }
    }).populate('pendingInvitation.organization', 'name description')
      .populate('pendingInvitation.invitedBy', 'name email')
      .populate('pendingInvitation.teamAssignments.team', 'name description')
      .populate('pendingInvitation.projectAssignments.project', 'name description');

    if (!user) {
      console.log('❌ No user found with valid invitation token for details');
      
      // Check if token exists but expired
      const expiredUser = await User.findOne({ 'pendingInvitation.token': token });
      if (expiredUser) {
        console.log('⏰ Token found but expired during details lookup:', {
          email: expiredUser.email,
          expired: new Date(expiredUser.pendingInvitation.expires),
          now: new Date()
        });
        return res.status(400).json({ message: 'Invitation token has expired' });
      }
      
      console.log('🔍 Token not found in database during details lookup');
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }

    console.log(`✅ Found invitation details for user: ${user.email}`);
    res.json({
      email: user.email,
      organization: user.pendingInvitation.organization,
      role: user.pendingInvitation.role,
      invitedBy: user.pendingInvitation.invitedBy,
      invitedAt: user.pendingInvitation.invitedAt,
      teamAssignments: user.pendingInvitation.teamAssignments || [],
      projectAssignments: user.pendingInvitation.projectAssignments || [],
      invitationContext: user.pendingInvitation.invitationContext,
      message: user.pendingInvitation.message
    });
  } catch (error) {
    console.error('Get invitation details error:', error);
    res.status(500).json({ message: 'Server error while fetching invitation details' });
  }
});

export default router;