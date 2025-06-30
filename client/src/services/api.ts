import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
const API_TIMEOUT = (import.meta as any).env.VITE_API_TIMEOUT || 10000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Exponential backoff delay
const getRetryDelay = (attempt: number) => INITIAL_RETRY_DELAY * Math.pow(2, attempt);

// Check if error is retryable
const isRetryableError = (error: any) => {
  if (!error.response) return true; // Network errors are retryable
  const status = error.response.status;
  return status === 429 || status >= 500; // Retry on rate limit and server errors
};

// Retry wrapper function
const withRetry = async (fn: () => Promise<any>, retries = MAX_RETRIES): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && isRetryableError(error)) {
      const delay = getRetryDelay(MAX_RETRIES - retries);
      console.log(`Request failed, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Log rate limit info for debugging
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Response:', error.response.data);
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        console.warn(`Retry after: ${retryAfter} seconds`);
      }
    }
    
    throw error;
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    return withRetry(async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    });
  },
  register: async (email: string, password: string, name: string, role: string) => {
    return withRetry(async () => {
      const response = await api.post('/auth/register', { email, password, name, role });
      return response.data;
    });
  },
  verifyToken: async () => {
    return withRetry(async () => {
      const response = await api.get('/auth/verify');
      return response.data;
    });
  },
};

export const taskAPI = {
  getTasks: async (projectId?: string) => {
    return withRetry(async () => {
      const params = projectId ? { projectId } : {};
      const response = await api.get('/tasks', { params });
      return response.data;
    });
  },
  createTask: async (task: any) => {
    return withRetry(async () => {
      const response = await api.post('/tasks', task);
      return response.data;
    });
  },
  updateTask: async (id: string, taskData: any) => {
    console.log('🌐 API.UPDATETASK CALLED!', { id, taskData });
    console.log('🌐 Making HTTP PUT request to:', `/tasks/${id}`);
    
    return withRetry(async () => {
      const response = await api.put(`/tasks/${id}`, taskData);
      console.log('🌐 API RESPONSE RECEIVED!', response.data);
      return response.data;
    });
  },
  deleteTask: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    });
  },
  // Subtask management
  createSubtask: async (parentTaskId: string, subtaskData: any) => {
    return withRetry(async () => {
      const response = await api.post('/subtasks', { ...subtaskData, parentTaskId });
      return response.data;
    });
  },
  getSubtasks: async (parentTaskId: string) => {
    return withRetry(async () => {
      const response = await api.get(`/subtasks/task/${parentTaskId}`);
      return response.data;
    });
  },
  updateSubtask: async (subtaskId: string, subtaskData: any) => {
    return withRetry(async () => {
      const response = await api.put(`/subtasks/${subtaskId}`, subtaskData);
      return response.data;
    });
  },
  deleteSubtask: async (subtaskId: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/subtasks/${subtaskId}`);
      return response.data;
    });
  },
  getSubtaskStats: async (parentTaskId: string) => {
    return withRetry(async () => {
      const response = await api.get(`/subtasks/task/${parentTaskId}/stats`);
      return response.data;
    });
  },
  getTaskHistory: async (taskId: string, page = 1, limit = 50) => {
    return withRetry(async () => {
      const response = await api.get(`/tasks/${taskId}/history`, {
        params: { page, limit }
      });
      return response.data;
    });
  },
};

export const projectAPI = {
  getProjects: async () => {
    return withRetry(async () => {
      const response = await api.get('/projects');
      return response.data;
    });
  },
  getProject: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    });
  },
  createProject: async (projectData: any) => {
    return withRetry(async () => {
      const response = await api.post('/projects', projectData);
      return response.data;
    });
  },
  updateProject: async (id: string, projectData: any) => {
    return withRetry(async () => {
      const response = await api.put(`/projects/${id}`, projectData);
      return response.data;
    });
  },
  deleteProject: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    });
  },
};

