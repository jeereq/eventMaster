"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTemplateComposeRun = serializeTemplateComposeRun;
function serializeTemplateComposeRun(run) {
    const refs = Array.isArray(run.referenceUrls)
        ? run.referenceUrls.filter((u) => typeof u === 'string')
        : [];
    const contentObj = run.content && typeof run.content === 'object' ? run.content : null;
    const globalObj = contentObj?.global && typeof contentObj.global === 'object'
        ? contentObj.global
        : null;
    const stageObj = run.stage && typeof run.stage === 'object' ? run.stage : null;
    const rawVariants = stageObj?.variants ||
        globalObj?.variants ||
        globalObj?.aiVariants;
    const rawVariantList = Array.isArray(rawVariants)
        ? rawVariants
        : run.previewImageUrl
            ? [run.previewImageUrl]
            : [];
    const variants = Array.from(new Set(rawVariantList.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))));
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
