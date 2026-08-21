"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.uniqueSlug = uniqueSlug;
function slugify(input) {
    const slug = input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return slug || 'salle';
}
async function uniqueSlug(base, exists) {
    const root = slugify(base);
    if (!(await exists(root)))
        return root;
    for (let i = 2; i < 80; i++) {
        const candidate = `${root}-${i}`;
        if (!(await exists(candidate)))
            return candidate;
    }
    return `${root}-${Date.now().toString(36)}`;
}
