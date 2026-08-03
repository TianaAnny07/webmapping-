// import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import * as authService from '../services/auth';
// import { AppUser } from '../services/auth';

// interface AuthContextValue {
//   user: AppUser | null;
//   loading: boolean;
//   login: (email: string, password: string) => Promise<void>;
//   register: (email: string, password: string, role: 'admin' | 'visitor', username?: string) => Promise<void>;
//   logout: () => Promise<void>;
//   refreshProfile: () => Promise<void>;
//   setUser: (u: AppUser) => void;
// }

// const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<AppUser | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     authService.getStoredUser().then((u) => {
//       setUser(u);
//       setLoading(false);
//     });
//   }, []);

//   const login = async (email: string, password: string) => {
//     const u = await authService.login(email, password);
//     setUser(u);
//   };

//   const register = async (email: string, password: string, role: 'admin' | 'visitor', username?: string) => {
//     const u = await authService.register(email, password, role, username);
//     setUser(u);
//   };

//   const logout = async () => {
//     await authService.logout();
//     setUser(null);
//   };

//   const refreshProfile = async () => {
//     const u = await authService.fetchProfile();
//     setUser(u);
//   };

//   return (
//     <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, setUser }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
//   return ctx;
// }
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setBootstrapping(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, role: string, username?: string) => {
    const data = await authService.register(email, password, role, username);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, bootstrapping, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}