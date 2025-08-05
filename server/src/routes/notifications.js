import express from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', authenticate, async (req, res) => {
  // Only fetch unseen notifications by default
  // Add query parameter to get all notifications if needed: ?all=true
  const showAll = req.query.all === 'true';
  const filter = showAll ? { user: req.user._id } : { user: req.user._id, seen: false };
  
  const notifications = await Notification.find(filter).sort({ timestamp: -1 });
  res.json(notifications);
});

// Mark notifications as seen
router.post('/mark-seen', authenticate, async (req, res) => {
  const { ids } = req.body; // array of notification IDs
  await Notification.updateMany({ _id: { $in: ids }, user: req.user._id }, { $set: { seen: true } });
  res.json({ success: true });
});




export default router;
