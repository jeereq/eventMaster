'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import type { PlanId } from '@/config/landingPricing';
import { applyBrandToDocument, clearBrandFromDocument, type TenantBranding } from '@/lib/brandTheme';
import type { TenantAccountKind } from '@/lib/marketplace';
import { safeAppPath } from '@/lib/safeAppPath';
import { appendFirstTourQuery } from '@/lib/firstLoginTour';

export interface OrgAccess {
  level: 'owner' | 'manager' | 'protocol' | 'commercial' | 'staff' | 'client' | 'none';
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
  avatarUrl?: string | null;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  orgRole?: 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL' | null;
  impersonatedBy?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  plan: PlanId;
  licenseActive?: boolean;
  licenseExpiresAt?: string | null;
  managerId?: string | null;
  branding?: TenantBranding;
  accountKind?: TenantAccountKind;
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
  customRsvpFields: boolean;
  mockupOcr: boolean;
  roomThemesFixtures: boolean;
  commercialNetwork: boolean;
  adminReports: boolean;
  roomEditorLevel: string;
  allowedRoomTypes?: string[];
  supportLevel: string;
  audience?: 'B2B' | 'B2C' | 'VENUE' | 'SERVICE' | 'CATALOG';
}

export interface PlanQuotaInfo {
  usage: {
    events: number;
    guests: number;
    templates: number;
    rooms: number;
    services: number;
    orgManagers: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    maxRooms: number;
    maxServices: number;
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
  supportSession: boolean;
  login: (email: string, password: string, options?: { next?: string | null }) => Promise<void>;
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
    accountKind?: TenantAccountKind,
  ) => Promise<RegisterResult>;
  verifyOtp: (email: string, otp: string, options?: { next?: string | null }) => Promise<void>;
  resendOtp: (email: string, verificationMethod?: 'EMAIL' | 'WHATSAPP') => Promise<string>;
  logout: () => void;
  refreshBilling: () => Promise<void>;
  refreshPlanFeatures: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserAndTenant: (user: User, tenant: Tenant | null) => void;
  updateBranding: (payload: TenantBranding & { reset?: boolean }) => Promise<any>;
  enterSupportSession: (payload: SupportSessionPayload) => void;
  exitSupportSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPPORT_BACKUP_KEY = 'em-support-backup';

interface SupportBackup {
  token: string;
  user: User;
  tenant: Tenant | null;
  access: OrgAccess | null;
}

export interface SupportSessionPayload {
  token: string;
  user: User;
  tenant: Tenant | null;
  access?: OrgAccess | null;
  support?: {
    impersonatedBy?: string;
    tenantName?: string;
  };
}

function persistAccess(access: OrgAccess | null) {
  if (access) {
    localStorage.setItem('access', JSON.stringify(access));
  } else {
    localStorage.removeItem('access');
  }
}

function persistSession(payload: {
  token: string;
  user: User;
  tenant: Tenant | null;
  access: OrgAccess | null;
}) {
  localStorage.setItem('token', payload.token);
  localStorage.setItem('user', JSON.stringify(payload.user));
  if (payload.tenant) {
    localStorage.setItem('tenant', JSON.stringify(payload.tenant));
  } else {
    localStorage.removeItem('tenant');
  }
  persistAccess(payload.access);
}

function readSupportBackup(): SupportBackup | null {
  try {
    const raw = localStorage.getItem(SUPPORT_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SupportBackup;
  } catch {
    return null;
  }
}

function postAuthPath(userRole?: string, access?: OrgAccess | null) {
  if (userRole === 'SUPER_ADMIN') return '/dashboard?tab=overview';
  if (userRole === 'COMMERCIAL') return '/dashboard?tab=tenants';
  if (access?.level === 'commercial') return '/dashboard/org-commercial';
  if (access?.isProtocolOnly) return '/dashboard/events?mode=protocol';
  if (access?.level === 'client') return '/dashboard/bookings';
  return '/dashboard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [access, setAccess] = useState<OrgAccess | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanCapabilities | null>(null);
  const [planQuota, setPlanQuota] = useState<PlanQuotaInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportSession, setSupportSession] = useState(false);
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
      setSupportSession(Boolean(readSupportBackup()) || Boolean(JSON.parse(savedUser)?.impersonatedBy));

      api.get('/auth/profile')
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (data.user.impersonatedBy) setSupportSession(true);
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

  const login = async (email: string, password: string, options?: { next?: string | null }) => {
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
      setSupportSession(false);
      localStorage.removeItem(SUPPORT_BACKUP_KEY);
      setLoading(false);

      router.push(safeAppPath(options?.next) || postAuthPath(data.user?.role, data.access ?? null));
    } catch (error: any) {
      setLoading(false);
      if (error?.data?.notVerified && error?.data?.email) {
        const nextQ = safeAppPath(options?.next) ? `&next=${encodeURIComponent(safeAppPath(options?.next)!)}` : '';
        router.push(`/verify-otp?email=${encodeURIComponent(error.data.email as string)}&method=${error.data.verificationMethod || 'EMAIL'}&from=login${nextQ}`);
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
    accountKind?: TenantAccountKind,
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

  const verifyOtp = async (email: string, otp: string, options?: { next?: string | null }) => {
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
      setSupportSession(false);
      localStorage.removeItem(SUPPORT_BACKUP_KEY);
      setLoading(false);
      const dest = safeAppPath(options?.next) || postAuthPath(data.user?.role, data.access ?? null);
      router.push(safeAppPath(options?.next) ? dest : appendFirstTourQuery(dest));
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
    localStorage.removeItem(SUPPORT_BACKUP_KEY);
    setToken(null);
    setUser(null);
    setTenant(null);
    setAccess(null);
    setPlanFeatures(null);
    setPlanQuota(null);
    setSupportSession(false);
    router.push('/login');
  };

  const refreshPlanFeatures = async () => {
    try {
      const data = await api.get('/billing/plan-features');
      setPlanFeatures(
        data.capabilities
          ? { ...data.capabilities, audience: data.audience ?? data.capabilities.audience }
          : null,
      );
      if (data.usage && data.limits) {
        setPlanQuota({
          usage: {
            events: data.usage.events ?? 0,
            guests: data.usage.guests ?? 0,
            templates: data.usage.templates ?? 0,
            rooms: data.usage.rooms ?? 0,
            services: data.usage.services ?? 0,
            orgManagers: data.usage.orgManagers ?? 0,
          },
          limits: {
            maxEvents: data.limits.maxEvents ?? 0,
            maxGuests: data.limits.maxGuests ?? 0,
            maxTemplates: data.limits.maxTemplates ?? 0,
            maxRooms: data.limits.maxRooms ?? 0,
            maxServices: data.limits.maxServices ?? 0,
            maxOrgManagers: data.limits.maxOrgManagers ?? 0,
          },
        });
      }
    } catch {
      setPlanFeatures(null);
      setPlanQuota(null);
    }
  };

  useEffect(() => {
    if (token && tenant?.id && user?.role === 'USER' && tenant.accountKind !== 'CLIENT') {
      refreshPlanFeatures();
    }
  }, [token, tenant?.id, tenant?.accountKind, user?.role]);

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
        setPlanFeatures({
          ...billingData.capabilities,
          audience: billingData.planDetails?.audience ?? billingData.capabilities.audience,
        });
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

  const enterSupportSession = (payload: SupportSessionPayload) => {
    if (typeof window === 'undefined') return;
    if (!readSupportBackup()) {
      const currentToken = localStorage.getItem('token');
      const currentUser = localStorage.getItem('user');
      if (currentToken && currentUser) {
        const backup: SupportBackup = {
          token: currentToken,
          user: JSON.parse(currentUser),
          tenant: localStorage.getItem('tenant') ? JSON.parse(localStorage.getItem('tenant') as string) : null,
          access: localStorage.getItem('access') ? JSON.parse(localStorage.getItem('access') as string) : null,
        };
        localStorage.setItem(SUPPORT_BACKUP_KEY, JSON.stringify(backup));
      }
    }
    const nextUser: User = {
      ...payload.user,
      impersonatedBy: payload.user.impersonatedBy || payload.support?.impersonatedBy || user?.id || null,
    };
    persistSession({
      token: payload.token,
      user: nextUser,
      tenant: payload.tenant,
      access: payload.access ?? null,
    });
    window.location.assign('/dashboard');
  };

  const exitSupportSession = () => {
    if (typeof window === 'undefined') return;
    const backup = readSupportBackup();
    localStorage.removeItem(SUPPORT_BACKUP_KEY);
    if (!backup?.token) {
      logout();
      return;
    }
    persistSession(backup);
    window.location.assign('/dashboard?tab=overview');
  };

  return (
    <AuthContext.Provider value={{
      user, tenant, access, planFeatures, planQuota, token, loading, supportSession, login, register, verifyOtp, resendOtp,
      logout, refreshBilling, refreshPlanFeatures, refreshProfile, updateUserAndTenant, updateBranding,
      enterSupportSession, exitSupportSession,
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
