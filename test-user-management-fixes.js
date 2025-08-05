const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5003/api';

async function testUserManagement() {
  console.log('🧪 Testing User Management Authorization Issues...');
  console.log('='.repeat(60));

  try {
    // Step 1: Login as org admin
    console.log('1️⃣ Logging in as organization admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'uday@alluvium.in',
      password: 'Admin@123'
    });

    const token = loginResponse.data.token;
    const adminUser = loginResponse.data.user;
    
    console.log(`✅ Logged in as: ${adminUser.name} (${adminUser.role})`);
    console.log(`Organization: ${adminUser.organization ? adminUser.organization.name || adminUser.organization : 'None'}`);

    // Step 2: Get users in organization
    console.log('\n2️⃣ Getting users in organization...');
    const usersResponse = await axios.get(`${API_BASE}/users/by-organization/${adminUser.organization._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const users = usersResponse.data;
    console.log(`✅ Found ${users.length} users in organization`);
    
    if (users.length === 0) {
      console.log('ℹ️ No users found to test updates with');
      return;
    }

    // Find a user to update (not the admin themselves)
    const targetUser = users.find(u => u._id !== adminUser._id);
    if (!targetUser) {
      console.log('ℹ️ No other users found to test updates with');
      return;
    }

    console.log(`Target user: ${targetUser.name} (${targetUser.email}) - Role: ${targetUser.role}, Status: ${targetUser.status}`);

    // Step 3: Test updating user details
    console.log('\n3️⃣ Testing user update...');
    
    const updateData = {
      name: targetUser.name + ' (Updated)',
      email: targetUser.email,
      role: targetUser.role === 'member' ? 'viewer' : 'member',
      status: targetUser.status === 'active' ? 'inactive' : 'active'
    };

    console.log('Update data:', updateData);

    const updateResponse = await axios.put(`${API_BASE}/users/${targetUser._id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ User updated successfully!');
    console.log('Updated user:', {
      name: updateResponse.data.name,
      role: updateResponse.data.role,
      status: updateResponse.data.status
    });

    // Step 4: Test validation by clearing required fields
    console.log('\n4️⃣ Testing validation with empty name...');
    
    try {
      await axios.put(`${API_BASE}/users/${targetUser._id}`, {
        name: '',
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('⚠️ Validation should have failed but didn\'t');
    } catch (validationError) {
      if (validationError.response?.status === 400) {
        console.log('✅ Validation working correctly - empty name rejected');
      } else {
        console.log('❌ Unexpected validation error:', validationError.response?.data?.message);
      }
    }

    // Step 5: Test role-only update
    console.log('\n5️⃣ Testing role-only update...');
    
    const roleOnlyUpdate = {
      name: updateResponse.data.name,
      email: updateResponse.data.email,
      role: updateResponse.data.role === 'member' ? 'viewer' : 'member',
      status: updateResponse.data.status
    };

    const roleUpdateResponse = await axios.put(`${API_BASE}/users/${targetUser._id}`, roleOnlyUpdate, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Role updated successfully!');
    console.log('New role:', roleUpdateResponse.data.role);

    // Step 6: Test status-only update
    console.log('\n6️⃣ Testing status-only update...');
    
    const statusOnlyUpdate = {
      name: roleUpdateResponse.data.name,
      email: roleUpdateResponse.data.email,
      role: roleUpdateResponse.data.role,
      status: roleUpdateResponse.data.status === 'active' ? 'inactive' : 'active'
    };

    const statusUpdateResponse = await axios.put(`${API_BASE}/users/${targetUser._id}`, statusOnlyUpdate, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Status updated successfully!');
    console.log('New status:', statusUpdateResponse.data.status);

    console.log('\n🎉 All user management tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserManagement().catch(console.error);
}

module.exports = testUserManagement;
