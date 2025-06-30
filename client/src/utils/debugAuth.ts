// Debug utility to check authentication status
export const debugAuth = () => {
  console.log('🔍 Auth Debug Information:');
  
  // Check localStorage
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('taskm_refresh_token');
  
  console.log('📱 LocalStorage:');
  console.log('  Token:', token ? `${token.substring(0, 20)}...` : 'Not found');
  console.log('  Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Not found');
  
  // Check if token is valid JWT format
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('🔑 Token Payload:');
        console.log('  User ID:', payload.userId);
        console.log('  Issued At:', new Date(payload.iat * 1000));
        console.log('  Expires At:', new Date(payload.exp * 1000));
        console.log('  Is Expired:', Date.now() > payload.exp * 1000);
      } else {
        console.log('❌ Invalid JWT format');
      }
    } catch (error) {
      console.log('❌ Error parsing token:', error);
    }
  }
  
  // Check API base URL
  console.log('🌐 API Configuration:');
  console.log('  Base URL:', (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api');
  console.log('  Socket URL:', (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000');
  
  return {
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    token: token ? `${token.substring(0, 20)}...` : null
  };
};

// Function to test API authentication
export const testApiAuth = async () => {
  try {
    const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🧪 Auth Test Result:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('  User Data:', data);
      return { success: true, data };
    } else {
      const error = await response.text();
      console.log('  Error:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.log('❌ Network Error:', error);
    return { success: false, error };
  }
};

export default debugAuth;