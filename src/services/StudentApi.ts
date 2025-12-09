import axios, { type AxiosInstance } from 'axios';

export interface Student {
  ra: string;
  name: string;
  email?: string;
  cpf?: string;
  course: string;
  period: number;
  status: string;
  birthdDate?: Date;
  admission?: Date;
  dueDate: Date,
  photo?: string;
  qrcode?: string;
}

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const StudentApi = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/estudantes/listar-todos');
    return response.data;
  },

  getById: async (ra: string): Promise<Student> => {
    const response = await api.get(`/estudantes/${ra}`);
    return response.data;
  },

  create: async (studentData: Omit<Student, 'ra'>): Promise<Student> => {
    const response = await api.post('/estudantes', studentData);
    return response.data;
  },

  update: async (ra: string, studentData: Partial<Student>): Promise<Student> => {
    const response = await api.put(`/estudantes/${ra}`, studentData);
    return response.data;
  },

  delete: async (ra: string): Promise<void> => {
    await api.delete(`/estudantes/${ra}`);
  },

  updateStatus: async (ra: string, situacao: string): Promise<Student> => {
    const response = await api.patch(`/estudantes/${ra}/situacao`, { situacao });
    return response.data;
  },
};

export default StudentApi;