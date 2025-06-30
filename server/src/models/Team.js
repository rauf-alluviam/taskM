import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String, // URL to team avatar/image
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['lead', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  visibility: {
    type: String,
    enum: ['private', 'organization', 'public'],
    default: 'organization', // Visible to organization members
  },
  permissions: {
    canCreateProjects: {
      type: Boolean,
      default: true,
    },
    canInviteMembers: {
      type: Boolean,
      default: true,
    },
    canManageProjects: {
      type: Boolean,
      default: true,
    },
  },
  settings: {
    defaultProjectRole: {
      type: String,
      enum: ['viewer', 'member', 'admin'],
      default: 'member',
    },
    requireApprovalForJoin: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: 50,
    },
  },
  tags: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Compound indexes
teamSchema.index({ organization: 1, name: 1 }, { unique: true }); // Unique team name per organization
teamSchema.index({ organization: 1, isActive: 1 });
teamSchema.index({ lead: 1 });
teamSchema.index({ 'members.user': 1 });

// Virtual to get project count
teamSchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'team',
  count: true,
});

// Virtual to get active member count
teamSchema.virtual('activeMemberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Instance method to check if user is team lead
teamSchema.methods.isLead = function(userId) {
  return this.lead.equals(userId);
};

// Instance method to check if user is team member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.equals(userId));
};

// Instance method to get user's role in team
teamSchema.methods.getUserRole = function(userId) {
  if (this.lead.equals(userId)) return 'lead';
  const member = this.members.find(member => member.user.equals(userId));
  return member ? member.role : null;
};

// Instance method to add member
teamSchema.methods.addMember = function(userId, role = 'member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this team');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
  });
};

// Instance method to remove member
teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => !member.user.equals(userId));
};

// Instance method to update member role
teamSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(member => member.user.equals(userId));
  if (member) {
    member.role = newRole;
  } else {
    throw new Error('User is not a member of this team');
  }
};

// Static method to find teams by organization
teamSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organization: organizationId, isActive: true })
    .populate('lead', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ name: 1 });
};

// Static method to find teams by user
teamSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { lead: userId },
      { 'members.user': userId }
    ],
    isActive: true
  })
    .populate('organization', 'name')
    .populate('lead', 'name email avatar')
    .sort({ name: 1 });
};

export default mongoose.model('Team', teamSchema);
