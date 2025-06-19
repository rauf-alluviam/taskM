import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    required: true,
    default: 'todo',
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  attachments: [{
    type: String, // URLs to uploaded files
  }],
  voiceNote: {
    type: String, // URL to uploaded voice note
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ assignedUsers: 1 });

export default mongoose.model('Task', taskSchema);