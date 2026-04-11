export class SourceAdapter {
    static canHandle(_url) { return false; }
    normalize(_url) { return null; }
    parse(_url) { return null; }
    async fetch(_normalizedUrl, _options) { throw new Error("not implemented"); }
    supportsNavigation() { return false; }
    getAdjacentUrl(_currentUrl, _delta) { return null; }
}

const registry = [];

export function registerSource(adapter) {
    registry.push(adapter);
}

export function detectSource(url) {
    return registry.find((a) => a.constructor.canHandle(url)) ?? null;
}
