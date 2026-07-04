export type UserRole = 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
export type OrgRole = 'MANAGER' | 'PROTOCOL' | 'COMMERCIAL' | null;
export type VerificationMethod = 'EMAIL' | 'WHATSAPP';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  orgRole?: OrgRole;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
  licenseActive?: boolean;
  licenseExpiresAt?: string | null;
  managerId?: string | null;
}

export interface OrgAccess {
  level: 'owner' | 'manager' | 'protocol' | 'commercial' | 'staff' | 'none';
  orgRole: OrgRole;
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

export interface AuthLoginResponse {
  token: string;
  user: User;
  tenant: Tenant | null;
  access: OrgAccess | null;
}

export interface RegisterResult {
  message: string;
  requiresVerification?: boolean;
  email?: string;
  verificationMethod?: VerificationMethod;
}

export interface ProfileResponse {
  user: User;
  tenant: Tenant | null;
  access: OrgAccess | null;
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
