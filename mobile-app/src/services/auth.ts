import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { User } from '../types';

/**
 * Service d'authentification mobile — même contrat que
 * frontend/src/services/api.js (authService), adapté à AsyncStorage
 * (React Native n'a pas de localStorage).
 */
export const authService = {
  async register(email: string, password: string, role: string, username?: string) {
    const { data } = await api.post('/auth/register', { email, password, role, username });
    if (data.access_token) {
      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.access_token) {
      await AsyncStorage.setItem('token', data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    await AsyncStorage.multiRemove(['token', 'user']);
  },

  async getCurrentUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  async isAuthenticated(): Promise<boolean> {
    return !!(await AsyncStorage.getItem('token'));
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get('/auth/profile');
    return data;
  },

  async updateProfile(body: { username?: string; avatar?: string | null; password?: string }): Promise<User> {
    const { data } = await api.patch('/auth/profile', body);
    const stored = await this.getCurrentUser();
    const updated = { ...stored, username: data.username, avatar: data.avatar } as User;
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    return updated;
  },
};