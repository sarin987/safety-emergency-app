import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config';

const BASE_URL = config.API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding token to request:', error);
    return config;
  }
});

// Handle token expiration
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('token');
        // Navigation will be handled by the auth context
      } catch (e) {
        console.error('Error removing token:', e);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  register: async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  },

  verifyPhone: async (phone: string, code: string) => {
    try {
      const response = await api.post('/auth/verify-phone', { phone, code });
      return response.data;
    } catch (error) {
      console.error('Error verifying phone:', error);
      throw error;
    }
  },
};

export const emergencyAPI = {
  sendSOS: async (data: {
    latitude: number;
    longitude: number;
    type: 'medical' | 'police' | 'fire';
    description?: string;
  }) => {
    try {
      const response = await api.post('/emergency/sos', data);
      return response.data;
    } catch (error) {
      console.error('Error sending SOS:', error);
      throw error;
    }
  },

  cancelSOS: async (emergencyId: string) => {
    try {
      const response = await api.post(`/emergency/${emergencyId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error canceling SOS:', error);
      throw error;
    }
  },

  getActiveEmergencies: async () => {
    try {
      const response = await api.get('/emergency/active');
      return response.data;
    } catch (error) {
      console.error('Error getting active emergencies:', error);
      throw error;
    }
  },
};

export const healthAPI = {
  updateVitals: async (data: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    steps?: number;
  }) => {
    try {
      const response = await api.post('/health/vitals', data);
      return response.data;
    } catch (error) {
      console.error('Error updating vitals:', error);
      throw error;
    }
  },

  getHealthHistory: async (startDate: string, endDate: string) => {
    try {
      const response = await api.get('/health/history', {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting health history:', error);
      throw error;
    }
  },
};

export const locationAPI = {
  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
  }) => {
    try {
      const response = await api.post('/location/update', data);
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  getNearbyHelp: async (latitude: number, longitude: number, radius: number) => {
    try {
      const response = await api.get('/location/nearby-help', {
        params: { latitude, longitude, radius },
      });
      return response.data;
    } catch (error) {
      console.error('Error getting nearby help:', error);
      throw error;
    }
  },
};

export const chatAPI = {
  getConversations: async () => {
    try {
      const response = await api.get('/chat/conversations');
      return response.data;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  },

  getMessages: async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },

  sendMessage: async (conversationId: string, message: string) => {
    try {
      const response = await api.post(`/chat/${conversationId}/messages`, {
        message,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
};

export default api;