export const documentAPI = {
  getDocuments: async (projectId?: string) => {
    return withRetry(async () => {
      const params = projectId ? { projectId } : {};
      const response = await api.get('/documents', { params });
      return response.data;
    });
  },
  getDocument: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/documents/${id}`);
      return response.data;
    });
  },
  createDocument: async (documentData: any) => {
    return withRetry(async () => {
      const response = await api.post('/documents', documentData);
      return response.data;
    });
  },
  updateDocument: async (id: string, documentData: any) => {
    return withRetry(async () => {
      const response = await api.put(`/documents/${id}`, documentData);
      return response.data;
    });
  },
  deleteDocument: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    });
  },
  importDocument: async (formData: FormData) => {
    // Don't use retry wrapper for file uploads to avoid timeout issues
    const response = await api.post('/documents/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for file uploads
    });
    return response.data;
  },
  getDownloadUrl: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/documents/${id}/download`);
      return response.data;
    });
  },
};

export const kanbanAPI = {
  getColumns: async (projectId?: string) => {
    return withRetry(async () => {
      const params = projectId ? { projectId } : {};
      const response = await api.get('/kanban/columns', { params });
      return response.data;
    });
  },
  updateColumns: async (columns: any[], projectId?: string) => {
    return withRetry(async () => {
      const response = await api.put('/kanban/columns', { columns, projectId });
      return response.data;
    });
  },
  addColumn: async (title: string, color: string, projectId?: string) => {
    return withRetry(async () => {
      const response = await api.post('/kanban/columns', { title, color, projectId });
      return response.data;
    });
  },
  deleteColumn: async (columnId: string, projectId?: string) => {
    return withRetry(async () => {
      const params = projectId ? { projectId } : {};
      const response = await api.delete(`/kanban/columns/${columnId}`, { params });
      return response.data;
    });
  },
};

export const fileAPI = {
  uploadFile: async (file: File, type: string) => {
    return withRetry(async () => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    });
  },
  deleteFile: async (fileUrl: string) => {
    return withRetry(async () => {
      const response = await api.delete('/files/delete', { data: { fileUrl } });
      return response.data;
    });
  },
};

export const userAPI = {
  getCurrentUser: async () => {
    return withRetry(async () => {
      const response = await api.get('/users/me');
      return response.data;
    });
  },
  updateCurrentUser: async (userData: any) => {
    return withRetry(async () => {
      const response = await api.put('/users/me', userData);
      return response.data;
    });
  },
  uploadAvatar: async (file: File) => {
    return withRetry(async () => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    });
  },
  getUsers: async () => {
    return withRetry(async () => {
      const response = await api.get('/users');
      return response.data;
    });
  },
  createUser: async (userData: any) => {
    return withRetry(async () => {
      const response = await api.post('/users', userData);
      return response.data;
    });
  },
  getAllUsers: async () => {
    return withRetry(async () => {
      const response = await api.get('/users');
      return response.data;
    });
  },
  updateUser: async (userId: string, userData: any) => {
    return withRetry(async () => {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    });
  },
  deleteUser: async (userId: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    });
  },
};

export const analyticsAPI = {
  getAnalytics: async () => {
    return withRetry(async () => {
      const response = await api.get('/analytics');
      return response.data;
    });
  },
  getTaskStats: async () => {
    return withRetry(async () => {
      const response = await api.get('/analytics/tasks');
      return response.data;
    });
  },
  getProjectStats: async () => {
    return withRetry(async () => {
      const response = await api.get('/analytics/projects');
      return response.data;
    });
  },
};

export const settingsAPI = {
  getSettings: async () => {
    return withRetry(async () => {
      const response = await api.get('/settings');
      return response.data;
    });
  },
  updateSettings: async (settings: any) => {
    return withRetry(async () => {
      const response = await api.put('/settings', settings);
      return response.data;
    });
  },
};

