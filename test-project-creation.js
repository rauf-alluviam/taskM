const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testProjectCreation() {
  try {
    console.log('Testing project creation without teamId...');

    // Test 1: Create project without teamId (should work)
    const projectData1 = {
      name: 'Test Project Without Team',
      description: 'This is a test project created without specifying a team',
      department: 'Engineering'
      // No teamId specified
    };

    console.log('Test 1: Creating project without teamId');
    console.log('Project data:', JSON.stringify(projectData1, null, 2));

    // Test 2: Create project with empty teamId (should work)
    const projectData2 = {
      name: 'Test Project With Empty Team',
      description: 'This is a test project created with empty teamId',
      department: 'Engineering',
      teamId: '' // Empty string
    };

    console.log('\nTest 2: Creating project with empty teamId');
    console.log('Project data:', JSON.stringify(projectData2, null, 2));

    // Test 3: Create project with null teamId (should work)
    const projectData3 = {
      name: 'Test Project With Null Team',
      description: 'This is a test project created with null teamId',
      department: 'Engineering',
      teamId: null // Null value
    };

    console.log('\nTest 3: Creating project with null teamId');
    console.log('Project data:', JSON.stringify(projectData3, null, 2));

    console.log('\n✅ All test cases prepared successfully!');
    console.log('\nTo run these tests:');
    console.log('1. Make sure your server is running on localhost:5000');
    console.log('2. Get a valid authentication token');
    console.log('3. Use a tool like Postman or curl to send POST requests to /api/projects');
    console.log('4. Include the auth token in the Authorization header');

  } catch (error) {
    console.error('❌ Test preparation failed:', error.message);
  }
}

testProjectCreation();
