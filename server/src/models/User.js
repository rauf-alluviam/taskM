import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  // Organization association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null, // Null for individual users
  },
  // Legacy organization name (keep for backward compatibility)
  organizationName: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      // Password is not required for pending users (those with invitation)
      return this.status !== 'pending';
    },
    minlength: 6,
  },
  // Enhanced role system
  role: {
    type: String,
    enum: ['super_admin', 'org_admin', 'team_lead', 'member', 'viewer'],
    default: 'member',
  },
  // User type
  userType: {
    type: String,
    enum: ['individual', 'organization_member'],
    default: 'individual',
  },
  avatar: {
    type: String,
  },
  settings: {
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      taskReminders: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      activityVisible: { type: Boolean, default: false },
      allowAnalytics: { type: Boolean, default: true },
    },
  },
  department: {
    type: String,
  },
  // Team memberships
  teams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    role: {
      type: String,
      enum: ['lead', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // User status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active',
  },
  // Last activity tracking
  lastActive: {
    type: Date,
    default: Date.now,
  },
  // Onboarding status
  onboarding: {
    completed: {
      type: Boolean,
      default: false,
    },
    currentStep: {
      type: String,
      default: 'profile',
    },
    completedSteps: [{
      type: String,
    }],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Email verification fields
  verified_email: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationTokenExpires: {
    type: Date,
  },
  // Pending invitation fields
  pendingInvitation: {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    role: {
      type: String,
      enum: ['member', 'team_lead'],
    },
    token: {
      type: String,
    },
    expires: {
      type: Date,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
    },
    // Team assignments
    teamAssignments: [{
      team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
      role: {
        type: String,
        enum: ['lead', 'member'],
        default: 'member',
      },
    }],
    // Project assignments
    projectAssignments: [{
      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member',
      },
    }],
    // Invitation context and message
    invitationContext: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user is organization admin
userSchema.methods.isOrganizationAdmin = function() {
  return this.role === 'org_admin' || this.role === 'super_admin';
};

// Check if user is team lead
userSchema.methods.isTeamLead = function() {
  return this.role === 'team_lead' || this.isOrganizationAdmin();
};

// Get user's teams
userSchema.methods.getTeams = function() {
  return this.teams || [];
};

// Check if user is member of specific team
userSchema.methods.isMemberOfTeam = function(teamId) {
  return this.teams.some(teamMember => teamMember.team.equals(teamId));
};

// Get user's role in specific team
userSchema.methods.getRoleInTeam = function(teamId) {
  const teamMember = this.teams.find(tm => tm.team.equals(teamId));
  return teamMember ? teamMember.role : null;
};

// Update last active timestamp
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ 'teams.team': 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastActive: -1 });

export default mongoose.model('User', userSchema);