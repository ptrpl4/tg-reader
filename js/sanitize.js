const allowedTags = new Set([
    "a", "b", "strong", "em", "i", "u", "span", "p", "div", "br", "code", "pre",
]);

export function escapeHtml(value) {
    if (!value) return "";
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function sanitizeUrl(value) {
    if (!value) return null;
    let href = value.trim();
    if (href.startsWith("//")) {
        href = `https:${href}`;
    }
    try {
        const url = new URL(href);
        if (!["http:", "https:", "tg:"].includes(url.protocol)) {
            return null;
        }
        return url.href;
    } catch {
        return null;
    }
}

function decodeLinkText(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function sanitizeMessageHtml(element) {
    if (!element) return "";
    const fragment = document.createElement("div");
    fragment.appendChild(element.cloneNode(true));
    const cleanNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeHtml(node.textContent);
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }
        const tag = node.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
            return Array.from(node.childNodes).map(cleanNode).join("");
        }
        const inner = Array.from(node.childNodes).map(cleanNode).join("");
        if (tag === "br") {
            return "<br />";
        }
        if (tag === "a") {
            const href = sanitizeUrl(node.getAttribute("href"));
            if (!href) {
                return inner;
            }
            const display =
                inner.trim() ||
                escapeHtml(decodeLinkText(href.replace(/https?:\/\//, "")));
            return `<a href="${href}" target="_blank" rel="noreferrer">${display}</a>`;
        }
        return `<${tag}>${inner}</${tag}>`;
    };
    return Array.from(fragment.childNodes).map(cleanNode).join("");
}
