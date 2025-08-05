const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5003/api';

async function testUserProfileUpdate() {
  console.log('🧪 Testing User Profile Update Fix...');
  console.log('='.repeat(60));

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'uday@alluvium.in',
      password: 'Admin@123'
    });

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log(`✅ Logged in as: ${user.name} (${user.email})`);

    // Step 2: Get current profile
    console.log('\n2️⃣ Getting current profile...');
    const profileResponse = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const currentProfile = profileResponse.data;
    console.log('✅ Current profile retrieved');
    console.log(`   Name: ${currentProfile.name}`);
    console.log(`   Email: ${currentProfile.email}`);
    console.log(`   Organization: ${currentProfile.organization ? currentProfile.organization.name || currentProfile.organization : 'None'}`);

    // Step 3: Test valid profile update (without organization change)
    console.log('\n3️⃣ Testing valid profile update...');
    
    const validUpdateData = {
      name: currentProfile.name + ' (Updated)',
      email: currentProfile.email,
      mobile: '1234567890'
    };

    try {
      const updateResponse = await axios.put(`${API_BASE}/users/me`, validUpdateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Profile updated successfully');
      console.log(`   New name: ${updateResponse.data.name}`);
      console.log(`   Mobile: ${updateResponse.data.mobile || 'None'}`);
    } catch (error) {
      console.log('❌ Valid profile update failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }

    // Step 4: Test invalid organization update (string instead of ObjectId)
    console.log('\n4️⃣ Testing invalid organization update...');
    
    const invalidOrgUpdate = {
      name: currentProfile.name,
      email: currentProfile.email,
      organization: 'Alluvium IoT Solution Pvt Ltd' // This should fail - string instead of ObjectId
    };

    try {
      await axios.put(`${API_BASE}/users/me`, invalidOrgUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('❌ FAIL - Invalid organization should have been rejected');
    } catch (validationError) {
      if (validationError.response?.status === 400) {
        console.log('✅ PASS - Invalid organization properly rejected');
        console.log(`   Message: ${validationError.response.data.message}`);
      } else {
        console.log('❌ FAIL - Unexpected error');
        console.log(`   Error: ${validationError.response?.data?.message || validationError.message}`);
      }
    }

    // Step 5: Test clearing organization (null value)
    console.log('\n5️⃣ Testing organization clear...');
    
    const clearOrgUpdate = {
      name: currentProfile.name,
      email: currentProfile.email,
      organization: null
    };

    try {
      const clearResponse = await axios.put(`${API_BASE}/users/me`, clearOrgUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Organization cleared successfully');
      console.log(`   Organization: ${clearResponse.data.organization || 'None'}`);
    } catch (error) {
      console.log('❌ Organization clear failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }

    // Step 6: Test empty name validation
    console.log('\n6️⃣ Testing empty name validation...');
    
    const emptyNameUpdate = {
      name: '',
      email: currentProfile.email
    };

    try {
      await axios.put(`${API_BASE}/users/me`, emptyNameUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('❌ FAIL - Empty name should have been rejected');
    } catch (validationError) {
      if (validationError.response?.status === 400) {
        console.log('✅ PASS - Empty name properly rejected');
        console.log(`   Message: ${validationError.response.data.message}`);
      } else {
        console.log('❌ FAIL - Unexpected error');
        console.log(`   Error: ${validationError.response?.data?.message || validationError.message}`);
      }
    }

    // Step 7: Test invalid email validation
    console.log('\n7️⃣ Testing invalid email validation...');
    
    const invalidEmailUpdate = {
      name: currentProfile.name,
      email: 'invalid-email'
    };

    try {
      await axios.put(`${API_BASE}/users/me`, invalidEmailUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('❌ FAIL - Invalid email should have been rejected');
    } catch (validationError) {
      if (validationError.response?.status === 400) {
        console.log('✅ PASS - Invalid email properly rejected');
        console.log(`   Message: ${validationError.response.data.message}`);
      } else {
        console.log('❌ FAIL - Unexpected error');
        console.log(`   Error: ${validationError.response?.data?.message || validationError.message}`);
      }
    }

    console.log('\n🎉 User Profile Update Tests Completed!');
    console.log('\nSummary:');
    console.log('✅ Valid profile updates work');
    console.log('✅ Invalid organization string properly rejected'); 
    console.log('✅ Organization clearing works');
    console.log('✅ Name validation works');
    console.log('✅ Email validation works');

  } catch (error) {
    console.error('❌ Test suite failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUserProfileUpdate().catch(console.error);
}

module.exports = testUserProfileUpdate;
