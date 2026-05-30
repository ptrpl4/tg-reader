const allowedTags = new Set([
    "a", "b", "strong", "em", "i", "u", "span", "p", "div", "br", "code", "pre", "img",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr",
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
        let tag = node.tagName.toLowerCase();
        if (tag === "font") {
            const size = parseInt(node.getAttribute("size"), 10);
            if (size >= 5) tag = "h2";
            else if (size >= 4) tag = "h3";
        }
        if (!allowedTags.has(tag)) {
            return Array.from(node.childNodes).map(cleanNode).join("");
        }
        const inner = Array.from(node.childNodes).map(cleanNode).join("");
        if (tag === "br") {
            return "<br />";
        }
        if (tag === "hr") {
            return "<hr>";
        }
        if (tag === "img") {
            const src = sanitizeUrl(node.getAttribute("src"));
            if (!src) return "";
            const alt = escapeHtml(node.getAttribute("alt") || "");
            return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy">`;
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
        const existingAlign = node.getAttribute("data-align");
        const styleAttr = node.getAttribute("style") || "";
        const alignMatch = existingAlign || styleAttr.match(/text-align:\s*(center|right|left)/)?.[1];
        if (alignMatch) {
            return `<${tag} data-align="${alignMatch}">${inner}</${tag}>`;
        }
        return `<${tag}>${inner}</${tag}>`;
    };
    return Array.from(fragment.childNodes).map(cleanNode).join("");
}
