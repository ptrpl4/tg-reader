import { SourceAdapter, registerSource } from "./registry.js";

class NewsletterAdapter extends SourceAdapter {
    static canHandle(url) {
        return /mailchi\.mp\//.test(url) || /campaign-archive\.com/.test(url);
    }

    normalize(url) {
        return url.trim();
    }

    parse(url) {
        if (!url) return null;
        return { cleanLink: url.split("?")[0] };
    }

    async fetch(_normalizedUrl, _options) {
        return { error: "Newsletter reading is not yet supported." };
    }

    supportsNavigation() { return false; }
}

registerSource(new NewsletterAdapter());

