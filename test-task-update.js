// Test script to verify task update API
// Run this in browser console to test the API

async function testTaskUpdate() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No auth token found. Please login first.');
    return;
  }

  try {
    // First, get all tasks to find a test task
    const tasksResponse = await fetch('http://localhost:5001/api/tasks', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Tasks API failed: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log('📋 Found tasks:', tasks.length);
    
    if (tasks.length === 0) {
      console.log('No tasks found to test with');
      return;
    }
    
    const testTask = tasks[0];
    console.log('🎯 Testing with task:', testTask.title, 'Current status:', testTask.status);
    
    // Try to update the task status
    const newStatus = testTask.status === 'todo' ? 'in-progress' : 'todo';
    
    const updateResponse = await fetch(`http://localhost:5001/api/tasks/${testTask._id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Update API failed: ${updateResponse.status} - ${errorText}`);
    }
    
    const updatedTask = await updateResponse.json();
    console.log('✅ Task updated successfully:', updatedTask);
    console.log('🔄 Status changed from', testTask.status, 'to', updatedTask.status);
    
    // Verify the change persisted by fetching the task again
    const verifyResponse = await fetch(`http://localhost:5001/api/tasks/${testTask._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifiedTask = await verifyResponse.json();
    console.log('🔍 Verification - task status is now:', verifiedTask.status);
    
    if (verifiedTask.status === newStatus) {
      console.log('✅ SUCCESS: Task status persisted correctly!');
    } else {
      console.log('❌ FAILED: Task status did not persist');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Make function available globally
window.testTaskUpdate = testTaskUpdate;
console.log('Test script loaded. Run testTaskUpdate() to test the API.');
