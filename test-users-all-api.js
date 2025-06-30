/**
 * Test script for the simplified /users/all API endpoint
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

const TEST_USER = {
  name: 'Alice Admin',
  email: 'alice@org.com',
  password: 'password123'
};

async function testUsersAllAPI() {
  try {
    console.log('🧪 Testing /users/all API endpoint...\n');

    // Step 1: Login or register a test user
    console.log('1️⃣ Authenticating user...');
    let authResponse;
    try {
      authResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        console.log('User not found, creating new user...');
        authResponse = await axios.post(`${API_BASE}/auth/register`, TEST_USER);
      } else {
        throw error;
      }
    }

    const token = authResponse.data.token;
    const user = authResponse.data.user;
    console.log(`✅ Authenticated as: ${user.name} (${user.email})`);

    // Step 2: Test /users/members-selection endpoint
    console.log('\n2️⃣ Testing /users/members-selection endpoint...');
    const usersResponse = await axios.get(`${API_BASE}/users/members-selection`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const usersData = usersResponse.data;
    console.log(`✅ API Response Status: ${usersResponse.status}`);
    console.log(`✅ Users count: ${usersData.count}`);
    console.log(`✅ Users array length: ${usersData.users?.length || 0}`);
    
    if (usersData.users && usersData.users.length > 0) {
      console.log('\n📊 Sample user data:');
      const sampleUser = usersData.users[0];
      console.log({
        id: sampleUser._id,
        name: sampleUser.name,
        email: sampleUser.email,
        role: sampleUser.role,
        organization: sampleUser.organization?.name || 'None'
      });
    }

    // Step 3: Test filtering scenario
    console.log('\n3️⃣ Testing client-side filtering scenario...');
    
    // Simulate project members to filter out
    const mockProjectMembers = [
      { user: { _id: usersData.users?.[0]?._id } }, // First user is already a member
    ];
    
    const existingMemberIds = mockProjectMembers.map(member => member.user._id);
    const availableUsers = usersData.users?.filter(user => !existingMemberIds.includes(user._id)) || [];
    
    console.log(`✅ Total users: ${usersData.users?.length || 0}`);
    console.log(`✅ Existing members: ${existingMemberIds.length}`);
    console.log(`✅ Available for assignment: ${availableUsers.length}`);

    console.log('\n🎉 All tests passed! /users/members-selection API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`   Status: ${error.response.status}`);
    }
    process.exit(1);
  }
}

// Run the test
testUsersAllAPI();