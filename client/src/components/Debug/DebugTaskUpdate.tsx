import React from 'react';
import { taskAPI } from '../../services/api';

interface DebugTaskUpdateProps {
  taskId: string;
  currentStatus: string;
}

const DebugTaskUpdate: React.FC<DebugTaskUpdateProps> = ({ taskId, currentStatus }) => {
  const testUpdate = async () => {
    const newStatus = currentStatus === 'todo' ? 'in-progress' : 'todo';
    
    try {
      console.log('🧪 Testing API update:', { taskId, currentStatus, newStatus });
      
      // First, get the current task to see its status before update
      const currentTask = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const currentTaskData = await currentTask.json();
      console.log('📋 Task before update:', currentTaskData);
      
      // Now update it
      const result = await taskAPI.updateTask(taskId, { status: newStatus });
      console.log('✅ API update result:', result);
      
      // Check again after update
      const updatedTask = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const updatedTaskData = await updatedTask.json();
      console.log('📋 Task after update:', updatedTaskData);
      
      if (updatedTaskData.status === newStatus) {
        alert(`✅ SUCCESS! Status changed from "${currentStatus}" to "${updatedTaskData.status}"`);
      } else {
        alert(`❌ FAILED! Expected "${newStatus}" but got "${updatedTaskData.status}"`);
      }
      
    } catch (error) {
      console.error('❌ API test failed:', error);
      alert(`API test failed: ${error.message}`);
    }
  };

  return (
    <button
      onClick={testUpdate}
      className="bg-red-500 text-white px-2 py-1 text-xs rounded"
      style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 100 }}
    >
      Test API
    </button>
  );
};

export default DebugTaskUpdate;
