import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// PDF Service
export const pdfService = {
  uploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/pdfs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getUserPdfs: async () => {
    const response = await api.get('/pdfs/my-pdfs');
    return response.data;
  },
  
  getPdfById: async (id: string) => {
    const response = await api.get(`/pdfs/pdf/${id}`);
    return response.data;
  },
  
  getPdfByShareToken: async (shareToken: string) => {
    const response = await api.get(`/pdfs/shared/${shareToken}`);
    return response.data;
  },
  
  getPdfFileUrl: (id: string) => {
    return `${API_URL}/pdfs/pdf/${id}/file`;
  },
  
  getSharedPdfFileUrl: (shareToken: string) => {
    return `${API_URL}/pdfs/shared/${shareToken}/file`;
  },
  
  sharePdf: async (id: string, email: string, accessType = 'view') => {
    const response = await api.post(`/pdfs/pdf/${id}/share`, { email, accessType });
    return response.data;
  },
  
  deletePdf: async (id: string) => {
    const response = await api.delete(`/pdfs/pdf/${id}`);
    return response.data;
  },
};

// Comment Service
export const commentService = {
  getPdfComments: async (pdfId: string) => {
    const response = await api.get(`/comments/pdf/${pdfId}/comments`);
    return response.data;
  },
  
  getSharedPdfComments: async (shareToken: string) => {
    const response = await api.get(`/comments/shared/${shareToken}/comments`);
    return response.data;
  },
  
  addComment: async (pdfId: string, comment: any) => {
    const response = await api.post(`/comments/pdf/${pdfId}/comment`, comment);
    return response.data;
  },
  
  addCommentToShared: async (shareToken: string, comment: any) => {
    const response = await api.post(`/comments/shared/${shareToken}/comment`, comment);
    return response.data;
  },
  
  deleteComment: async (commentId: string) => {
    const response = await api.delete(`/comments/comment/${commentId}`);
    return response.data;
  },
  
  editComment: async (commentId: string, text: string) => {
    const response = await api.put(`/comments/comment/${commentId}`, { text });
    return response.data;
  },
};

export default api; 