#!/usr/bin/env node

// Test script for organization creation functionality
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test user credentials - you'll need to use real credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

const TEST_ORGANIZATION = {
  name: 'Test Organization',
  description: 'A test organization for validation',
  domain: 'testorg.com',
  website: 'https://testorg.com',
  industry: 'Technology',
  size: '11-50',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    zipCode: '12345'
  }
};

async function testOrganizationCreation() {
  try {
    console.log('🧪 Testing Organization Creation Flow...\n');

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
    console.log(`User type: ${user.userType || 'individual'}`);
    console.log(`Has organization: ${!!user.organization}\n`);

    // Step 2: Create organization
    console.log('2️⃣ Creating organization...');
    const orgResponse = await axios.post(`${API_BASE}/organizations`, TEST_ORGANIZATION, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const organization = orgResponse.data;
    console.log(`✅ Organization created: ${organization.name}`);
    console.log(`Organization ID: ${organization._id}`);
    console.log(`Owner: ${organization.owner.name}`);
    console.log(`Admins: ${organization.admins.map(a => a.name).join(', ')}\n`);

    // Step 3: Verify user was updated
    console.log('3️⃣ Verifying user update...');
    const userResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const updatedUser = userResponse.data;
    console.log(`✅ User updated:`);
    console.log(`User type: ${updatedUser.userType}`);
    console.log(`Role: ${updatedUser.role}`);
    console.log(`Organization: ${updatedUser.organization ? updatedUser.organization.name || updatedUser.organization : 'None'}\n`);

    // Step 4: Get organization details
    console.log('4️⃣ Fetching organization details...');
    const myOrgResponse = await axios.get(`${API_BASE}/organizations/my-organization`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const myOrg = myOrgResponse.data;
    console.log(`✅ Organization details retrieved:`);
    console.log(`Name: ${myOrg.name}`);
    console.log(`Domain: ${myOrg.domain || 'None'}`);
    console.log(`Industry: ${myOrg.industry || 'None'}`);
    console.log(`Size: ${myOrg.size || 'None'}\n`);

    console.log('🎉 All tests passed! Organization creation is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testOrganizationCreation();
