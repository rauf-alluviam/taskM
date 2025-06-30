import mongoose from 'mongoose';

const kanbanColumnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
  },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  // Organization association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // Null for individual projects
  },
  // Team association
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null, // Null for organization-wide projects
  },
  // Project visibility and access
  visibility: {
    type: String,
    enum: ['private', 'team', 'organization', 'public'],
    default: 'team',
  },
  // Project type
  projectType: {
    type: String,
    enum: ['individual', 'team', 'organization'],
    default: 'team',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Enhanced member management
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  // Project metadata
  tags: [{
    type: String,
    trim: true,
  }],
  color: {
    type: String,
    default: '#3B82F6',
  },
  icon: {
    type: String,
    default: 'folder',
  },
  // Project settings
  settings: {
    allowGuestAccess: {
      type: Boolean,
      default: false,
    },
    requireApprovalForTasks: {
      type: Boolean,
      default: false,
    },
    autoArchiveCompletedTasks: {
      type: Boolean,
      default: false,
    },
    taskNumbering: {
      type: String,
      enum: ['sequential', 'random'],
      default: 'sequential',
    },
  },
  // Project status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active',
  },
  // Project timeline
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  }],
  kanbanColumns: [kanbanColumnSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
projectSchema.index({ createdBy: 1 });
projectSchema.index({ organization: 1 });
projectSchema.index({ team: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ visibility: 1 });

// Virtual to get task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'projectId',
  count: true,
});

// Virtual to get active member count
projectSchema.virtual('activeMemberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Instance method to check if user is project admin
projectSchema.methods.isAdmin = function(userId) {
  if (this.createdBy.equals(userId)) return true;
  const member = this.members.find(m => m.user.equals(userId));
  return member && member.role === 'admin';
};

// Instance method to check if user is project member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.equals(userId));
};

// Instance method to get user's role in project
projectSchema.methods.getUserRole = function(userId) {
  if (this.createdBy.equals(userId)) return 'owner';
  const member = this.members.find(m => m.user.equals(userId));
  return member ? member.role : null;
};

// Instance method to add member
projectSchema.methods.addMember = function(userId, role = 'member', addedBy = null) {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this project');
  }
  
  this.members.push({
    user: userId,
    role: role,
    addedAt: new Date(),
    addedBy: addedBy,
  });
};

// Instance method to remove member
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => !member.user.equals(userId));
};

// Instance method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => member.user.equals(userId));
  if (member) {
    member.role = newRole;
  } else {
    throw new Error('User is not a member of this project');
  }
};

// Static method to find projects by organization
projectSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId, isActive: true })
    .populate('createdBy', 'name email')
    .populate('team', 'name')
    .populate('members.user', 'name email')
    .sort({ updatedAt: -1 });
};

// Static method to find projects by team
projectSchema.statics.findByTeam = function(teamId) {
  return this.find({ team: teamId, isActive: true })
    .populate('createdBy', 'name email')
    .populate('organization', 'name')
    .populate('members.user', 'name email')
    .sort({ updatedAt: -1 });
};

export default mongoose.model('Project', projectSchema);