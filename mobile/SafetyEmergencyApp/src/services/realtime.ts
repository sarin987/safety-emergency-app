import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { config } from '../config';

interface EmergencyData {
  id: string;
  type: 'medical' | 'police' | 'fire';
  latitude: number;
  longitude: number;
  description?: string;
  status: 'active' | 'resolved' | 'cancelled';
  userId: string;
  createdAt: string;
}

interface LocationData {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  timestamp: string;
}

class RealtimeService {
  private socket: Socket | null = null;
  private emergencyCallbacks: ((data: EmergencyData) => void)[] = [];
  private locationUpdateCallbacks: ((data: LocationData) => void)[] = [];

  async initialize() {
    try {
      const token = await AsyncStorage.getItem('token');

      this.socket = io(config.SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      this.setupSocketListeners();
      await this.setupNotifications();
    } catch (error) {
      console.error('Error initializing realtime service:', error);
    }
  }

  private async setupNotifications() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergency', {
          name: 'Emergency',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
        });
      }

      await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to realtime service');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from realtime service');
    });

    this.socket.on('emergency:new', async (data: EmergencyData) => {
      this.emergencyCallbacks.forEach(callback => callback(data));
      await this.showEmergencyNotification(data);
    });

    this.socket.on('location:update', (data: LocationData) => {
      this.locationUpdateCallbacks.forEach(callback => callback(data));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  private async showEmergencyNotification(emergency: EmergencyData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Emergency Alert',
          body: `New ${emergency.type} emergency reported nearby`,
          data: { emergencyId: emergency.id },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  onEmergency(callback: (data: EmergencyData) => void) {
    this.emergencyCallbacks.push(callback);
    return () => {
      this.emergencyCallbacks = this.emergencyCallbacks.filter(cb => cb !== callback);
    };
  }

  onLocationUpdate(callback: (data: LocationData) => void) {
    this.locationUpdateCallbacks.push(callback);
    return () => {
      this.locationUpdateCallbacks = this.locationUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new RealtimeService();
