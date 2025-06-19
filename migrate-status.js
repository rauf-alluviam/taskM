// Migration script to update task statuses to kebab-case format
// Run this in MongoDB shell or as a Node.js script

const statusMigrations = {
  'To Do': 'todo',
  'In Progress': 'in-progress',
  'Review': 'review',
  'Done': 'done'
};

// MongoDB update operations
const migrateTaskStatuses = async () => {
  console.log('🔄 Starting task status migration...');
  
  for (const [oldStatus, newStatus] of Object.entries(statusMigrations)) {
    const result = await db.tasks.updateMany(
      { status: oldStatus },
      { $set: { status: newStatus } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Updated ${result.modifiedCount} tasks from "${oldStatus}" to "${newStatus}"`);
    }
  }
  
  // Also update any kanban columns in projects
  const projectResult = await db.projects.updateMany(
    {},
    {
      $set: {
        "kanbanColumns.$[elem].name": "todo"
      }
    },
    {
      arrayFilters: [{ "elem.name": "To Do" }]
    }
  );
  
  await db.projects.updateMany(
    {},
    {
      $set: {
        "kanbanColumns.$[elem].name": "in-progress"
      }
    },
    {
      arrayFilters: [{ "elem.name": "In Progress" }]
    }
  );
  
  await db.projects.updateMany(
    {},
    {
      $set: {
        "kanbanColumns.$[elem].name": "review"
      }
    },
    {
      arrayFilters: [{ "elem.name": "Review" }]
    }
  );
  
  await db.projects.updateMany(
    {},
    {
      $set: {
        "kanbanColumns.$[elem].name": "done"
      }
    },
    {
      arrayFilters: [{ "elem.name": "Done" }]
    }
  );
  
  console.log('✅ Migration completed!');
};

// For Node.js execution
if (typeof require !== 'undefined') {
  const mongoose = require('mongoose');
  
  const runMigration = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow');
      
      // Update tasks
      for (const [oldStatus, newStatus] of Object.entries(statusMigrations)) {
        const result = await mongoose.connection.db.collection('tasks').updateMany(
          { status: oldStatus },
          { $set: { status: newStatus } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Updated ${result.modifiedCount} tasks from "${oldStatus}" to "${newStatus}"`);
        }
      }
      
      console.log('✅ Task status migration completed!');
      await mongoose.disconnect();
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  };
  
  // Run if this file is executed directly
  if (require.main === module) {
    runMigration();
  }
  
  module.exports = { runMigration };
}

// For MongoDB shell execution
// Copy and paste the migrateTaskStatuses function above