export const attachmentAPI = {
  upload: async (file: File, attachedTo: string, attachedToId: string, description?: string) => {
    // Don't use retry wrapper for file uploads to avoid timeout issues
    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachedTo', attachedTo);
    formData.append('attachedToId', attachedToId);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for larger file uploads
    });
    return response.data;
  },
  getAttachments: async (attachedTo: string, attachedToId: string) => {
    return withRetry(async () => {
      const response = await api.get(`/attachments/${attachedTo}/${attachedToId}`);
      return response.data;
    });
  },
  getDownloadUrl: async (attachmentId: string) => {
    return withRetry(async () => {
      const response = await api.get(`/attachments/download/${attachmentId}`);
      return response.data;
    });
  },
  deleteAttachment: async (attachmentId: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/attachments/${attachmentId}`);
      return response.data;
    });
  },
  updateAttachment: async (attachmentId: string, description: string) => {
    return withRetry(async () => {
      const response = await api.patch(`/attachments/${attachmentId}`, { description });
      return response.data;
    });
  },
};

// Organization API
export const organizationAPI = {
  getMyOrganization: async () => {
    return withRetry(async () => {
      const response = await api.get('/organizations/my-organization');
      return response.data;
    });
  },
  getOrganization: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/organizations/${id}`);
      return response.data;
    });
  },
  createOrganization: async (data: any) => {
    return withRetry(async () => {
      const response = await api.post('/organizations', data);
      return response.data;
    });
  },
  updateOrganization: async (id: string, data: any) => {
    return withRetry(async () => {
      const response = await api.put(`/organizations/${id}`, data);
      return response.data;
    });
  },
  getMembers: async (id: string, params?: any) => {
    return withRetry(async () => {
      const response = await api.get(`/organizations/${id}/members`, { params });
      return response.data;
    });
  },
  addAdmin: async (orgId: string, userId: string) => {
    return withRetry(async () => {
      const response = await api.post(`/organizations/${orgId}/admins`, { userId });
      return response.data;
    });
  },
  removeAdmin: async (orgId: string, userId: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/organizations/${orgId}/admins/${userId}`);
      return response.data;
    });
  },
  inviteMembers: async (orgId: string, data: any) => {
    return withRetry(async () => {
      const response = await api.post(`/organizations/${orgId}/invite`, data);
      return response.data;
    });
  },
  getStats: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/organizations/${id}/stats`);
      return response.data;
    });
  },
  deleteOrganization: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/organizations/${id}`);
      return response.data;
    });
  },
};

// Team API
export const teamAPI = {
  getTeams: async () => {
    return withRetry(async () => {
      const response = await api.get('/teams');
      return response.data;
    });
  },
  getMyTeams: async () => {
    return withRetry(async () => {
      const response = await api.get('/teams/my-teams');
      return response.data;
    });
  },
  getTeam: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/teams/${id}`);
      return response.data;
    });
  },
  createTeam: async (data: any) => {
    return withRetry(async () => {
      const response = await api.post('/teams', data);
      return response.data;
    });
  },
  updateTeam: async (id: string, data: any) => {
    return withRetry(async () => {
      const response = await api.put(`/teams/${id}`, data);
      return response.data;
    });
  },
  addMember: async (teamId: string, userId: string, role?: string) => {
    return withRetry(async () => {
      const response = await api.post(`/teams/${teamId}/members`, { userId, role });
      return response.data;
    });
  },
  removeMember: async (teamId: string, userId: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/teams/${teamId}/members/${userId}`);
      return response.data;
    });
  },
  updateMemberRole: async (teamId: string, userId: string, role: string) => {
    return withRetry(async () => {
      const response = await api.put(`/teams/${teamId}/members/${userId}/role`, { role });
      return response.data;
    });
  },
  getTeamProjects: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/teams/${id}/projects`);
      return response.data;
    });
  },
  getTeamStats: async (id: string) => {
    return withRetry(async () => {
      const response = await api.get(`/teams/${id}/stats`);
      return response.data;
    });
  },
  deleteTeam: async (id: string) => {
    return withRetry(async () => {
      const response = await api.delete(`/teams/${id}`);
      return response.data;
    });
  },
};

export default api;