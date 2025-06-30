// Test script to check if the API endpoint is working
// Run this in the browser console

async function testOrgUsersAPI() {
  console.log('🧪 Testing Organization Users API');
  
  // Get current auth info
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('❌ No token found in localStorage');
    return;
  }
  
  // Try to get current user first
  try {
    const authResponse = await fetch('http://localhost:5001/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!authResponse.ok) {
      console.log('❌ Auth verification failed:', authResponse.status, authResponse.statusText);
      return;
    }
    
    const user = await authResponse.json();
    console.log('✅ Auth verified. User:', user);
    
    if (!user.organization) {
      console.log('❌ User has no organization');
      return;
    }
    
    // Now test the organization users endpoint
    const orgUsersResponse = await fetch(`http://localhost:5001/api/users/organization/${user.organization._id}?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Org Users API Response:', orgUsersResponse.status, orgUsersResponse.statusText);
    
    if (orgUsersResponse.ok) {
      const data = await orgUsersResponse.json();
      console.log('✅ Organization users:', data);
    } else {
      const error = await orgUsersResponse.text();
      console.log('❌ Error response:', error);
    }
    
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

// Call the function
testOrgUsersAPI();
