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
  organization: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'member'],
    default: 'member',
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
  isActive: {
    type: Boolean,
    default: true,
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

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);