import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Test credentials
const testUser1 = {
  email: 'user1@example.com',
  password: 'password123',
  name: 'User One',
  role: 'member'
};

const testUser2 = {
  email: 'user2@example.com',
  password: 'password123',
  name: 'User Two',
  role: 'member'
};

async function setupUser(user) {
  try {
    // Try to register
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, user);
    return { token: registerResponse.data.token, user: registerResponse.data.user };
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      // User exists, try to login
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: user.email,
        password: user.password
      });
      return { token: loginResponse.data.token, user: loginResponse.data.user };
    } else {
      throw error;
    }
  }
}

async function testDocumentAccess() {
  console.log('🧪 Testing Document Access Control...\n');

  try {    // Setup users
    console.log('1️⃣ Setting up users...');
    const user1Response = await setupUser(testUser1);
    const user2Response = await setupUser(testUser2);
    const token1 = user1Response.token;
    const token2 = user2Response.token;
    const headers1 = { Authorization: `Bearer ${token1}` };
    const headers2 = { Authorization: `Bearer ${token2}` };
    console.log('✅ Users setup successfully');

    // User 1 creates a project
    console.log('\n2️⃣ User 1 creating a project...');
    const projectData = {
      name: 'User 1 Private Project',
      description: 'A private project for testing',
      department: 'Engineering',
      kanbanColumns: [
        { name: 'To Do', order: 0 },
        { name: 'Done', order: 1 }
      ]
    };

    const projectResponse = await axios.post(`${API_BASE}/projects`, projectData, { headers: headers1 });
    const project = projectResponse.data;
    console.log('✅ Project created:', project.name, project._id);

    // User 1 creates a personal document (no projectId)
    console.log('\n3️⃣ User 1 creating a personal document...');
    const personalDocData = {
      title: 'User 1 Personal Document',
      content: 'This is a personal document',
      // No projectId - this should be a personal document
    };

    const personalDocResponse = await axios.post(`${API_BASE}/documents`, personalDocData, { headers: headers1 });
    const personalDoc = personalDocResponse.data;
    console.log('✅ Personal document created:', personalDoc.title, personalDoc._id);

    // User 1 creates a project document
    console.log('\n4️⃣ User 1 creating a project document...');
    const projectDocData = {
      title: 'User 1 Project Document',
      content: 'This is a project document',
      projectId: project._id
    };

    const projectDocResponse = await axios.post(`${API_BASE}/documents`, projectDocData, { headers: headers1 });
    const projectDoc = projectDocResponse.data;
    console.log('✅ Project document created:', projectDoc.title, projectDoc._id);

    // User 2 creates a personal document
    console.log('\n5️⃣ User 2 creating a personal document...');
    const user2PersonalDocData = {
      title: 'User 2 Personal Document',
      content: 'This is user 2 personal document',
      // No projectId
    };

    const user2PersonalDocResponse = await axios.post(`${API_BASE}/documents`, user2PersonalDocData, { headers: headers2 });
    const user2PersonalDoc = user2PersonalDocResponse.data;
    console.log('✅ User 2 personal document created:', user2PersonalDoc.title, user2PersonalDoc._id);

    // Test document listing scenarios
    console.log('\n6️⃣ Testing document access scenarios...');

    // User 1 getting all documents (should only see their personal docs)
    console.log('\n📄 User 1 getting personal documents (no projectId)...');
    const user1DocsResponse = await axios.get(`${API_BASE}/documents`, { headers: headers1 });
    const user1Docs = user1DocsResponse.data;    console.log(`User 1 sees ${user1Docs.length} documents:`);
    user1Docs.forEach(doc => {
      console.log(`  - ${doc.title} (project: ${doc.projectId || 'none'}, createdBy: ${doc.createdBy?._id || doc.createdBy})`);
    });

    // User 2 getting all documents (should only see their personal docs)
    console.log('\n📄 User 2 getting personal documents (no projectId)...');
    const user2DocsResponse = await axios.get(`${API_BASE}/documents`, { headers: headers2 });
    const user2Docs = user2DocsResponse.data;    console.log(`User 2 sees ${user2Docs.length} documents:`);
    user2Docs.forEach(doc => {
      console.log(`  - ${doc.title} (project: ${doc.projectId || 'none'}, createdBy: ${doc.createdBy?._id || doc.createdBy})`);
    });

    // User 1 getting project documents
    console.log('\n📄 User 1 getting project documents...');
    const user1ProjectDocsResponse = await axios.get(`${API_BASE}/documents?projectId=${project._id}`, { headers: headers1 });
    const user1ProjectDocs = user1ProjectDocsResponse.data;
    console.log(`User 1 sees ${user1ProjectDocs.length} project documents:`);
    user1ProjectDocs.forEach(doc => {
      console.log(`  - ${doc.title} (project: ${doc.projectId || 'none'})`);
    });

    // User 2 trying to access User 1's project documents (should fail)
    console.log('\n📄 User 2 trying to access User 1\'s project documents (should fail)...');
    try {
      const user2ProjectDocsResponse = await axios.get(`${API_BASE}/documents?projectId=${project._id}`, { headers: headers2 });
      console.log('❌ SECURITY ISSUE: User 2 can access User 1\'s project documents!');
      console.log(`User 2 sees ${user2ProjectDocsResponse.data.length} documents they shouldn't see`);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ SECURITY OK: User 2 correctly denied access to User 1\'s project');
      } else {
        console.log('❓ Unexpected error:', error.response?.status, error.response?.data?.message);
      }
    }    console.log('\n🎯 Test Results Summary:');
    console.log(`- User 1 personal documents: ${user1Docs.filter(d => !d.projectId).length} (should be 1)`);
    console.log(`- User 2 personal documents: ${user2Docs.filter(d => !d.projectId).length} (should be 1)`);
    
    // Check if User 1 can see User 2's documents
    const user1SeeingUser2Docs = user1Docs.some(d => {
      const createdById = d.createdBy?._id || d.createdBy;
      return createdById.toString() !== user1Response.user._id.toString();
    });
    console.log(`- User 1 can see User 2's docs: ${user1SeeingUser2Docs} (should be false)`);
    
    // Check if User 2 can see User 1's documents  
    const user2SeeingUser1Docs = user2Docs.some(d => {
      const createdById = d.createdBy?._id || d.createdBy;
      return createdById.toString() !== user2Response.user._id.toString();
    });
    console.log(`- User 2 can see User 1's docs: ${user2SeeingUser1Docs} (should be false)`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testDocumentAccess();
