import { STORAGE_KEYS } from "./state.js";

const POST_CACHE_MAX_ENTRIES = 50;

export function readPostCache(channel, postId) {
    if (!channel || !postId) return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.POST_CACHE);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed[`${channel}/${postId}`] ?? null;
    } catch (error) {
        console.warn("Unable to read post cache:", error);
        return null;
    }
}

function evictPostCache(cache) {
    const keys = Object.keys(cache);
    if (keys.length <= POST_CACHE_MAX_ENTRIES) return cache;
    keys.sort((a, b) => (cache[a].lastOpened ?? 0) - (cache[b].lastOpened ?? 0));
    const evict = keys.slice(0, keys.length - POST_CACHE_MAX_ENTRIES);
    const pruned = { ...cache };
    for (const k of evict) delete pruned[k];
    return pruned;
}

export function persistPostCache(channel, postId, data, options = {}) {
    if (!channel || !postId) return;
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.POST_CACHE);
        let cache = stored ? JSON.parse(stored) : {};
        const key = `${channel}/${postId}`;
        const existing = cache[key] ?? {};
        cache[key] = {
            data,
            cachedAt: options.cachedAt ?? existing.cachedAt ?? Date.now(),
            lastOpened: options.lastOpened ?? Date.now(),
        };
        cache = evictPostCache(cache);
        localStorage.setItem(STORAGE_KEYS.POST_CACHE, JSON.stringify(cache));
    } catch (error) {
        console.warn("Unable to persist post cache:", error);
    }
}
