#!/usr/bin/env node

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// User schema (simplified version for this script)
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  organizationName: {
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
    enum: ['super_admin', 'org_admin', 'team_lead', 'member', 'viewer'],
    default: 'member',
  },
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
  teams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
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
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active',
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
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

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:');
      console.log(`   Name: ${existingSuperAdmin.name}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
      console.log('✅ Using existing super admin. No action needed.');
      return;
    }

    // Use command line arguments or default values
    const args = process.argv.slice(2);
    let name, email, password;

    if (args.length >= 3) {
      name = args[0];
      email = args[1];
      password = args[2];
    } else {
      // Default super admin credentials
      name = 'Super Administrator';
      email = 'jeeya2808@gmail.com';
      password = 'admin@123';
      
      console.log('🔧 Creating default super admin with credentials:');
      console.log(`   Name: ${name}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('');
      console.log('💡 To create with custom credentials, run:');
      console.log('   node create-superadmin.js "Your Name" "your@email.com" "password"');
      console.log('');
    }

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Error: All fields are required');
      process.exit(1);
    }

    if (password.length < 6) {
      console.log('❌ Error: Password must be at least 6 characters long');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Error: User with this email already exists');
      process.exit(1);
    }

    // Create super admin user
    const superAdmin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: 'super_admin',
      userType: 'individual',
      status: 'active',
      isActive: true,
      onboarding: {
        completed: true,
        currentStep: 'completed',
        completedSteps: ['profile', 'organization', 'preferences']
      },
      settings: {
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          taskReminders: true,
          projectUpdates: true,
        },
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
        },
        privacy: {
          profileVisible: true,
          activityVisible: true,
          allowAnalytics: true,
        },
      }
    });

    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('📋 Super Admin Details:');
    console.log(`   ID: ${superAdmin._id}`);
    console.log(`   Name: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   Status: ${superAdmin.status}`);
    console.log(`   Created: ${superAdmin.createdAt}`);
    console.log('');
    console.log('🔐 The super admin can now:');
    console.log('   • Access all organizations');
    console.log('   • Create and manage organizations');
    console.log('   • Manage all users across the system');
    console.log('   • Access analytics and system-wide data');
    console.log('   • Perform all administrative tasks');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    if (error.code === 11000) {
      console.error('   This email is already registered');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
createSuperAdmin();
