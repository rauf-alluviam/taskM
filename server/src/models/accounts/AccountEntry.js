import mongoose from 'mongoose';

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
  // Organization association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Creator reference
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  defaultFields: {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    billingDate: {
      type: Date
    },
    dueDate: {
      type: Date
    },
    reminder: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
      default: 'monthly'
    }
  },
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'upload', 'select', 'boolean'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
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

// Indexes for better query performance
accountEntrySchema.index({ organization: 1 });
accountEntrySchema.index({ createdBy: 1 });
accountEntrySchema.index({ masterTypeId: 1 });
accountEntrySchema.index({ "defaultFields.dueDate": 1 });
accountEntrySchema.index({ "defaultFields.billingDate": 1 });

export default mongoose.model('AccountEntry', accountEntrySchema);