import { SourceAdapter, registerSource } from "./registry.js";
import { appState, proxyServices } from "../state.js";
import { escapeHtml, sanitizeUrl, sanitizeMessageHtml } from "../sanitize.js";
import { showLoadingOverlay, stopLoadingOverlay, clearFallbackTimers } from "../loading.js";

class TelegramAdapter extends SourceAdapter {
    static canHandle(url) {
        return /(?:https?:\/\/)?t\.me\/[a-zA-Z0-9_]+\/\d+/.test(url) ||
            /tg:\/\/resolve\?domain=[a-zA-Z0-9_]+.*post=\d+/.test(url);
    }

    normalize(link) {
        link = link.trim();
        const tmatch = link.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)\/(\d+)/);
        const tgmatch = link.match(/tg:\/\/resolve\?domain=([a-zA-Z0-9_]+).*post=(\d+)/);
        if (tmatch) return `https://t.me/${tmatch[1]}/${tmatch[2]}?embed=1`;
        if (tgmatch) return `https://t.me/${tgmatch[1]}/${tgmatch[2]}?embed=1`;
        return null;
    }

    parse(link) {
        if (!link) return null;
        const clean = link.split("?")[0];
        const match = clean.match(/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/);
        if (!match) return null;
        return {
            channel: match[1],
            postId: Number(match[2]),
            cleanLink: clean,
            source: "telegram",
        };
    }

    async fetch(normalizedUrl, { showLoader = true } = {}) {
        try {
            return await this._tryService(normalizedUrl, 0, { showLoader });
        } catch (error) {
            stopLoadingOverlay();
            console.error("Proxy chain failed:", error);
            if (error.httpStatus >= 400) {
                return {
                    error: `Proxy services returned an error (HTTP ${error.httpStatus}). The post may be unavailable or the service is rate-limited \u2014 try again later.`,
                };
            }
            return {
                error: "Unable to reach any proxy service. Check your connection and try again.",
            };
        }
    }

    supportsNavigation() { return true; }

    getAdjacentUrl(currentUrl, delta) {
        const parsed = this.parse(currentUrl);
        if (!parsed) return null;
        const targetId = parsed.postId + delta;
        if (targetId < 1) return null;
        return `https://t.me/${parsed.channel}/${targetId}`;
    }

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
            return this._parseContent(htmlString);
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

    _parseContent(htmlString) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, "text/html");
            const messageText = Array.from(
                doc.querySelectorAll(".tgme_widget_message_text"),
            ).find((el) => !el.closest(".tgme_widget_message_reply"));
            const authorName = doc.querySelector(
                ".tgme_widget_message_author .tgme_widget_message_owner_name",
            );
            const photo = doc.querySelector(".tgme_widget_message_photo_wrap");
            const video = doc.querySelector(".tgme_widget_message_video");
            if (!messageText && !photo && !video) {
                return {
                    error: "No content found. The post may be private, deleted, or unavailable.",
                };
            }
            const result = {
                title: authorName ? authorName.textContent.trim() : "Telegram Post",
                content: "",
            };
            const dateNode = doc.querySelector(".tgme_widget_message_date time");
            if (dateNode && dateNode.getAttribute("datetime")) {
                const publishedDate = new Date(dateNode.getAttribute("datetime"));
                result.publishedAtLabel = publishedDate.toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
            }
            if (messageText) {
                const safeHtml = sanitizeMessageHtml(messageText).trim();
                if (safeHtml) {
                    result.content += `<div class="text-block">${safeHtml}</div>`;
                }
            }
            const replyBlock = doc.querySelector(".tgme_widget_message_reply");
            if (replyBlock) {
                const replyTextEl = replyBlock.querySelector(
                    ".js-message_reply_text, .tgme_widget_message_text",
                );
                const replyLinkEl = replyBlock.querySelector("a[href*='t.me/']");
                const replyAuthor =
                    replyBlock.querySelector(
                        ".tgme_widget_message_owner_name, .tgme_widget_message_author",
                    )?.textContent.trim() ?? null;
                const replyLink = replyLinkEl ? replyLinkEl.href.split("?")[0] : null;
                const parsedReplyLink = replyLink ? this.parse(replyLink) : null;
                if (replyTextEl) {
                    const replyHtml = sanitizeMessageHtml(replyTextEl).trim();
                    const replyText = escapeHtml(replyTextEl.textContent).trim();
                    const replyBody = replyHtml || replyText;
                    if (replyBody) {
                        result.reply = {
                            html: replyBody,
                            text: replyText || replyBody,
                            author: replyAuthor,
                            link: replyLink,
                            channel: parsedReplyLink?.channel ?? null,
                            postId: parsedReplyLink?.postId ?? null,
                        };
                    }
                }
            }
            if (photo) {
                const style = photo.getAttribute("style");
                const urlMatch = style ? style.match(/url\(['"]?([^'"]+)['"]?\)/) : null;
                const imgSrc = urlMatch ? sanitizeUrl(urlMatch[1]) : null;
                if (imgSrc) {
                    result.content += `<img src="${escapeHtml(imgSrc)}" alt="Post image" loading="lazy">`;
                }
            }
            if (video) {
                const videoTag = video.querySelector("video");
                const videoSrc = videoTag ? sanitizeUrl(videoTag.src) : null;
                if (videoSrc) {
                    result.content += `<video controls src="${escapeHtml(videoSrc)}"></video>`;
                }
            }
            return { success: true, data: result };
        } catch (parseError) {
            console.error("Parse error:", parseError);
            return { error: "Failed to parse post content." };
        }
    }
}

registerSource(new TelegramAdapter());

