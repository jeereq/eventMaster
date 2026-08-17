'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import type { PlanId } from '@/config/landingPricing';
import { applyBrandToDocument, clearBrandFromDocument, type TenantBranding } from '@/lib/brandTheme';

export interface OrgAccess {
  level: 'owner' | 'manager' | 'protocol' | 'commercial' | 'staff' | 'none';
  orgRole: 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL' | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canManageRooms: boolean;
  canCreateEvents: boolean;
  canCreateRooms: boolean;
  canManageAllEvents: boolean;
  canProtocolAllEvents: boolean;
  canViewBilling: boolean;
  canViewInvoices: boolean;
  isProtocolOnly: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  orgRole?: 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL' | null;
}

interface Tenant {
  id: string;
  name: string;
  plan: PlanId;
  licenseActive?: boolean;
  licenseExpiresAt?: string | null;
  managerId?: string | null;
  branding?: TenantBranding;
  accountKind?: 'ORGANIZER' | 'VENDOR' | 'BOTH';
}

interface RegisterResult {
  message: string;
  requiresVerification?: boolean;
  email?: string;
  verificationMethod?: 'EMAIL' | 'WHATSAPP';
}

export interface PlanCapabilities {
  protocolQr: boolean;
  seatNotifications: boolean;
  customTemplates: boolean;
  mockupOcr: boolean;
  roomThemesFixtures: boolean;
  commercialNetwork: boolean;
  adminReports: boolean;
  roomEditorLevel: string;
  allowedRoomTypes?: string[];
  supportLevel: string;
}

export interface PlanQuotaInfo {
  usage: {
    events: number;
    guests: number;
    templates: number;
    rooms: number;
    orgManagers: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    maxRooms: number;
    maxOrgManagers: number;
  };
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  access: OrgAccess | null;
  planFeatures: PlanCapabilities | null;
  planQuota: PlanQuotaInfo | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    tenantName: string,
    phone?: string,
    verificationMethod?: 'EMAIL' | 'WHATSAPP',
    acceptTerms?: boolean,
    acceptPrivacy?: boolean,
    referralCode?: string,
    phoneCountryCode?: string,
    nationalNumber?: string,
    accountKind?: 'ORGANIZER' | 'VENDOR' | 'BOTH',
  ) => Promise<RegisterResult>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string, verificationMethod?: 'EMAIL' | 'WHATSAPP') => Promise<string>;
  logout: () => void;
  refreshBilling: () => Promise<void>;
  refreshPlanFeatures: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserAndTenant: (user: User, tenant: Tenant | null) => void;
  updateBranding: (payload: TenantBranding & { reset?: boolean }) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistAccess(access: OrgAccess | null) {
  if (access) {
    localStorage.setItem('access', JSON.stringify(access));
  } else {
    localStorage.removeItem('access');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [access, setAccess] = useState<OrgAccess | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanCapabilities | null>(null);
  const [planQuota, setPlanQuota] = useState<PlanQuotaInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');
    const savedAccess = localStorage.getItem('access');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedTenant) setTenant(JSON.parse(savedTenant));
      if (savedAccess) setAccess(JSON.parse(savedAccess));

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
          if (data.access !== undefined) {
            setAccess(data.access);
            persistAccess(data.access);
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
      persistAccess(data.access ?? null);

      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant ?? null);
      setAccess(data.access ?? null);
      setLoading(false);

      if (data.user?.role === 'COMMERCIAL') {
        router.push('/dashboard?tab=tenants');
      } else if (data.access?.level === 'commercial') {
        router.push('/dashboard/org-commercial');
      } else if (data.access?.isProtocolOnly) {
        router.push('/dashboard/events?mode=protocol');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setLoading(false);
      if (error?.data?.notVerified && error?.data?.email) {
        router.push(`/verify-otp?email=${encodeURIComponent(error.data.email as string)}&method=${error.data.verificationMethod || 'EMAIL'}&from=login`);
        return;
      }
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    tenantName: string,
    phone?: string,
    verificationMethod?: 'EMAIL' | 'WHATSAPP',
    acceptTerms?: boolean,
    acceptPrivacy?: boolean,
    referralCode?: string,
    phoneCountryCode?: string,
    nationalNumber?: string,
    accountKind?: 'ORGANIZER' | 'VENDOR' | 'BOTH',
  ) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        email,
        password,
        name,
        tenantName,
        phone,
        phoneCountryCode,
        nationalNumber,
        verificationMethod,
        acceptTerms,
        acceptPrivacy,
        referralCode,
        accountKind,
      });
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
      persistAccess(data.access ?? null);
      setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant ?? null);
      setAccess(data.access ?? null);
      setLoading(false);
      if (data.user?.role === 'COMMERCIAL') {
        router.push('/dashboard?tab=tenants');
      } else if (data.access?.level === 'commercial') {
        router.push('/dashboard/org-commercial');
      }
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
    localStorage.removeItem('access');
    setToken(null);
    setUser(null);
    setTenant(null);
    setAccess(null);
    setPlanFeatures(null);
    setPlanQuota(null);
    router.push('/login');
  };

  const refreshPlanFeatures = async () => {
    try {
      const data = await api.get('/billing/plan-features');
      setPlanFeatures(data.capabilities ?? null);
      if (data.usage && data.limits) {
        setPlanQuota({ usage: data.usage, limits: data.limits });
      }
    } catch {
      setPlanFeatures(null);
      setPlanQuota(null);
    }
  };

  useEffect(() => {
    if (token && tenant?.id && user?.role === 'USER') {
      refreshPlanFeatures();
    }
  }, [token, tenant?.id, user?.role]);

  useEffect(() => {
    if (tenant?.branding) {
      applyBrandToDocument(tenant.branding);
    } else if (!tenant) {
      clearBrandFromDocument();
    } else {
      applyBrandToDocument(null);
    }
    // Laisse la personnalisation de vue (accent user) se réappliquer par-dessus
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('em-brand-applied'));
    }
  }, [tenant?.id, tenant?.branding?.primary, tenant?.branding?.accent, tenant?.branding?.sidebar]);

  const updateBranding = async (payload: TenantBranding & { reset?: boolean }) => {
    const data = await api.put('/billing/branding', payload);
    if (data.tenant) {
      const next = { ...data.tenant, branding: data.branding };
      setTenant(next);
      localStorage.setItem('tenant', JSON.stringify(next));
      applyBrandToDocument(payload.reset ? null : data.branding);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('em-brand-applied'));
      }
    }
    return data;
  };

  const refreshBilling = async () => {
    try {
      const billingData = await api.get('/billing/status');
      if (tenant) {
        const updatedTenant = { ...tenant, plan: billingData.plan };
        setTenant(updatedTenant);
        localStorage.setItem('tenant', JSON.stringify(updatedTenant));
      }
      if (billingData.capabilities) {
        setPlanFeatures(billingData.capabilities);
      }
      if (billingData.usage && billingData.limits) {
        setPlanQuota({ usage: billingData.usage, limits: billingData.limits });
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
      if (data.access !== undefined) {
        setAccess(data.access);
        persistAccess(data.access);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, tenant, access, planFeatures, planQuota, token, loading, login, register, verifyOtp, resendOtp,
      logout, refreshBilling, refreshPlanFeatures, refreshProfile, updateUserAndTenant, updateBranding,
    }}>
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
