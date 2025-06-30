// Script to insert dummy data for tasks, organizations, projects, and teams
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Organization from './src/models/Organization.js';
import Project from './src/models/Project.js';
import Team from './src/models/Team.js';
import Task from './src/models/Task.js';
import User from './src/models/User.js';

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

  // Create dummy users (with hashed passwords)
  const userDocs = [
    { name: 'Alice Admin', email: 'alice@org.com', role: 'org_admin', password: await bcrypt.hash('password123', 12) },
    { name: 'Bob Lead', email: 'bob@org.com', role: 'team_lead', password: await bcrypt.hash('password123', 12) },
    { name: 'Charlie Member', email: 'charlie@org.com', role: 'member', password: await bcrypt.hash('password123', 12) },
    { name: 'Diana Viewer', email: 'diana@org.com', role: 'viewer', password: await bcrypt.hash('password123', 12) }
  ];
  const users = await User.insertMany(userDocs);

  // Create organization
  const org = await Organization.create({
    name: 'Demo Organization',
    description: 'A sample organization for testing',
    owner: users[0]._id,
    admins: [users[0]._id],
    // Add required fields for organization
    settings: {},
    billing: {},
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
      settings: { allowGuestAccess: false, requireApprovalForProjects: true },
      visibility: 'organization',
      permissions: {},
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
      settings: { allowGuestAccess: true, requireApprovalForProjects: false },
      visibility: 'organization',
      permissions: {},
    }
  ]);

  // Create projects
  const projects = await Project.insertMany([
    {
      name: 'Project Apollo',
      description: 'First project',
      department: 'Engineering',
      organization: org._id,
      team: teams[0]._id,
      createdBy: users[1]._id,
      members: [
        { user: users[1]._id, role: 'admin', addedAt: new Date(), addedBy: users[1]._id },
        { user: users[2]._id, role: 'member', addedAt: new Date(), addedBy: users[1]._id }
      ],
      status: 'active',
      visibility: 'team',
      projectType: 'team',
      settings: {},
    },
    {
      name: 'Project Beta',
      description: 'Second project',
      department: 'Marketing',
      organization: org._id,
      team: teams[1]._id,
      createdBy: users[2]._id,
      members: [
        { user: users[2]._id, role: 'admin', addedAt: new Date(), addedBy: users[2]._id },
        { user: users[3]._id, role: 'viewer', addedAt: new Date(), addedBy: users[2]._id }
      ],
      status: 'paused',
      visibility: 'team',
      projectType: 'team',
      settings: {},
    }
  ]);

  // Link projects to teams
  if (teams[0] && teams[1]) {
    const team0 = await Team.findById(teams[0]._id);
    const team1 = await Team.findById(teams[1]._id);
    if (team0 && team1) {
      team0.projects = team0.projects || [];
      team1.projects = team1.projects || [];
      team0.projects.push(projects[0]._id);
      team1.projects.push(projects[1]._id);
      await team0.save();
      await team1.save();
    } else {
      console.error('Could not find teams by ID after insertMany');
    }
  } else {
    console.error('Teams array is missing expected elements');
  }

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
