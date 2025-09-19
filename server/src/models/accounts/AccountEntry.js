// model/accounts/AccountEntry.js
import mongoose from 'mongoose';

// Helper function to calculate next reminder date
function calculateNextReminder(frequency, baseDate) {
  const date = new Date(baseDate);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'half-yearly':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

const accountEntrySchema = new mongoose.Schema({
  masterTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterType',
    required: true
  },
  masterTypeName: {
    type: String,
    required: true
  },
  defaultFields: {
    companyName: {
      value: {
        type: String,
        required: true,
        trim: true
      },
      lastUpdated: Date
    },
    address: {
      value: {
        type: String,
        trim: true
      },
      lastUpdated: Date
    },
    billingDate: {
      value: Date,
      lastUpdated: Date
    },
    dueDate: {
      value: Date,
      lastUpdated: Date
    },
    reminder: {
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
        default: 'monthly'
      },
      lastSent: Date,
      nextReminder: Date
    }
  },
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'upload', 'select', 'boolean'],
      default: 'text'
    },
    lastUpdated: Date
  }],
  status: {
    current: {
      type: String,
      enum: ['pending', 'due_soon', 'overdue', 'completed'],
      default: 'pending'
    },
    history: [{
      status: {
        type: String,
        enum: ['pending', 'due_soon', 'overdue', 'completed']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  timeline: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'status_changed', 'reminder_sent', 'completed'],
      required: true
    },
    details: mongoose.Schema.Types.Mixed,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  reminderStatus: {
    shouldSendReminder: {
      type: Boolean,
      default: true
    },
    lastSentDate: Date,
    nextReminderDate: Date
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    lastActivity: Date
  },
  attachments: [{
    name: String,
    path: String,
    type: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better query performance
accountEntrySchema.index({ masterTypeName: 1, 'status.current': 1 });
accountEntrySchema.index({ 'defaultFields.companyName.value': 1 });
accountEntrySchema.index({ 'defaultFields.dueDate.value': 1 });
accountEntrySchema.index({ createdAt: -1 });

// Pre-save middleware
accountEntrySchema.pre('save', function(next) {
  const now = new Date();
  
  // Update version and timestamps
  if (this.isModified() && !this.isNew) {
    this.metadata.version += 1;
  }
  this.updatedAt = now;
  this.metadata.lastActivity = now;

  // Calculate status based on due date
  if (this.defaultFields.dueDate.value) {
    const dueDate = new Date(this.defaultFields.dueDate.value);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let newStatus;
    if (daysUntilDue < 0) {
      newStatus = 'overdue';
    } else if (daysUntilDue <= 5) {
      newStatus = 'due_soon';
    } else {
      newStatus = 'pending';
    }

    // Only update status if it has changed
    if (newStatus !== this.status.current) {
      this.status.current = newStatus;
      this.status.history.push({
        status: newStatus,
        timestamp: now,
        updatedBy: this.metadata.updatedBy
      });
    }
  }

  // Calculate reminder status and next reminder date
  if (this.defaultFields.dueDate.value) {
    const dueDate = new Date(this.defaultFields.dueDate.value);
    const billingDate = this.defaultFields.billingDate.value;
    const today = new Date();
    
    // Calculate days until due
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Set reminder for 5 days before due date
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 5);
    
    // Check if billing date exists and is within 5 days of due date
    if (billingDate) {
      const daysBetweenBillingAndDue = Math.ceil(
        (dueDate - new Date(billingDate)) / (1000 * 60 * 60 * 24)
      );
      
      // If paid within 5 days of due date, don't send reminder
      if (daysBetweenBillingAndDue <= 5) {
        this.reminderStatus.shouldSendReminder = false;
      }
    }
    
    // Set next reminder date if not already set
    if (!this.reminderStatus.nextReminderDate) {
      this.reminderStatus.nextReminderDate = reminderDate;
    }
  }

  next();
});

// Instance methods
accountEntrySchema.methods.addTimeline = function(action, userId, details = {}) {
  this.timeline.push({
    action,
    userId,
    details,
    timestamp: new Date()
  });
};

accountEntrySchema.methods.updateStatus = function(newStatus, userId) {
  const now = new Date();
  this.status.current = newStatus;
  this.status.history.push({
    status: newStatus,
    timestamp: now,
    updatedBy: userId
  });
  this.addTimeline('status_changed', userId, { oldStatus: this.status.current, newStatus });
};

accountEntrySchema.methods.recordReminder = function(userId) {
  const now = new Date();
  this.reminderStatus.lastSentDate = now;
  this.addTimeline('reminder_sent', userId, {
    dueDate: this.defaultFields.dueDate.value,
    billingStatus: this.defaultFields.billingDate.value ? 'billed' : 'pending'
  });
};

// Static methods
accountEntrySchema.statics.findDueSoon = function() {
  const now = new Date();
  const fiveDaysFromNow = new Date(now.setDate(now.getDate() + 5));
  
  return this.find({
    'defaultFields.dueDate.value': { 
      $gte: new Date(), 
      $lte: fiveDaysFromNow 
    },
    'status.current': { $ne: 'completed' }
  }).sort('defaultFields.dueDate.value');
};

accountEntrySchema.statics.findOverdue = function() {
  return this.find({
    'defaultFields.dueDate.value': { $lt: new Date() },
    'status.current': { $ne: 'completed' }
  }).sort('defaultFields.dueDate.value');
};

accountEntrySchema.statics.findNeedingReminders = function() {
  const now = new Date();
  return this.find({
    // Entry due date is in the future
    'defaultFields.dueDate.value': { $gt: now },
    // Reminder date is today or has passed
    'reminderStatus.nextReminderDate': { $lte: now },
    // Reminder hasn't been sent yet
    'reminderStatus.lastSentDate': { $exists: false },
    // Should send reminder is true
    'reminderStatus.shouldSendReminder': true,
    // Not completed
    'status.current': { $ne: 'completed' },
    // No billing date, or billing date is not within 5 days of due date
    $or: [
      { 'defaultFields.billingDate.value': { $exists: false } },
      {
        $expr: {
          $gt: [
            {
              $divide: [
                { $subtract: ['$defaultFields.dueDate.value', '$defaultFields.billingDate.value'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            },
            5
          ]
        }
      }
    ]
  }).sort('defaultFields.dueDate.value');
};

export default mongoose.model('AccountEntry', accountEntrySchema);
