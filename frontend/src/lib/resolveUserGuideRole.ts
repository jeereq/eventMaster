import type { OrgAccess } from '@/context/AuthContext';
import type { UserGuideId } from '@/config/userGuides';

interface ResolveUserGuideInput {
  role?: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  access?: OrgAccess | null;
}

export interface ResolvedUserGuide {
  guideId: UserGuideId;
  label: string;
}

const GUIDE_LABELS: Record<UserGuideId, string> = {
  super_admin: 'Super Administrateur',
  commercial_platform: 'Commercial plateforme',
  owner: 'Propriétaire d\'organisation',
  org_manager: 'Manager organisation',
  org_protocol: 'Protocole organisation',
  org_commercial: 'Commercial organisation',
  staff_scope: 'Staff salle / événement',
  client: 'Client catalogue',
  guest: 'Invité',
};

export function resolveUserGuideRole({ role, access }: ResolveUserGuideInput): ResolvedUserGuide {
  if (role === 'SUPER_ADMIN') {
    return { guideId: 'super_admin', label: GUIDE_LABELS.super_admin };
  }

  if (role === 'COMMERCIAL') {
    return { guideId: 'commercial_platform', label: GUIDE_LABELS.commercial_platform };
  }

  if (access?.level === 'client') {
    return { guideId: 'client', label: GUIDE_LABELS.client };
  }

  if (access?.isOwner) {
    return { guideId: 'owner', label: GUIDE_LABELS.owner };
  }

  if (access?.orgRole === 'MANAGER') {
    return { guideId: 'org_manager', label: GUIDE_LABELS.org_manager };
  }

  if (access?.orgRole === 'PROTOCOL') {
    return { guideId: 'org_protocol', label: GUIDE_LABELS.org_protocol };
  }

  if (access?.orgRole === 'COMMERCIAL') {
    return { guideId: 'org_commercial', label: GUIDE_LABELS.org_commercial };
  }

  if (access?.level === 'staff') {
    return { guideId: 'staff_scope', label: GUIDE_LABELS.staff_scope };
  }

  return { guideId: 'org_manager', label: GUIDE_LABELS.org_manager };
}

export function getGuideLabel(id: UserGuideId): string {
  return GUIDE_LABELS[id];
}
