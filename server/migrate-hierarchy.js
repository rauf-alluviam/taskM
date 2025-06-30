#!/usr/bin/env node

/**
 * Migration script to update existing data for organizational hierarchy
 * This script should be run once to migrate existing projects and users
 */

import mongoose from 'mongoose';
import User from './src/models/User.js';
import Project from './src/models/Project.js';
import Task from './src/models/Task.js';
import Organization from './src/models/Organization.js';
import Team from './src/models/Team.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration functions
const migrateUsers = async () => {
  console.log('🔄 Migrating users...');
  
  try {
    // Update users without the new fields
    const usersToUpdate = await User.find({
      $or: [
        { role: { $exists: false } },
        { status: { $exists: false } },
        { teams: { $exists: false } }
      ]
    });

    console.log(`Found ${usersToUpdate.length} users to migrate`);

    for (const user of usersToUpdate) {
      // Set default role based on existing role
      if (!user.role || !['super_admin', 'org_admin', 'team_lead', 'member', 'viewer'].includes(user.role)) {
        if (user.role === 'admin') {
          user.role = 'super_admin';
        } else {
          user.role = 'member';
        }
      }

      // Set default status
      if (!user.status) {
        user.status = 'active';
      }

      // Initialize teams array
      if (!user.teams) {
        user.teams = [];
      }

      // Set default last active
      if (!user.lastActive) {
        user.lastActive = user.updatedAt || user.createdAt || new Date();
      }

      // Initialize onboarding
      if (!user.onboarding) {
        user.onboarding = {
          completed: true, // Assume existing users have completed onboarding
          currentStep: 'profile',
          completedSteps: ['profile', 'preferences']
        };
      }

      await user.save();
    }

    console.log(`✅ Migrated ${usersToUpdate.length} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error);
  }
};

const migrateProjects = async () => {
  console.log('🔄 Migrating projects...');
  
  try {
    // Update projects without organizational fields
    const projectsToUpdate = await Project.find({
      $or: [
        { projectType: { $exists: false } },
        { visibility: { $exists: false } },
        { organization: { $exists: false } },
        { team: { $exists: false } }
      ]
    });

    console.log(`Found ${projectsToUpdate.length} projects to migrate`);

    for (const project of projectsToUpdate) {
      // Set default project type
      if (!project.projectType) {
        project.projectType = 'individual';
      }

      // Set default visibility
      if (!project.visibility) {
        project.visibility = 'private';
      }

      // Update members structure if needed
      if (project.members && project.members.length > 0) {
        const updatedMembers = project.members.map(member => {
          if (typeof member === 'string' || member instanceof mongoose.Types.ObjectId) {
            // Convert old simple member reference to new structure
            return {
              user: member,
              role: 'member',
              addedAt: project.createdAt || new Date(),
              addedBy: project.createdBy
            };
          }
          return member;
        });
        project.members = updatedMembers;
      }

      // Initialize kanban columns if they don't exist
      if (!project.kanbanColumns || project.kanbanColumns.length === 0) {
        project.kanbanColumns = [
          { name: 'To Do', order: 0 },
          { name: 'In Progress', order: 1 },
          { name: 'Review', order: 2 },
          { name: 'Done', order: 3 }
        ];
      }

      await project.save();
    }

    console.log(`✅ Migrated ${projectsToUpdate.length} projects`);
  } catch (error) {
    console.error('❌ Error migrating projects:', error);
  }
};

const migrateTasks = async () => {
  console.log('🔄 Migrating tasks...');
  
  try {
    // Update tasks with old assignedUser to assignedUsers array
    const tasksToUpdate = await Task.find({
      $or: [
        { assignedUser: { $exists: true } },
        { assignedUsers: { $exists: false } }
      ]
    });

    console.log(`Found ${tasksToUpdate.length} tasks to migrate`);

    for (const task of tasksToUpdate) {
      // Convert assignedUser to assignedUsers array
      if (task.assignedUser && !task.assignedUsers) {
        task.assignedUsers = [task.assignedUser];
        task.assignedUser = undefined; // Remove old field
      }

      // Ensure assignedUsers is an array
      if (!task.assignedUsers) {
        task.assignedUsers = [];
      }

      // Initialize history array if it doesn't exist
      if (!task.history) {
        task.history = [];
      }

      await task.save();
    }

    console.log(`✅ Migrated ${tasksToUpdate.length} tasks`);
  } catch (error) {
    console.error('❌ Error migrating tasks:', error);
  }
};

const createIndexes = async () => {
  console.log('🔄 Creating database indexes...');
  
  try {
    // Create indexes for better performance
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ organization: 1 });
    await User.collection.createIndex({ 'teams.team': 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ status: 1 });
    await User.collection.createIndex({ lastActive: -1 });

    await Project.collection.createIndex({ createdBy: 1 });
    await Project.collection.createIndex({ organization: 1 });
    await Project.collection.createIndex({ team: 1 });
    await Project.collection.createIndex({ 'members.user': 1 });
    await Project.collection.createIndex({ status: 1 });
    await Project.collection.createIndex({ visibility: 1 });

    await Task.collection.createIndex({ projectId: 1 });
    await Task.collection.createIndex({ createdBy: 1 });
    await Task.collection.createIndex({ assignedUsers: 1 });
    await Task.collection.createIndex({ status: 1 });
    await Task.collection.createIndex({ priority: 1 });

    if (Organization.collection) {
      await Organization.collection.createIndex({ name: 1 });
      await Organization.collection.createIndex({ status: 1 });
    }

    if (Team.collection) {
      await Team.collection.createIndex({ organization: 1 });
      await Team.collection.createIndex({ 'members.user': 1 });
      await Team.collection.createIndex({ lead: 1 });
    }

    console.log('✅ Created database indexes');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 Starting organizational hierarchy migration...\n');

  await connectDB();

  try {
    await migrateUsers();
    console.log('');
    
    await migrateProjects();
    console.log('');
    
    await migrateTasks();
    console.log('');
    
    await createIndexes();
    console.log('');

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('- Updated user roles and status fields');
    console.log('- Migrated project structure for organizational hierarchy');
    console.log('- Updated task assignee structure');
    console.log('- Created database indexes for performance');
    console.log('\n🎉 Your TaskFlow instance is now ready for organizational features!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}

export default runMigration;
