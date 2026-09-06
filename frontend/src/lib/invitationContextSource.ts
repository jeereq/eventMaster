export const INVITATION_CONTEXT_SOURCES = ['none', 'org', 'history'] as const;
export type InvitationContextSource = (typeof INVITATION_CONTEXT_SOURCES)[number];

const STORAGE_KEY = 'em_invitation_context_source';

export function parseInvitationContextSource(raw: unknown): InvitationContextSource {
  return raw === 'org' || raw === 'history' || raw === 'none' ? raw : 'none';
}

export function readStoredInvitationContextSource(): InvitationContextSource {
  if (typeof window === 'undefined') return 'none';
  try {
    return parseInvitationContextSource(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'none';
  }
}

export function persistInvitationContextSource(source: InvitationContextSource) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, source);
  } catch {
    /* ignore quota / private mode */
  }
}
