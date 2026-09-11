export type AiTemplateComposeSource = 'landing' | 'studio';

export function serializeTemplateComposeRun(run: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  referenceUrls: unknown;
  previewImageUrl: string | null;
  content: unknown;
  stage: unknown;
  createdAt: Date;
}) {
  const refs = Array.isArray(run.referenceUrls)
    ? run.referenceUrls.filter((u): u is string => typeof u === 'string')
    : [];

  const contentObj =
    run.content && typeof run.content === 'object' ? (run.content as Record<string, unknown>) : null;
  const globalObj =
    contentObj?.global && typeof contentObj.global === 'object'
      ? (contentObj.global as Record<string, unknown>)
      : null;
  const stageObj =
    run.stage && typeof run.stage === 'object' ? (run.stage as Record<string, unknown>) : null;

  const rawVariants =
    (stageObj?.variants as unknown) ||
    (globalObj?.variants as unknown) ||
    (globalObj?.aiVariants as unknown);

  const rawVariantList: unknown[] = Array.isArray(rawVariants)
    ? rawVariants
    : run.previewImageUrl
      ? [run.previewImageUrl]
      : [];

  const variants = Array.from(
    new Set(
      rawVariantList.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim())),
    ),
  );

  return {
    id: run.id,
    userId: run.userId,
    deviceId: run.deviceId,
    source: run.source,
    prompt: run.prompt,
    referenceUrls: refs,
    previewImageUrl: run.previewImageUrl,
    variants,
    content: run.content,
    stage: run.stage,
    createdAt: run.createdAt.toISOString(),
  };
}
