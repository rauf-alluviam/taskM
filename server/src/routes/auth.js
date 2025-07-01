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
      role: ['admin', 'manager', 'member'].includes(role) ? role : 'member',
    });

    // Generate email verification token
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 hour
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, token);

    // Generate JWT token
    const tokenJWT = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully. Please verify your email.',
      user: user.toJSON(),
      token,
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
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Invalid or missing token.' });
  const user = await User.findOne({ emailVerificationToken: token, emailVerificationTokenExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });
  user.verified_email = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpires = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully. You can now log in.' });
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.verified_email) return res.status(400).json({ message: 'Email already verified.' });
  // Limit resend: only allow if last token expired or not sent in last 5 min
  if (user.emailVerificationTokenExpires && user.emailVerificationTokenExpires > Date.now() && user.emailVerificationToken) {
    const timeLeft = user.emailVerificationTokenExpires - Date.now();
    if (timeLeft > 1000 * 60 * 5) {
      return res.status(429).json({ message: 'Please wait before requesting another verification email.' });
    }
  }
  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = token;
  user.emailVerificationTokenExpires = Date.now() + 1000 * 60 * 60; // 1 hour
  await user.save();
  await emailService.sendVerificationEmail(user.email, token);
  res.json({ message: 'Verification email resent.' });
});

export default router;