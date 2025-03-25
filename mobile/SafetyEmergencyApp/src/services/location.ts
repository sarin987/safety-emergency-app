import * as Location from 'expo-location';
import { locationAPI } from './api';
import realtimeService from './realtime';

interface LocationUpdateOptions {
  highAccuracy?: boolean;
  updateInterval?: number;
}

class LocationService {
  private watchId: Location.LocationSubscription | null = null;
  private updateInterval: number = 30000; // 30 seconds
  private highAccuracy: boolean = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startTracking(options: LocationUpdateOptions = {}): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return false;
      }

      this.highAccuracy = options.highAccuracy ?? false;
      this.updateInterval = options.updateInterval ?? 30000;

      if (this.watchId) {
        await this.stopTracking();
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: this.highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: this.updateInterval,
          distanceInterval: this.highAccuracy ? 10 : 50, // meters
        },
        async (location) => {
          try {
            await locationAPI.updateLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy ?? 0,
              speed: location.coords.speed ?? undefined,
            });
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.watchId) {
        await this.watchId.remove();
        this.watchId = null;
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return null;
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async getNearbyHelp(radius: number = 5000) { // 5km radius by default
    try {
      const location = await this.getCurrentLocation();
      if (!location) {
        throw new Error('Location not available');
      }
      const nearbyHelp = await locationAPI.getNearbyHelp(
        location.coords.latitude,
        location.coords.longitude,
        radius
      );
      return nearbyHelp;
    } catch (error) {
      console.error('Error getting nearby help:', error);
      throw error;
    }
  }
}

export default new LocationService();
