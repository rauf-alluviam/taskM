import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get user settings
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user settings (you can extend this with a separate Settings model)
    const settings = {
      profile: {
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
      },
      notifications: user.settings?.notifications || {
        emailNotifications: true,
        pushNotifications: false,
        taskReminders: true,
        projectUpdates: true,
      },
      preferences: user.settings?.preferences || {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
      },
      privacy: user.settings?.privacy || {
        profileVisible: true,
        activityVisible: false,
        allowAnalytics: true,
      },
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

// Update user settings
router.put('/', protect, async (req, res) => {
  try {
    const { profile, notifications, preferences, privacy } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile information
    if (profile) {
      if (profile.name) user.name = profile.name;
      if (profile.email) user.email = profile.email;
      if (profile.avatar) user.avatar = profile.avatar;
    }

    // Update settings
    if (!user.settings) {
      user.settings = {};
    }
    
    if (notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...notifications };
    }
    
    if (preferences) {
      user.settings.preferences = { ...user.settings.preferences, ...preferences };
    }
    
    if (privacy) {
      user.settings.privacy = { ...user.settings.privacy, ...privacy };
    }

    await user.save();

    // Return updated settings without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Settings updated successfully',
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

export default router;
