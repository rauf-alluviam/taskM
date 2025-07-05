import mongoose from 'mongoose';
import Project from './src/models/Project.js';
import dotenv from 'dotenv';

dotenv.config();

// Get default color for a column by its ID
function getDefaultColorForColumn(columnId) {
  const colorMap = {
    'todo': 'bg-slate-100',
    'in-progress': 'bg-blue-100',
    'review': 'bg-yellow-100',
    'done': 'bg-green-100',
    'testing': 'bg-purple-100',
    'blocked': 'bg-red-100',
    'deployed': 'bg-green-100',
  };
  return colorMap[columnId] || 'bg-gray-100';
}

async function updateColumnColors() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskm';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects to process`);

    let updatedProjects = 0;
    
    // Loop through each project
    for (const project of projects) {
      let needsUpdate = false;

      // Loop through each column in the project
      if (project.kanbanColumns && project.kanbanColumns.length > 0) {
        for (let i = 0; i < project.kanbanColumns.length; i++) {
          const column = project.kanbanColumns[i];
          
          // If color is null or undefined, set a default color
          if (!column.color) {
            const columnId = column.name.toLowerCase().replace(/\s+/g, '-');
            project.kanbanColumns[i].color = getDefaultColorForColumn(columnId);
            needsUpdate = true;
            console.log(`Setting color for column ${column.name} in project ${project.name} to ${project.kanbanColumns[i].color}`);
          }
        }
      }

      // Save the project if any columns were updated
      if (needsUpdate) {
        await project.save();
        updatedProjects++;
        console.log(`Updated project: ${project.name} (ID: ${project._id})`);
      }
    }

    console.log(`✅ Updated columns in ${updatedProjects} projects`);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error updating column colors:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
updateColumnColors();
