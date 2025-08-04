#!/usr/bin/env node

/**
 * Test script for the three failing test cases:
 * TC_047: Documents - Document persistence after tab navigation
 * TC_049: Documents - Document creation with specific project selection  
 * TC_051: User Management - Update User button functionality
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5003/api';
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'uday@alluvium.in', // Update with actual admin credentials
      password: 'Admin@123'
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testDocumentPersistence() {
  console.log('\n=== TC_047: Testing Document Persistence ===');
  
  try {
    // Create a test document
    const createResponse = await axios.post(`${API_BASE}/documents`, {
      title: 'Test123',
      content: 'This is a test document for persistence testing'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const documentId = createResponse.data._id;
    console.log('✅ Document "Test123" created successfully');
    
    // Fetch all documents to simulate tab navigation
    const fetchResponse = await axios.get(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const foundDoc = fetchResponse.data.find(doc => doc._id === documentId);
    if (foundDoc) {
      console.log('✅ Document "Test123" persists after navigation');
      
      // Cleanup
      await axios.delete(`${API_BASE}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Test document cleaned up');
      return true;
    } else {
      console.log('❌ Document "Test123" disappeared after navigation');
      return false;
    }
  } catch (error) {
    console.log('❌ Document persistence test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testProjectDocumentCreation() {
  console.log('\n=== TC_049: Testing Project Document Creation ===');
  
  try {
    // First get available projects
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (projectsResponse.data.length === 0) {
      console.log('❌ No projects available for testing');
      return false;
    }
    
    const testProject = projectsResponse.data[0];
    console.log(`📁 Using project: ${testProject.name}`);
    
    // Create a document with project association
    const createResponse = await axios.post(`${API_BASE}/documents`, {
      title: 'ProjectDoc1',
      content: 'This is a test document for project association',
      projectId: testProject._id
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const documentId = createResponse.data._id;
    console.log('✅ Document "ProjectDoc1" created with project association');
    
    // Fetch project-specific documents
    const fetchResponse = await axios.get(`${API_BASE}/documents?project=${testProject._id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const foundDoc = fetchResponse.data.find(doc => doc._id === documentId);
    if (foundDoc && foundDoc.projectId === testProject._id) {
      console.log('✅ Project document persists correctly');
      
      // Cleanup
      await axios.delete(`${API_BASE}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Test project document cleaned up');
      return true;
    } else {
      console.log('❌ Project document disappeared or lost association');
      return false;
    }
  } catch (error) {
    console.log('❌ Project document creation test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserUpdate() {
  console.log('\n=== TC_051: Testing User Update Functionality ===');
  
  try {
    // Get current user
    const userResponse = await axios.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const currentUser = userResponse.data;
    console.log(`👤 Current user: ${currentUser.name} (${currentUser.email})`);
    
    // Get all users to find one to update
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const testUser = usersResponse.data.find(user => user._id !== currentUser._id);
    if (!testUser) {
      console.log('❌ No other users available for testing');
      return false;
    }
    
    console.log(`🎯 Testing update on user: ${testUser.name}`);
    
    // Test user update
    const originalName = testUser.name;
    const testName = `${originalName} (Updated)`;
    
    const updateResponse = await axios.put(`${API_BASE}/users/${testUser._id}`, {
      name: testName,
      email: testUser.email,
      role: testUser.role,
      status: testUser.status
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (updateResponse.data.name === testName) {
      console.log('✅ User update successful');
      
      // Restore original name
      await axios.put(`${API_BASE}/users/${testUser._id}`, {
        name: originalName,
        email: testUser.email,
        role: testUser.role,
        status: testUser.status
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ User name restored');
      return true;
    } else {
      console.log('❌ User update failed - name not changed');
      return false;
    }
  } catch (error) {
    console.log('❌ User update test failed:', error.response?.data?.message || error.message);
    console.log('Error details:', error.response?.status, error.response?.statusText);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Test Case Validation\n');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  const results = {
    TC_047: await testDocumentPersistence(),
    TC_049: await testProjectDocumentCreation(), 
    TC_051: await testUserUpdate()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([testCase, result]) => {
    console.log(`${testCase}: ${result ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const passCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 ${passCount}/3 tests passed`);
  
  if (passCount === 3) {
    console.log('🎉 All test cases fixed successfully!');
  } else {
    console.log('⚠️  Some test cases still need attention');
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
