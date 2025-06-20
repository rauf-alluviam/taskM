import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Clean up test data
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  try {
    // Login as test users to get tokens
    const loginResponse1 = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user1@example.com',
      password: 'password123'
    });
    const token1 = loginResponse1.data.token;
    const headers1 = { Authorization: `Bearer ${token1}` };

    const loginResponse2 = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user2@example.com',
      password: 'password123'
    });
    const token2 = loginResponse2.data.token;
    const headers2 = { Authorization: `Bearer ${token2}` };

    // Get and delete User 1's documents
    const user1DocsResponse = await axios.get(`${API_BASE}/documents`, { headers: headers1 });
    const user1Docs = user1DocsResponse.data;
    console.log(`Deleting ${user1Docs.length} documents for User 1...`);
    for (const doc of user1Docs) {
      try {
        await axios.delete(`${API_BASE}/documents/${doc._id}`, { headers: headers1 });
      } catch (error) {
        console.log(`Failed to delete document ${doc._id}:`, error.response?.data?.message);
      }
    }

    // Get and delete User 2's documents  
    const user2DocsResponse = await axios.get(`${API_BASE}/documents`, { headers: headers2 });
    const user2Docs = user2DocsResponse.data;
    console.log(`Deleting ${user2Docs.length} documents for User 2...`);
    for (const doc of user2Docs) {
      try {
        await axios.delete(`${API_BASE}/documents/${doc._id}`, { headers: headers2 });
      } catch (error) {
        console.log(`Failed to delete document ${doc._id}:`, error.response?.data?.message);
      }
    }

    // Get and delete User 1's projects
    const user1ProjectsResponse = await axios.get(`${API_BASE}/projects`, { headers: headers1 });
    const user1Projects = user1ProjectsResponse.data;
    console.log(`Deleting ${user1Projects.length} projects for User 1...`);
    for (const project of user1Projects) {
      try {
        if (project.name.includes('Test') || project.name.includes('User 1')) {
          await axios.delete(`${API_BASE}/projects/${project._id}`, { headers: headers1 });
        }
      } catch (error) {
        console.log(`Failed to delete project ${project._id}:`, error.response?.data?.message);
      }
    }

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
  }
}

cleanupTestData();
