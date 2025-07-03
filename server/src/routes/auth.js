import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import emailService from '../services/emailService.js';

const router = express.Router();

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
      process.env.JWT_SECRET || 'fallback-secret',
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
      process.env.JWT_SECRET || 'fallback-secret',
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

export default router;