import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    default: '',
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  version: {
    type: Number,
    default: 1,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  // Fields for imported documents
  isImported: {
    type: Boolean,
    default: false,
  },
  originalFileName: {
    type: String,
  },
  mimetype: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  s3Key: {
    type: String,
  },
  s3Url: {
    type: String,
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment',
  }],
}, {
  timestamps: true,
});

// Index for better query performance
documentSchema.index({ projectId: 1 });
documentSchema.index({ createdBy: 1 });

export default mongoose.model('Document', documentSchema);