import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error;
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, name: string, role: string) => {
    const response = await api.post('/auth/register', { email, password, name, role });
    return response.data;
  },
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export const taskAPI = {
  getTasks: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const response = await api.get('/tasks', { params });
    return response.data;
  },
  createTask: async (taskData: any) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  updateTask: async (id: string, taskData: any) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },
  deleteTask: async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

export const projectAPI = {
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  getProject: async (id: string) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  createProject: async (projectData: any) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  },
  updateProject: async (id: string, projectData: any) => {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },
  deleteProject: async (id: string) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

export const documentAPI = {
  getDocuments: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const response = await api.get('/documents', { params });
    return response.data;
  },
  getDocument: async (id: string) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },
  createDocument: async (documentData: any) => {
    const response = await api.post('/documents', documentData);
    return response.data;
  },
  updateDocument: async (id: string, documentData: any) => {
    const response = await api.put(`/documents/${id}`, documentData);
    return response.data;
  },
  deleteDocument: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },
};

export const kanbanAPI = {
  getColumns: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const response = await api.get('/kanban/columns', { params });
    return response.data;
  },
  updateColumns: async (columns: any[], projectId?: string) => {
    const response = await api.put('/kanban/columns', { columns, projectId });
    return response.data;
  },
  addColumn: async (title: string, color: string, projectId?: string) => {
    const response = await api.post('/kanban/columns', { title, color, projectId });
    return response.data;
  },
  deleteColumn: async (columnId: string, projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const response = await api.delete(`/kanban/columns/${columnId}`, { params });
    return response.data;
  },
};

export const fileAPI = {
  uploadFile: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  deleteFile: async (fileUrl: string) => {
    const response = await api.delete('/files/delete', { data: { fileUrl } });
    return response.data;
  },
};

export const userAPI = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  updateUser: async (userId: string, userData: any) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

export const analyticsAPI = {
  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  },
  getTaskStats: async () => {
    const response = await api.get('/analytics/tasks');
    return response.data;
  },
  getProjectStats: async () => {
    const response = await api.get('/analytics/projects');
    return response.data;
  },
};

export const settingsAPI = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSettings: async (settings: any) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },
};

export default api;