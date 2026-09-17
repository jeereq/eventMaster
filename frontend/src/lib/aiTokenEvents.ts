export const AI_TOKENS_INSUFFICIENT_EVENT = 'em-ai-tokens-insufficient';

export type AiTokensInsufficientDetail = {
  message?: string;
};

export function notifyAiTokensInsufficient(message?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<AiTokensInsufficientDetail>(AI_TOKENS_INSUFFICIENT_EVENT, {
      detail: { message },
    }),
  );
}

export function isAiTokenShortageError(error: { status?: number; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 402) return true;
  return /jeton/i.test(error.message || '');
}

export function isAiTokenShortageMessage(message?: string | null): boolean {
  return /jeton/i.test(message || '');
}
