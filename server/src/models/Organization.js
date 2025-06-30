import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allow null/undefined values to be non-unique
  },
  logo: {
    type: String, // URL to logo image
  },
  website: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  settings: {
    allowPublicProjects: {
      type: Boolean,
      default: false,
    },
    requireApprovalForTeamJoin: {
      type: Boolean,
      default: true,
    },
    maxTeamsPerUser: {
      type: Number,
      default: 5,
    },
    defaultProjectVisibility: {
      type: String,
      enum: ['private', 'team', 'organization'],
      default: 'team',
    },
  },
  billing: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    maxUsers: {
      type: Number,
      default: 10,
    },
    maxProjects: {
      type: Number,
      default: 5,
    },
    storageLimit: {
      type: Number, // in MB
      default: 1000,
    },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
organizationSchema.index({ name: 1 }, { unique: true });
organizationSchema.index({ domain: 1 }, { unique: true, sparse: true });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ admins: 1 });

// Virtual to get member count
organizationSchema.virtual('memberCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organization',
  count: true,
});

// Virtual to get team count
organizationSchema.virtual('teamCount', {
  ref: 'Team',
  localField: '_id',
  foreignField: 'organization',
  count: true,
});

// Virtual to get project count
organizationSchema.virtual('projectCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'organization',
  count: true,
});

// Pre-save middleware to update timestamps
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check if user is admin
organizationSchema.methods.isAdmin = function(userId) {
  return this.owner.equals(userId) || this.admins.some(admin => admin.equals(userId));
};

// Instance method to check if user is member
organizationSchema.methods.isMember = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  return user && user.organization && user.organization.equals(this._id);
};

export default mongoose.model('Organization', organizationSchema);
