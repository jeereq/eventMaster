import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, hasStoredToken } from '../lib/api';
import type {
  AuthLoginResponse,
  OrgAccess,
  PlanCapabilities,
  ProfileResponse,
  RegisterResult,
  Tenant,
  User,
  VerificationMethod,
} from '../types/auth';

interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  access: OrgAccess | null;
  planFeatures: PlanCapabilities | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    tenantName: string,
    phone?: string,
    verificationMethod?: VerificationMethod,
    acceptTerms?: boolean,
    acceptPrivacy?: boolean,
    referralCode?: string,
  ) => Promise<RegisterResult>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string, verificationMethod?: VerificationMethod) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applySession(
  data: AuthLoginResponse,
  setters: {
    setUser: (u: User | null) => void;
    setTenant: (t: Tenant | null) => void;
    setAccess: (a: OrgAccess | null) => void;
  },
) {
  setters.setUser(data.user);
  setters.setTenant(data.tenant ?? null);
  setters.setAccess(data.access ?? null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [access, setAccess] = useState<OrgAccess | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  const setters = useMemo(
    () => ({ setUser, setTenant, setAccess }),
    [],
  );

  const refreshPlanFeatures = useCallback(async () => {
    try {
      const data = await api.get<PlanCapabilities>('/billing/plan-features');
      setPlanFeatures(data);
    } catch {
      setPlanFeatures(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const data = await api.get<ProfileResponse>('/auth/profile');
    setUser(data.user);
    setTenant(data.tenant ?? null);
    setAccess(data.access ?? null);
    await refreshPlanFeatures();
  }, [refreshPlanFeatures]);

  useEffect(() => {
    (async () => {
      try {
        if (await hasStoredToken()) {
          await refreshProfile();
        }
      } catch {
        await setToken(null);
        setUser(null);
        setTenant(null);
        setAccess(null);
        setPlanFeatures(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<AuthLoginResponse>('/auth/login', { email, password });
      await setToken(data.token);
      applySession(data, setters);
      await refreshPlanFeatures();
    },
    [setters, refreshPlanFeatures],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      tenantName: string,
      phone?: string,
      verificationMethod?: VerificationMethod,
      acceptTerms?: boolean,
      acceptPrivacy?: boolean,
      referralCode?: string,
    ): Promise<RegisterResult> => {
      const data = await api.post<RegisterResult & { email?: string; verificationMethod?: VerificationMethod }>(
        '/auth/register',
        {
          email,
          password,
          name,
          tenantName,
          phone,
          verificationMethod,
          acceptTerms,
          acceptPrivacy,
          referralCode,
        },
      );
      return {
        message: data.message,
        requiresVerification: data.requiresVerification,
        email: data.email,
        verificationMethod: data.verificationMethod,
      };
    },
    [],
  );

  const verifyOtp = useCallback(
    async (email: string, otp: string) => {
      const data = await api.post<AuthLoginResponse>('/auth/verify-otp', { email, otp });
      await setToken(data.token);
      applySession(data, setters);
      await refreshPlanFeatures();
    },
    [setters, refreshPlanFeatures],
  );

  const resendOtp = useCallback(async (email: string, verificationMethod?: VerificationMethod) => {
    const data = await api.post<{ message: string }>('/auth/resend-otp', { email, verificationMethod });
    return data.message;
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
    setTenant(null);
    setAccess(null);
    setPlanFeatures(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      access,
      planFeatures,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      refreshProfile,
    }),
    [user, tenant, access, planFeatures, loading, login, register, verifyOtp, resendOtp, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }
  return ctx;
}

export function getHomeRoute(user: User | null, access: OrgAccess | null): string {
  if (!user) return '/(auth)/login';
  return '/(app)/(tabs)';
}
