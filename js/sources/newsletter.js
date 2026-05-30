import { SourceAdapter, registerSource } from "./registry.js";
import { appState, proxyServices } from "../state.js";
import { escapeHtml, sanitizeUrl, sanitizeMessageHtml } from "../sanitize.js";
import { showLoadingOverlay, stopLoadingOverlay, clearFallbackTimers } from "../loading.js";

const NBSP = "\xA0";
const WS_RE = new RegExp(`[\\s${NBSP}]`);
const TRIM_START_RE = new RegExp(`^(<br\\s*/?>|[\\s${NBSP}]|<div[^>]*>[\\s${NBSP}]*</div>)+`);
const TRIM_END_RE = new RegExp(`(<br\\s*/?>|[\\s${NBSP}])+$`);
const EMPTY_RE = new RegExp(`^[\\s${NBSP}]*(<br\\s*/?>)*[\\s${NBSP}]*$`);

class NewsletterAdapter extends SourceAdapter {
    static canHandle(url) {
        return /mailchi\.mp\//.test(url) || /campaign-archive\.com/.test(url);
    }

    normalize(url) {
        const clean = url.trim().split("?")[0].split("#")[0];
        if (!clean) return null;
        try {
            const parsed = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
            return parsed.href;
        } catch {
            return null;
        }
    }

    parse(url) {
        if (!url) return null;
        const clean = url.split("?")[0].split("#")[0];
        try {
            const parsed = new URL(clean);
            const parts = parsed.pathname.split("/").filter(Boolean);
            if (parts.length < 2) return null;
            return {
                channel: parts[0],
                postId: parts.slice(1).join("/"),
                cleanLink: clean,
                source: "newsletter",
            };
        } catch {
            return null;
        }
    }

    async fetch(normalizedUrl, { showLoader = true } = {}) {
        try {
            return await this._tryService(normalizedUrl, 0, { showLoader });
        } catch (error) {
            stopLoadingOverlay();
            console.error("Proxy chain failed:", error);
            if (error.httpStatus >= 400) {
                return {
                    error: `Proxy services returned an error (HTTP ${error.httpStatus}). The newsletter may be unavailable or the service is rate-limited.`,
                };
            }
            return {
                error: "Unable to reach any proxy service. Check your connection and try again.",
            };
        }
    }

    supportsNavigation() { return false; }

    async _tryService(link, index, { showLoader = true } = {}) {
        if (index >= proxyServices.length) {
            throw new Error("All proxy services failed");
        }
        const service = proxyServices[index];
        if (showLoader) {
            showLoadingOverlay(service.name, proxyServices[index + 1]?.name ?? null);
        } else {
            clearFallbackTimers();
        }
        const controller = new AbortController();
        appState.activeAbortController = controller;
        try {
            const response = await fetch(service.buildUrl(link), {
                signal: controller.signal,
            });
            if (!response.ok) {
                const err = new Error(`${service.name} returned ${response.status}`);
                err.httpStatus = response.status;
                throw err;
            }
            const htmlString = await response.text();
            if (showLoader) stopLoadingOverlay();
            return this._parseContent(htmlString, link);
        } catch (error) {
            if (showLoader) clearFallbackTimers();
            if (controller.signal.aborted) {
                if (index + 1 < proxyServices.length) {
                    return this._tryService(link, index + 1, { showLoader });
                }
                throw new Error("Proxy chain aborted");
            }
            if (index + 1 < proxyServices.length) {
                return this._tryService(link, index + 1, { showLoader });
            }
            throw error;
        }
    }

    _promoteAttributes(el) {
        for (const child of el.querySelectorAll("div, p")) {
            const style = child.getAttribute("style") || "";
            const m = style.match(/text-align:\s*(center|right|left)/);
            if (m) child.setAttribute("data-align", m[1]);
        }
        for (const span of el.querySelectorAll("span")) {
            const style = span.getAttribute("style") || "";
            const sizeMatch = style.match(/font-size:\s*(\d+)px/);
            if (sizeMatch && parseInt(sizeMatch[1], 10) >= 22) {
                span.setAttribute("data-heading", "true");
            }
        }
    }

    _parseContent(htmlString, sourceUrl) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, "text/html");

            const titleEl = doc.querySelector("title");
            const title = titleEl?.textContent.trim() || "Newsletter";

            const container = doc.querySelector(".templateContainer") ?? doc.body;
            if (!container) {
                return { error: "No newsletter content found. The page may be unavailable." };
            }

            const sections = container.querySelectorAll("#templateHeader, #templateBody");
            if (!sections.length) {
                return { error: "No newsletter content found. The page may be unavailable." };
            }

            let content = "";
            const toc = [];
            let sectionIdx = 0;
            for (const section of sections) {
                const blocks = section.querySelectorAll(".mcnTextContent, .mcnDividerContent, img");
                for (const el of blocks) {
                    if (el.closest(".mcnTextContent") && el.tagName === "IMG") continue;
                    if (el.classList.contains("mcnDividerContent")) {
                        const borderStyle = el.getAttribute("style") || "";
                        const colorMatch = borderStyle.match(/border-top:\s*\d+px\s+solid\s+(#[0-9a-fA-F]+)/);
                        if (colorMatch) {
                            const accent = colorMatch[1].toUpperCase() === "#FF5335" ? "accent" : "muted";
                            content += `<hr data-divider="${accent}">`;
                        }
                        continue;
                    }
                    if (el.tagName === "IMG") {
                        const src = sanitizeUrl(el.getAttribute("src"));
                        if (src) {
                            content += `<div class="text-block"><img src="${escapeHtml(src)}" alt="" loading="lazy"></div>`;
                            const td = el.closest("td");
                            if (td) {
                                for (const p of td.querySelectorAll("p")) {
                                    const caption = sanitizeMessageHtml(p).trim()
                                        .replace(TRIM_START_RE, "")
                                        .replace(TRIM_END_RE, "");
                                    if (caption && !EMPTY_RE.test(caption)) {
                                        content += `<div class="text-block img-caption">${caption}</div>`;
                                    }
                                }
                            }
                        }
                    } else {
                        this._promoteAttributes(el);
                        const safeHtml = sanitizeMessageHtml(el).trim()
                            .replace(TRIM_START_RE, "")
                            .replace(TRIM_END_RE, "");
                        if (safeHtml && !EMPTY_RE.test(safeHtml)) {
                            const headingMatch = safeHtml.match(/<h2>(.*?)<\/h2>/);
                            if (headingMatch) {
                                const headingText = headingMatch[1].replace(/<[^>]*>/g, "").replace(/&nbsp;|\xA0/g, "").trim();
                                if (headingText && /\p{L}/u.test(headingText) && !headingText.startsWith("http")) {
                                    const id = `section-${sectionIdx++}`;
                                    toc.push({ id, title: headingText });
                                    const anchored = safeHtml.replace(/<h2>/, `<h2 id="${id}">`);
                                    content += `<div class="text-block">${anchored}</div>`;
                                    continue;
                                }
                            }
                            content += `<div class="text-block">${safeHtml}</div>`;
                        }
                    }
                }
            }

            if (!content) {
                return { error: "No newsletter content found. The page may be unavailable." };
            }

            return {
                success: true,
                data: {
                    title,
                    content,
                    toc,
                    source: "newsletter",
                    canonicalUrl: sourceUrl,
                },
            };
        } catch (parseError) {
            console.error("Parse error:", parseError);
            return { error: "Failed to parse newsletter content." };
        }
    }
}

registerSource(new NewsletterAdapter());
