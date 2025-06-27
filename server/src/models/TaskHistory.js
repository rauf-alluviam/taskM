import mongoose from 'mongoose';

const taskHistorySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'updated',
      'status_changed',
      'priority_changed',      
      'assigned',
      'unassigned',
      'due_date_changed',
      'start_date_changed',
      'attachment_added',
      'attachment_removed',
      'subtask_added',
      'subtask_updated',
      'subtask_completed',
      'subtask_deleted',
      'tag_added',
      'tag_removed',
      'description_updated',
      'voice_note_added',
      'title_updated',
      'deleted'
    ],
  },
  field: {
    type: String, // Field that was changed (e.g., 'title', 'status', 'priority')
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed, // Previous value
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed, // New value
  },
  details: {
    type: String, // Additional details about the change
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String, // Cache user name for performance
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Additional context data
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
taskHistorySchema.index({ taskId: 1, createdAt: -1 });
taskHistorySchema.index({ userId: 1 });
taskHistorySchema.index({ action: 1 });

// Helper method to create formatted description
taskHistorySchema.methods.getFormattedDescription = function() {
  const { action, field, oldValue, newValue, details, userName } = this;
  
  switch (action) {
    case 'created':
      return `${userName} created this task`;
    case 'title_updated':
      return `${userName} changed title from "${oldValue}" to "${newValue}"`;
    case 'description_updated':
      if (details === 'Voice note added to description' || details === 'Voice note added to existing description') {
        return `${userName} added a voice note to the description`;
      }
      return `${userName} updated the description`;
    case 'voice_note_added':
      return `${userName} added a voice note to the description`;
    case 'status_changed':
      return `${userName} changed status from "${oldValue}" to "${newValue}"`;
    case 'priority_changed':
      return `${userName} changed priority from "${oldValue}" to "${newValue}"`;
    case 'assigned':
      return `${userName} assigned this task to ${newValue}`;
    case 'unassigned':
      return `${userName} unassigned ${oldValue} from this task`;    case 'due_date_changed':
      return oldValue 
        ? `${userName} changed due date from ${new Date(oldValue).toLocaleDateString()} to ${new Date(newValue).toLocaleDateString()}`
        : `${userName} set due date to ${new Date(newValue).toLocaleDateString()}`;
    case 'start_date_changed':
      return oldValue 
        ? `${userName} changed start date from ${new Date(oldValue).toLocaleDateString()} to ${new Date(newValue).toLocaleDateString()}`
        : `${userName} set start date to ${new Date(newValue).toLocaleDateString()}`;
    case 'attachment_added':
      return `${userName} added attachment: ${newValue}`;
    case 'attachment_removed':
      return `${userName} removed attachment: ${oldValue}`;
    case 'subtask_added':
      return `${userName} added subtask: ${newValue}`;
    case 'subtask_updated':
      return `${userName} updated subtask: ${details}`;
    case 'subtask_completed':
      return `${userName} completed subtask: ${newValue}`;
    case 'subtask_deleted':
      return `${userName} deleted subtask: ${oldValue}`;
    case 'tag_added':
      return `${userName} added tag: ${newValue}`;
    case 'tag_removed':
      return `${userName} removed tag: ${oldValue}`;
    default:
      return details || `${userName} made changes to this task`;
  }
};

// Static method to log task changes
taskHistorySchema.statics.logChange = async function(taskId, action, data, userId, userName) {
  try {
    const historyEntry = new this({
      taskId,
      action,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue,
      details: data.details,
      userId,
      userName,
      metadata: data.metadata,
    });
    
    await historyEntry.save();
    return historyEntry;
  } catch (error) {
    console.error('Error logging task history:', error);
    throw error;
  }
};

export default mongoose.model('TaskHistory', taskHistorySchema);
