// Script to insert dummy data for tasks, organizations, projects, and teams
const mongoose = require('mongoose');
const Organization = require('./src/models/Organization');
const Project = require('./src/models/Project');
const Team = require('./src/models/Team');
const Task = require('./src/models/Task');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanagement';

async function seed() {
  await mongoose.connect(MONGO_URI);

  // Clear existing data
  await Promise.all([
    Organization.deleteMany({}),
    Project.deleteMany({}),
    Team.deleteMany({}),
    Task.deleteMany({}),
    User.deleteMany({})
  ]);

  // Create dummy users
  const users = await User.insertMany([
    { name: 'Alice Admin', email: 'alice@org.com', role: 'org_admin' },
    { name: 'Bob Lead', email: 'bob@org.com', role: 'team_lead' },
    { name: 'Charlie Member', email: 'charlie@org.com', role: 'member' },
    { name: 'Diana Viewer', email: 'diana@org.com', role: 'viewer' }
  ]);

  // Create organization
  const org = await Organization.create({
    name: 'Demo Organization',
    description: 'A sample organization for testing',
    owner: users[0]._id,
    members: users.map(u => u._id)
  });

  // Create teams
  const teams = await Team.insertMany([
    {
      name: 'Alpha Team',
      description: 'Handles alpha projects',
      organization: org._id,
      lead: users[1]._id,
      members: [
        { user: users[1]._id, role: 'lead', joinedAt: new Date() },
        { user: users[2]._id, role: 'member', joinedAt: new Date() }
      ],
      projects: [],
      settings: { allowGuestAccess: false, requireApprovalForProjects: true }
    },
    {
      name: 'Beta Team',
      description: 'Handles beta projects',
      organization: org._id,
      lead: users[2]._id,
      members: [
        { user: users[2]._id, role: 'lead', joinedAt: new Date() },
        { user: users[3]._id, role: 'viewer', joinedAt: new Date() }
      ],
      projects: [],
      settings: { allowGuestAccess: true, requireApprovalForProjects: false }
    }
  ]);

  // Create projects
  const projects = await Project.insertMany([
    {
      name: 'Project Apollo',
      description: 'First project',
      organization: org._id,
      team: teams[0]._id,
      members: [users[1]._id, users[2]._id],
      status: 'active'
    },
    {
      name: 'Project Beta',
      description: 'Second project',
      organization: org._id,
      team: teams[1]._id,
      members: [users[2]._id, users[3]._id],
      status: 'planning'
    }
  ]);

  // Link projects to teams
  teams[0].projects.push(projects[0]._id);
  teams[1].projects.push(projects[1]._id);
  await teams[0].save();
  await teams[1].save();

  // Create tasks
  await Task.insertMany([
    {
      title: 'Setup repo',
      description: 'Initialize repository',
      project: projects[0]._id,
      team: teams[0]._id,
      assignee: users[1]._id,
      status: 'todo',
      createdBy: users[1]._id
    },
    {
      title: 'Write docs',
      description: 'Document the API',
      project: projects[1]._id,
      team: teams[1]._id,
      assignee: users[2]._id,
      status: 'in_progress',
      createdBy: users[2]._id
    }
  ]);

  console.log('Dummy data inserted!');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
