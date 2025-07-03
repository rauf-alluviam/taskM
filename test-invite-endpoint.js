const axios = require('axios');

async function testInviteEndpoint() {
  try {
    // First, let's test if we can reach the health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5001/api/health');
    console.log('Health check successful:', healthResponse.data);

    // Test the invite endpoint (this should fail with authentication error, which is expected)
    console.log('\nTesting invite endpoint without auth...');
    try {
      const inviteResponse = await axios.post('http://localhost:5001/api/organizations/test-id/invite', {
        emails: ['test@example.com'],
        role: 'member'
      });
    } catch (error) {
      if (error.response) {
        console.log('Invite endpoint responded with status:', error.response.status);
        console.log('Response:', error.response.data);
        
        if (error.response.status === 401) {
          console.log('✅ Invite endpoint is accessible (authentication required as expected)');
        } else if (error.response.status === 404) {
          console.log('❌ Invite endpoint not found - route registration issue');
        } else {
          console.log('⚠️ Unexpected status code');
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInviteEndpoint();
