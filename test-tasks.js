import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Test script to debug task filtering issues
async function testTaskAPI() {
  console.log('🔍 Testing Task API and Project Filtering...\n');
  
  try {
    // Get auth token (you'll need to replace this with a valid token)
    const token = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token from localStorage
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('1. Testing: Get all tasks');
    const allTasksResponse = await axios.get(`${API_BASE_URL}/tasks`, { headers });
    console.log(`   Found ${allTasksResponse.data.length} total tasks`);
    console.log('   Sample task:', JSON.stringify(allTasksResponse.data[0], null, 2));
    
    console.log('\n2. Testing: Get all projects');
    const projectsResponse = await axios.get(`${API_BASE_URL}/projects`, { headers });
    console.log(`   Found ${projectsResponse.data.length} projects`);
    projectsResponse.data.forEach(project => {
      console.log(`   - ${project.name} (ID: ${project._id})`);
    });

    if (projectsResponse.data.length > 0) {
      const testProjectId = projectsResponse.data[0]._id;
      console.log(`\n3. Testing: Get tasks for specific project (${testProjectId})`);
      
      const projectTasksResponse = await axios.get(`${API_BASE_URL}/tasks?projectId=${testProjectId}`, { headers });
      console.log(`   Found ${projectTasksResponse.data.length} tasks for this project`);
      
      projectTasksResponse.data.forEach(task => {
        console.log(`   - "${task.title}" (Status: "${task.status}", ProjectId: ${task.projectId})`);
      });
    }

    console.log('\n4. Checking status values in all tasks:');
    const uniqueStatuses = [...new Set(allTasksResponse.data.map(task => task.status))];
    console.log('   Unique status values:', uniqueStatuses);

    console.log('\n5. Testing: Get kanban columns');
    const columnsResponse = await axios.get(`${API_BASE_URL}/kanban/columns`, { headers });
    console.log('   Available columns:', columnsResponse.data.map(col => col.name || col.id));

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testTaskAPI = testTaskAPI;
  console.log('✅ Test script loaded! Run testTaskAPI() in browser console');
} else {
  // Run directly if in Node.js
  testTaskAPI();
}
