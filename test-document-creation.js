import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

async function testDocumentCreation() {
  console.log('🧪 Testing Document Creation...\n');

  try {
    // Login first
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'user1@example.com',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Logged in successfully');

    // Test document creation
    console.log('\n2️⃣ Creating a document...');
    const documentData = {
      title: 'Test Document Creation',
      content: 'This is a test document',
      // No projectId - personal document
    };

    console.log('Document data:', documentData);
    const documentResponse = await axios.post(`${API_BASE}/documents`, documentData, { headers });
    const document = documentResponse.data;
    console.log('✅ Document created successfully:', document.title, document._id);

  } catch (error) {
    console.error('❌ Document creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Error message:', error.response?.data?.message);
    console.error('Full error data:', error.response?.data);
    console.error('Request data:', error.config?.data);
  }
}

testDocumentCreation();
