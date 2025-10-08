import express from "express";
import AccountEntry from "../../models/accounts/AccountEntry.js";
import User from "../../models/User.js";
import AccountHistory from "../../models/accounts/AccountHistory.js";
import cron from "node-cron";
import { accountEmailService } from "../../services/accountEmailService.js";
import { authenticate } from "../../middleware/auth.js";

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
 * Check if reminder should be sent based on frequency and days until due
 */
function checkReminderFrequency(reminderFrequency, daysUntilDue) {
  switch (reminderFrequency) {
    case 'weekly':
      return daysUntilDue % 7 === 0 || daysUntilDue <= 5;
    case 'monthly':
      return daysUntilDue % 30 === 0 || daysUntilDue <= 5;
    case 'quarterly':
      return daysUntilDue % 90 === 0 || daysUntilDue <= 5;
    case 'half-yearly':
      return daysUntilDue % 180 === 0 || daysUntilDue <= 5;
    case 'yearly':
      return daysUntilDue % 365 === 0 || daysUntilDue <= 5;
    default: // 'monthly' as default
      return daysUntilDue <= 5;
  }
}

/**
 * Function to check and send due date reminders to entry creators
 */
const checkAndSendReminders = async () => {
  try {
    console.log("🔍 Starting automatic due date reminder check...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all account entries that:
    // 1. Have due dates in the next 5 days
    // 2. Don't have billing dates set (if billing date exists, don't send reminder)
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    
    const entriesNeedingReminders = await AccountEntry.find({
      "defaultFields.dueDate": {
        $gte: today,
        $lte: fiveDaysFromNow
      },
      "defaultFields.billingDate": { $exists: false }, // Only send reminders if billing date is not set
    })
    .populate('createdBy', 'name email')
    .populate('masterTypeId');

    if (entriesNeedingReminders.length === 0) {
      console.log('✅ No entries need reminders at this time');
      return { success: true, message: 'No reminders needed' };
    }

    console.log(`📊 Found ${entriesNeedingReminders.length} entries needing reminders`);

    // Group entries by creator
    const entriesByCreator = {};
    entriesNeedingReminders.forEach(entry => {
      if (entry.createdBy && entry.createdBy.email) {
        const creatorId = entry.createdBy._id.toString();
        if (!entriesByCreator[creatorId]) {
          entriesByCreator[creatorId] = {
            user: entry.createdBy,
            entries: []
          };
        }
        
        const daysUntilDue = calculateDaysUntilDue(entry.defaultFields.dueDate);
        
        // Check if reminder should be sent based on reminder frequency
        const shouldSendReminder = checkReminderFrequency(entry.defaultFields.reminder, daysUntilDue);
        
        if (shouldSendReminder) {
          entriesByCreator[creatorId].entries.push({
            ...entry.toObject(),
            daysUntilDue
          });
        }
      }
    });

    const results = [];

    // Send emails to each creator using accountEmailService
    for (const creatorId in entriesByCreator) {
      const creatorData = entriesByCreator[creatorId];
      
      if (creatorData.entries.length > 0) {
        try {
          // Use accountEmailService instead of direct transporter
          await accountEmailService.sendReminderEmail(
            creatorData.user.email,
            creatorData.user.name,
            creatorData.entries
          );

          results.push({
            success: true, 
            userEmail: creatorData.user.email,
            userName: creatorData.user.name,
            entriesCount: creatorData.entries.length
          });

          // Record reminder history for each entry
          const historyPromises = creatorData.entries.map(entry => {
            const history = new AccountHistory({
              accountEntryId: entry._id,
              userId: creatorId,
              action: 'reminder_sent',
              details: {
                daysUntilDue: entry.daysUntilDue,
                emailSentTo: creatorData.user.email,
                masterTypeName: entry.masterTypeName,
                companyName: entry.defaultFields.companyName,
                reminderFrequency: entry.defaultFields.reminder
              }
            });
            return history.save();
          });

          await Promise.all(historyPromises);

          // Add delay between emails to avoid overwhelming the email service
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error sending email to ${creatorData.user.email}:`, error.message);
          results.push({
            success: false,
            userEmail: creatorData.user.email,
            userName: creatorData.user.name,
            error: error.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ Reminder check completed: ${successCount} emails sent successfully, ${failureCount} failed`);
    
    return {
      success: true,
      totalEntriesChecked: entriesNeedingReminders.length,
      emailsSent: successCount,
      emailsFailed: failureCount,
      results
    };

  } catch (error) {
    console.error('❌ Error in automatic reminder check:', error);
    return { success: false, error: error.message };
  }
};

// Manual trigger endpoint (for testing)
router.post("/trigger-reminders", async (req, res) => {
  try {
    console.log("🧪 Manual reminder trigger initiated");
    const result = await checkAndSendReminders();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in manual reminder trigger:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for specific user
router.post("/reminders/test", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's entries that would trigger reminders
    const today = new Date();
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const testEntries = await AccountEntry.find({
      createdBy: userId,
      "defaultFields.dueDate": {
        $gte: today,
        $lte: fiveDaysFromNow
      },
      "defaultFields.billingDate": { $exists: false }
    })
    .populate('masterTypeId')
    .limit(5);

    if (testEntries.length === 0) {
      return res.json({ 
        success: true, 
        message: "No test entries found for reminders",
        note: "Create entries with due dates in the next 5 days and no billing date to test reminders"
      });
    }

    const processedEntries = testEntries.map(entry => ({
      ...entry.toObject(),
      daysUntilDue: calculateDaysUntilDue(entry.defaultFields.dueDate)
    }));

    // Send test email using accountEmailService
    await accountEmailService.sendReminderEmail(
      user.email,
      user.name,
      processedEntries
    );

    res.json({
      success: true,
      message: "Test reminder sent successfully",
      testEntries: processedEntries.length,
      user: user.email
    });
  } catch (error) {
    console.error("Error in test reminder:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test reminder",
      error: error.message,
    });
  }
});

// Get reminder status endpoint
router.get("/reminder-status", async (req, res) => {
  try {
    const users = await User.find({
      status: "active",
      organization: { $exists: true, $ne: null },
    }).populate("organization");

    const organizations = await User.aggregate([
      {
        $match: {
          status: "active",
          organization: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$organization", userCount: { $sum: 1 } } },
      {
        $lookup: {
          from: "organizations",
          localField: "_id",
          foreignField: "_id",
          as: "orgDetails",
        },
      },
    ]);

    const today = new Date();
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const masterEntries = await AccountEntry.find({
      "defaultFields.dueDate": {
        $gte: today,
        $lte: fiveDaysFromNow
      },
      "defaultFields.billingDate": { $exists: false }
    });

    const totalEntries = await AccountEntry.countDocuments();

    const overdueEntries = await AccountEntry.find({
      "defaultFields.dueDate": {
        $lt: today
      },
      "defaultFields.billingDate": { $exists: false }
    });

    res.status(200).json({
      totalUsers: users.length,
      totalOrganizations: organizations.length,
      organizations: organizations.map((org) => ({
        name: org.orgDetails[0]?.name || "Unknown",
        userCount: org.userCount,
      })),
      totalEntries: totalEntries,
      upcomingDueDates: masterEntries.length,
      overdueEntries: overdueEntries.length,
      nextReminderCheck: "9:00 AM daily IST",
      systemStatus: "active",
      currentTime: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test email endpoint using accountEmailService
router.get("/test-email-now", async (req, res) => {
  try {
    // Create a test entry for the email
    const testEntries = [{
      defaultFields: {
        companyName: "Test Company",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        reminder: "monthly"
      },
      masterTypeName: "GST Returns",
      daysUntilDue: 3
    }];

    await accountEmailService.sendReminderEmail(
      "intern@novusha.com",
      "Test User",
      testEntries
    );

    res.status(200).json({
      success: true,
      message: "Test email sent successfully using accountEmailService",
      recipientEmail: "intern@novusha.com",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});



// Optional: Test cron that runs every minute (for testing only - remove in production)
cron.schedule("* * * * *", async () => {
  console.log(
    "🧪 Test reminder check at:",
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  );
  await checkAndSendReminders();
}, {
  timezone: "Asia/Kolkata",
});

console.log(
  "📧 Due Date Reminder System initialized - Daily checks at 9:00 AM IST"
);


// Automatic daily reminder system using cron
// Runs every day at 9:00 AM IST
// cron.schedule(
//   "0 9 * * *",
//   async () => {
//     console.log(
//       "⏰ Scheduled reminder check triggered at:",
//       new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//     );
//     await checkAndSendReminders();
//   },
//   {
//     timezone: "Asia/Kolkata",
//   }
// );

// Optional: Test cron that runs every minute (for testing only - remove in production)
cron.schedule(
  "* * * * *",
  async () => {
    console.log(
      "🧪 Test reminder check at:",
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    );
    await checkAndSendReminders();
  },
  {
    timezone: "Asia/Kolkata",
  }
);

console.log(
  "📧 Due Date Reminder System initialized - Daily checks at 9:00 AM IST"
);

export default router;
