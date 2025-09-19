import express from 'express';
import Account from '../models/Account.js';
import User from '../models/User.js';
import AccountHistory from '../models/accounts/AccountHistory.js';
import auth from '../middleware/auth.js';
import { accountEmailService } from '../services/accountEmailService.js';

const router = express.Router();

/**
 * Calculate days until due for an account entry
 */
function calculateDaysUntilDue(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * GET /api/accounts/reminders
 * Get all account entries with upcoming due dates and send reminders
 */
router.get('/reminders', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find accounts with due dates in the next 5 days
    // Exclude accounts that have been paid (billing date set) within 5 days of due date
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const accounts = await Account.find({
      'defaultFields.dueDate': {
        $gte: new Date(),
        $lte: fiveDaysFromNow
      },
      userId: userId,
      $or: [
        { 'defaultFields.billingDate': { $exists: false } },
        { 
          'defaultFields.billingDate': { 
            $lt: { 
              $subtract: ['$defaultFields.dueDate', 5 * 24 * 60 * 60 * 1000] 
            } 
          } 
        }
      ]
    }).populate('masterTypeId');

    if (accounts.length === 0) {
      return res.json({ message: 'No upcoming due dates found' });
    }

    // Process accounts and add days until due
    const processedEntries = accounts.map(account => ({
      ...account.toObject(),
      daysUntilDue: calculateDaysUntilDue(account.defaultFields.dueDate),
      masterTypeName: account.masterTypeId.name
    }));

    // Send reminder email
    await accountEmailService.sendReminderEmail(
      user.email,
      user.name,
      processedEntries
    );

    // Record reminder history for each entry
    const historyPromises = processedEntries.map(entry => {
      const history = new AccountHistory({
        accountEntryId: entry._id,
        userId: userId,
        action: 'reminder_sent',
        details: {
          daysUntilDue: entry.daysUntilDue,
          emailSentTo: user.email
        }
      });
      return history.save();
    });

    await Promise.all(historyPromises);

    // Get history for each entry
    const entriesWithHistory = await Promise.all(processedEntries.map(async (entry) => {
      const history = await AccountHistory.find({ accountEntryId: entry._id })
        .sort({ createdAt: -1 })
        .limit(5); // Get last 5 history items
      return {
        ...entry,
        history
      };
    }));

    res.json({
      message: 'Reminder email sent successfully',
      entries: entriesWithHistory
    });
  } catch (error) {
    console.error('Error in reminder route:', error);
    res.status(500).json({ message: 'Error processing reminders', error: error.message });
  }
});

/**
 * POST /api/accounts
 * Create a new account entry and send notification
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const account = new Account({
      ...req.body,
      userId: userId
    });

    const savedAccount = await account.save();
    
    // Record creation history
    const history = new AccountHistory({
      accountEntryId: savedAccount._id,
      userId: userId,
      action: 'created',
      details: {
        masterTypeName: req.body.masterTypeName,
        ...savedAccount.defaultFields
      }
    });
    await history.save();
    
    // Send account creation notification
    if (savedAccount) {
      await accountEmailService.sendAccountCreatedEmail(
        user.email,
        user.name,
        {
          ...savedAccount.defaultFields,
          masterTypeName: req.body.masterTypeName
        }
      );

      // Record notification history
      const notificationHistory = new AccountHistory({
        accountEntryId: savedAccount._id,
        userId: userId,
        action: 'reminder_sent',
        details: {
          type: 'creation_notification',
          emailSentTo: user.email
        }
      });
      await notificationHistory.save();
    }

    // Get the history for the new entry
    const entryHistory = await AccountHistory.find({ accountEntryId: savedAccount._id })
      .sort({ createdAt: -1 });

    res.status(201).json({
      ...savedAccount.toObject(),
      history: entryHistory
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Error creating account entry', error: error.message });
  }
});

/**
 * GET /api/accounts/:entryId/history
 * Get history for a specific account entry
 */
router.get('/:entryId/history', auth, async (req, res) => {
  try {
    const { entryId } = req.params;
    const userId = req.user.id;

    // Verify the entry exists and belongs to the user
    const entry = await Account.findOne({
      _id: entryId,
      userId: userId
    });

    if (!entry) {
      return res.status(404).json({ message: 'Account entry not found' });
    }

    // Get entry history
    const history = await AccountHistory.find({ accountEntryId: entryId })
      .sort({ createdAt: -1 });

    res.json({
      entry,
      history
    });
  } catch (error) {
    console.error('Error fetching account history:', error);
    res.status(500).json({ message: 'Error fetching account history', error: error.message });
  }
});

export default router;
