import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String, // AWS S3 key for deletion
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Reference to what this attachment belongs to
  attachedTo: {
    type: String,
    enum: ['task', 'document'],
    required: true,
  },
  attachedToId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'attachedToModel',
  },
  attachedToModel: {
    type: String,
    enum: ['Task', 'Document'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
attachmentSchema.index({ attachedToId: 1, attachedTo: 1 });
attachmentSchema.index({ uploadedBy: 1 });

export default mongoose.model('Attachment', attachmentSchema);
