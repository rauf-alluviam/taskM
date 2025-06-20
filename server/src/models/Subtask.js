import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  estimatedHours: {
    type: Number,
    min: 0,
  },
  actualHours: {
    type: Number,
    min: 0,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for better query performance
subtaskSchema.index({ parentTaskId: 1, order: 1 });
subtaskSchema.index({ assignedTo: 1 });
subtaskSchema.index({ status: 1 });

// Virtual for checking if subtask is completed
subtaskSchema.virtual('isCompleted').get(function() {
  return this.status === 'done';
});

// Pre-save middleware to set completedAt timestamp
subtaskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
  next();
});

const Subtask = mongoose.model('Subtask', subtaskSchema);

export default Subtask;
