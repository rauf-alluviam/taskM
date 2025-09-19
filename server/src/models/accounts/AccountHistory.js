import mongoose from 'mongoose';

const accountHistorySchema = new mongoose.Schema({
  accountEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountEntry',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'billing_date_set', 'reminder_sent'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
accountHistorySchema.index({ accountEntryId: 1, createdAt: -1 });

export default mongoose.model('AccountHistory', accountHistorySchema);
