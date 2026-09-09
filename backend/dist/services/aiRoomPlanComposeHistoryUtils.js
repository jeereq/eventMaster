"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistableRoomPlanImageUrl = persistableRoomPlanImageUrl;
exports.serializeRoomPlanComposeRun = serializeRoomPlanComposeRun;
const HTTP_IMAGE_RE = /^https?:\/\//i;
function persistableRoomPlanImageUrl(url) {
    const value = url?.trim() || '';
    if (!value || value.startsWith('data:') || !HTTP_IMAGE_RE.test(value))
        return null;
    return value.slice(0, 2000);
}
function serializeRoomPlanComposeRun(run) {
    const draft = (run.draft && typeof run.draft === 'object' ? run.draft : { items: [] });
    const items = Array.isArray(draft.items) ? draft.items : [];
    return {
        id: run.id,
        userId: run.userId,
        deviceId: run.deviceId,
        source: run.source,
        prompt: run.prompt,
        imageUrl: persistableRoomPlanImageUrl(run.imageUrl),
        roomType: run.roomType,
        widthM: run.widthM,
        heightM: run.heightM,
        itemCount: items.length,
        draft,
        createdAt: run.createdAt.toISOString(),
    };
}
