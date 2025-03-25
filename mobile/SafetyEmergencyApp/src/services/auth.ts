import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from './api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'user' | 'admin' | 'emergency_service';
    service_type?: 'police' | 'ambulance' | 'fire';
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

class AuthService {
  private static readonly TOKEN_KEY = '@auth_token';
  private static readonly USER_KEY = '@user_data';
  private static readonly TOKEN_TIMESTAMP_KEY = '@token_timestamp';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startSessionCheck();
  }

  private startSessionCheck() {
    // Check session every minute
    this.sessionCheckInterval = setInterval(async () => {
      const isExpired = await this.isSessionExpired();
      if (isExpired) {
        this.handleSessionExpired();
      }
    }, 60 * 1000);
  }

  private async isSessionExpired(): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(AuthService.TOKEN_TIMESTAMP_KEY);
      if (!timestampStr) return true;

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      return now - timestamp > AuthService.SESSION_TIMEOUT;
    } catch {
      return true;
    }
  }

  private async handleSessionExpired() {
    await this.logout();
    // You'll need to implement this in your app's navigation
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'Login', params: { message: 'Session expired. Please login again.' } }],
    // });
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await authAPI.login(credentials.email, credentials.password);
      await this.saveToken(response.token);
      await this.saveUser(response.user);
      await this.updateTokenTimestamp();
      return response;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      throw new Error('Failed to login. Please try again.');
    }
  }

  async register(data: RegisterData): Promise<{ userId: string }> {
    try {
      const response = await authAPI.register({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number
      });
      return response;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Email or phone number already registered');
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    try {
      const response = await authAPI.verifyPhone(phone, code);
      return response.verified;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid verification code');
      }
      throw new Error('Phone verification failed. Please try again.');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await authAPI.requestPasswordReset(email);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Email not found');
      }
      throw new Error('Failed to send reset email. Please try again.');
    }
  }

  async verifyResetCode(email: string, code: string): Promise<string> {
    try {
      const response = await authAPI.verifyResetCode(email, code);
      return response.resetToken;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid reset code');
      }
      throw new Error('Failed to verify reset code. Please try again.');
    }
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      await authAPI.resetPassword(resetToken, newPassword);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid reset token');
      }
      throw new Error('Failed to reset password. Please try again.');
    }
  }

  async deleteAccount(password: string): Promise<void> {
    try {
      await authAPI.deleteAccount(password);
      await this.logout();
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid password');
      }
      throw new Error('Failed to delete account. Please try again.');
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = null;
      }
      await AsyncStorage.multiRemove([
        AuthService.TOKEN_KEY,
        AuthService.USER_KEY,
        AuthService.TOKEN_TIMESTAMP_KEY
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const [token, isExpired] = await Promise.all([
        AsyncStorage.getItem(AuthService.TOKEN_KEY),
        this.isSessionExpired()
      ]);
      return !!token && !isExpired;
    } catch {
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const isExpired = await this.isSessionExpired();
      if (isExpired) {
        await this.handleSessionExpired();
        return null;
      }
      return await AsyncStorage.getItem(AuthService.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async getUser(): Promise<LoginResponse['user'] | null> {
    try {
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  private async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(AuthService.TOKEN_KEY, token);
  }

  private async saveUser(user: LoginResponse['user']): Promise<void> {
    await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  private async updateTokenTimestamp(): Promise<void> {
    await AsyncStorage.setItem(
      AuthService.TOKEN_TIMESTAMP_KEY,
      Date.now().toString()
    );
  }
}

export const authService = new AuthService();
