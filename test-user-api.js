// Test the enhanced user API for member selection
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// You'll need to replace these with actual values from your system
const TEST_CONFIG = {
  // Get these from your database or from a login response
  authToken: 'your-jwt-token-here',
  organizationId: 'your-organization-id-here',
  projectId: 'your-project-id-here'
};

async function testUserAPI() {
  const headers = {
    'Authorization': `Bearer ${TEST_CONFIG.authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testing Enhanced User API for Member Selection\n');

  try {
    // Test 1: Get all organization users
    console.log('1️⃣ Testing: Get all organization users');
    const allUsersResponse = await axios.get(
      `${API_BASE}/users/organization/${TEST_CONFIG.organizationId}`,
      { headers }
    );
    console.log('✅ All users:', allUsersResponse.data.users?.length || 0, 'users found');
    console.log('📊 Pagination:', allUsersResponse.data.pagination);

    // Test 2: Get organization users excluding project members
    console.log('\n2️⃣ Testing: Get organization users excluding project members');
    const filteredUsersResponse = await axios.get(
      `${API_BASE}/users/organization/${TEST_CONFIG.organizationId}?excludeProject=${TEST_CONFIG.projectId}`,
      { headers }
    );
    console.log('✅ Filtered users:', filteredUsersResponse.data.users?.length || 0, 'users found');
    console.log('🚫 Excluded:', filteredUsersResponse.data.filters?.excludedCount || 0, 'project members');

    // Test 3: Search for users
    console.log('\n3️⃣ Testing: Search for users');
    const searchResponse = await axios.get(
      `${API_BASE}/users/organization/${TEST_CONFIG.organizationId}?search=test&excludeProject=${TEST_CONFIG.projectId}`,
      { headers }
    );
    console.log('✅ Search results:', searchResponse.data.users?.length || 0, 'users found');

    // Test 4: Paginated results
    console.log('\n4️⃣ Testing: Paginated results');
    const paginatedResponse = await axios.get(
      `${API_BASE}/users/organization/${TEST_CONFIG.organizationId}?page=1&limit=5&excludeProject=${TEST_CONFIG.projectId}`,
      { headers }
    );
    console.log('✅ Paginated users:', paginatedResponse.data.users?.length || 0, 'users found');
    console.log('📄 Page info:', paginatedResponse.data.pagination);

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 To run this test:');
    console.log('1. Make sure your server is running on port 5000');
    console.log('2. Update TEST_CONFIG with valid token, organizationId, and projectId');
    console.log('3. Run: node test-user-api.js');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testUserAPI();
}

module.exports = { testUserAPI };
