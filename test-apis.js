import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

// Test credentials - you may need to adjust these
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  role: 'member'
};

async function testAPIs() {
  let token;
  
  try {
    console.log('🧪 Starting API Tests...\n');

    // 1. Test User Registration/Login
    console.log('1️⃣ Testing Authentication...');
    
    try {
      // Try to register a test user
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      token = registerResponse.data.token;
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        // User exists, try to login
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        token = loginResponse.data.token;
        console.log('✅ User logged in successfully');
      } else {
        throw error;
      }
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Project Creation
    console.log('\n2️⃣ Testing Project Creation...');
    
    const projectData = {
      name: 'Test Project API',
      description: 'A test project created via API',
      department: 'Engineering',
      kanbanColumns: [
        { name: 'To Do', order: 0 },
        { name: 'In Progress', order: 1 },
        { name: 'Review', order: 2 },
        { name: 'Done', order: 3 }
      ]
    };

    const projectResponse = await axios.post(`${API_BASE}/projects`, projectData, { headers });
    const project = projectResponse.data;
    console.log('✅ Project created successfully:', project.name);

    // 3. Test Document Creation
    console.log('\n3️⃣ Testing Document Creation...');
    
    const documentData = {
      title: 'Test Document API',
      content: 'This is a test document created via API',
      projectId: project._id
    };

    const documentResponse = await axios.post(`${API_BASE}/documents`, documentData, { headers });
    const document = documentResponse.data;
    console.log('✅ Document created successfully:', document.title);

    // 4. Test Getting Projects
    console.log('\n4️⃣ Testing Get Projects...');
    const getProjectsResponse = await axios.get(`${API_BASE}/projects`, { headers });
    console.log('✅ Projects retrieved:', getProjectsResponse.data.length, 'projects');

    // 5. Test Getting Documents
    console.log('\n5️⃣ Testing Get Documents...');
    const getDocumentsResponse = await axios.get(`${API_BASE}/documents`, { headers });
    console.log('✅ Documents retrieved:', getDocumentsResponse.data.length, 'documents');

    // 6. Test Kanban Columns
    console.log('\n6️⃣ Testing Kanban Columns...');
    const getColumnsResponse = await axios.get(`${API_BASE}/kanban/columns?projectId=${project._id}`, { headers });
    console.log('✅ Kanban columns retrieved:', getColumnsResponse.data.length, 'columns');

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Project ID: ${project._id}`);
    console.log(`- Document ID: ${document._id}`);
    console.log(`- User token: ${token.substring(0, 20)}...`);

  } catch (error) {
    console.error('❌ API Test failed:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPIs();
}

export default testAPIs;
