// model/accounts/MasterType.js
import mongoose from 'mongoose';

const masterTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  defaultFields: {
    companyName: {
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: true }
    },
    address: {
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: false }
    },
    billingDate: {
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: true }
    },
    dueDate: {
      enabled: { type: Boolean, default: true },
      required: { type: Boolean, default: true }
    },
    reminder: {
      enabled: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
        default: 'monthly'
      },
      required: { type: Boolean, default: true }
    }
  },
  customFields: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'upload', 'select', 'boolean'],
      default: 'text'
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    required: {
      type: Boolean,
      default: false
    },
    validation: {
      pattern: String, // Regex pattern for validation
      min: Number,     // For number fields
      max: Number,     // For number fields
      minLength: Number, // For text fields
      maxLength: Number  // For text fields
    },
    options: [String], // For select type fields
    description: String
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'archived', 'cloned'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changes: mongoose.Schema.Types.Mixed
  }],
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
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('MasterType', masterTypeSchema);
