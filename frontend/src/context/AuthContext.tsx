'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
}

interface Tenant {
  id: string;
  name: string;
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, tenantName: string) => Promise<{ message: string }>;
  logout: () => void;
  refreshBilling: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if token exists on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedTenant) {
        setTenant(JSON.parse(savedTenant));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.tenant) {
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
      } else {
        localStorage.removeItem('tenant');
      }

      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);
      
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, tenantName: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { email, password, name, tenantName });
      setLoading(false);
      return { message: data.message || 'Inscription réussie ! Veuillez vérifier vos e-mails pour confirmer votre compte.' };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setToken(null);
    setUser(null);
    setTenant(null);
    router.push('/login');
  };

  const refreshBilling = async () => {
    try {
      const billingData = await api.get('/billing/status');
      if (tenant) {
        const updatedTenant = { ...tenant, plan: billingData.plan };
        setTenant(updatedTenant);
        localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      }
    } catch (error) {
      console.error('Error refreshing billing:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, tenant, token, loading, login, register, logout, refreshBilling }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
