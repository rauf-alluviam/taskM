import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const statusMigrations = {
  'To Do': 'todo',
  'In Progress': 'in-progress', 
  'Review': 'review',
  'Done': 'done'
};

const runMigration = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow');
    console.log('✅ Connected to MongoDB');
    
    console.log('🔄 Starting task status migration...');
    
    // Update tasks
    let totalUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(statusMigrations)) {
      const result = await mongoose.connection.db.collection('tasks').updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${result.modifiedCount} tasks from "${oldStatus}" to "${newStatus}"`);
        totalUpdated += result.modifiedCount;
      }
    }
    
    if (totalUpdated === 0) {
      console.log('ℹ️  No tasks needed status updates');
    } else {
      console.log(`✅ Total tasks updated: ${totalUpdated}`);
    }
    
    // Update project kanban columns
    console.log('🔄 Updating project kanban columns...');
    
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    let projectsUpdated = 0;
    
    for (const project of projects) {
      let needsUpdate = false;
      const updatedColumns = project.kanbanColumns?.map(col => {
        if (statusMigrations[col.name]) {
          needsUpdate = true;
          return { ...col, name: statusMigrations[col.name] };
        }
        return col;
      });
      
      if (needsUpdate) {
        await mongoose.connection.db.collection('projects').updateOne(
          { _id: project._id },
          { $set: { kanbanColumns: updatedColumns } }
        );
        projectsUpdated++;
      }
    }
    
    if (projectsUpdated > 0) {
      console.log(`✅ Updated ${projectsUpdated} project(s) kanban columns`);
    } else {
      console.log('ℹ️  No project kanban columns needed updates');
    }
    
    console.log('✅ Migration completed successfully!');
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
