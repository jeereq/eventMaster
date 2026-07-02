'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
}

interface Tenant {
  id: string;
  name: string;
  plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  licenseActive?: boolean;
  licenseExpiresAt?: string | null;
  managerId?: string | null;
}

interface RegisterResult {
  message: string;
  requiresVerification?: boolean;
  email?: string;
  verificationMethod?: 'EMAIL' | 'WHATSAPP';
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, tenantName: string, phone?: string, verificationMethod?: 'EMAIL' | 'WHATSAPP', acceptTerms?: boolean, acceptPrivacy?: boolean) => Promise<RegisterResult>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string, verificationMethod?: 'EMAIL' | 'WHATSAPP') => Promise<string>;
  logout: () => void;
  refreshBilling: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserAndTenant: (user: User, tenant: Tenant | null) => void;
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
      // Fetch latest profile asynchronously to sync state with server
      api.get('/auth/profile')
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          if (data.tenant) {
            setTenant(data.tenant);
            localStorage.setItem('tenant', JSON.stringify(data.tenant));
          }
        })
        .catch((err) => console.error('Error auto-refreshing profile on mount:', err));
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
      setLoading(false);

      router.push('/dashboard');
    } catch (error: any) {
      setLoading(false);
      if (error?.data?.notVerified && error?.data?.email) {
        router.push(`/verify-otp?email=${encodeURIComponent(error.data.email as string)}&method=${error.data.verificationMethod || 'EMAIL'}`);
        return;
      }
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, tenantName: string, phone?: string, verificationMethod?: 'EMAIL' | 'WHATSAPP', acceptTerms?: boolean, acceptPrivacy?: boolean) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { email, password, name, tenantName, phone, verificationMethod, acceptTerms, acceptPrivacy });
      setLoading(false);
      return {
        message: data.message || 'Inscription réussie ! Saisissez le code OTP reçu.',
        requiresVerification: data.requiresVerification,
        email: data.email,
        verificationMethod: data.verificationMethod,
      };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', { email, otp });
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
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const resendOtp = async (email: string, verificationMethod?: 'EMAIL' | 'WHATSAPP') => {
    const data = await api.post('/auth/resend-otp', { email, verificationMethod });
    return data.message as string;
  };

  const updateUserAndTenant = (updatedUser: User, updatedTenant: Tenant | null) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    if (updatedTenant) {
      setTenant(updatedTenant);
      localStorage.setItem('tenant', JSON.stringify(updatedTenant));
    } else {
      setTenant(null);
      localStorage.removeItem('tenant');
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

  const refreshProfile = async () => {
    try {
      const data = await api.get('/auth/profile');
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data.tenant) {
        setTenant(data.tenant);
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
      } else {
        setTenant(null);
        localStorage.removeItem('tenant');
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, tenant, token, loading, login, register, verifyOtp, resendOtp, logout, refreshBilling, refreshProfile, updateUserAndTenant }}>
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
