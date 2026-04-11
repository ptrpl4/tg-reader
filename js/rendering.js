import { appState, ICON_EXTERNAL_LINK, ICON_ALERT, ICON_INFO } from "./state.js";
import { escapeHtml, sanitizeUrl } from "./sanitize.js";
import { readPostCache } from "./cache.js";
import { setNavigationButtonsState } from "./navigation.js";

export function setStatusMessage(text = "", variant = "error") {
    const statusEl = document.getElementById("errorMessage");
    if (!statusEl) return;
    if (!text) {
        statusEl.innerHTML = "";
        statusEl.classList.remove("info", "error");
        statusEl.style.display = "none";
        return;
    }
    if (variant === "info") {
        statusEl.innerHTML = `<div class="status-icon">${ICON_INFO}</div><span>${text}</span>`;
    } else {
        statusEl.innerHTML = `<div class="status-icon">${ICON_ALERT}</div><p>${text}</p>`;
    }
    statusEl.classList.toggle("info", variant === "info");
    statusEl.classList.toggle("error", variant !== "info");
    statusEl.style.display = variant === "info" ? "flex" : "block";
}

export function updatePostMeta(normalizedLink, data, parseLinkFn) {
    const metaEl = document.getElementById("postMeta");
    if (!normalizedLink) {
        metaEl.innerHTML = "";
        appState.currentChannel = null;
        appState.currentPostId = null;
        setNavigationButtonsState();
        return;
    }
    const parsed = parseLinkFn(normalizedLink);
    if (!parsed) {
        metaEl.innerHTML = "";
        setNavigationButtonsState();
        return;
    }
    appState.currentChannel = parsed.channel;
    appState.currentPostId = parsed.postId;
    const channelTitle = escapeHtml(data?.title ?? "Telegram Post");
    const sublineParts = [];
    if (parsed.postId) {
        sublineParts.push(`Post #${parsed.postId}`);
    }
    if (data?.publishedAtLabel) {
        sublineParts.push(data.publishedAtLabel);
    }
    metaEl.innerHTML = `
        <div class="post-meta__left">
            <p class="post-meta__left-title">${channelTitle}</p>
            ${
                sublineParts.length
                    ? `<p class="post-meta__left-subline">${sublineParts.join(" \u2014 ")}</p>`
                    : ""
            }
        </div>
    `;
    setNavigationButtonsState();
}

export function updatePostFooter(channel, postId, canonicalLink, showReaderFn) {
    const footer = document.getElementById("postFooter");
    if (!footer) return;
    const cached = readPostCache(channel, postId);
    let infoHtml = "";
    if (cached) {
        const lastOpened = cached.lastOpened ?? cached.cachedAt ?? Date.now();
        infoHtml += `<div class="post-footer__info">Last opened ${new Date(lastOpened).toLocaleString()}</div>`;
        const cachedAt = cached.cachedAt ?? lastOpened;
        if (cachedAt && cachedAt !== lastOpened) {
            infoHtml += `<div class="post-footer__info">Cached ${new Date(cachedAt).toLocaleString()}</div>`;
        }
    }
    let linksHtml = "";
    if (canonicalLink) {
        linksHtml += `<span class="post-footer__link">Open <a href="${escapeHtml(canonicalLink)}" target="_blank" rel="noreferrer">original ${ICON_EXTERNAL_LINK}</a></span>`;
    }
    if (channel && postId) {
        const commentsUrl = `https://t.me/${escapeHtml(channel)}/${postId}?comment=1`;
        linksHtml += `<span class="post-footer__link">Open <a href="${commentsUrl}" target="_blank" rel="noreferrer">comments ${ICON_EXTERNAL_LINK}</a></span>`;
        linksHtml += `<span class="post-footer__link">Open <a class="post-footer__oldest-link" href="https://t.me/${escapeHtml(channel)}/1">oldest post in channel</a></span>`;
    }
    footer.innerHTML = `
        ${infoHtml}
        ${linksHtml ? `<div class="post-footer__link-wrap">${linksHtml}</div>` : ""}
    `;
    footer.querySelector(".post-footer__oldest-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        showReaderFn(`https://t.me/${channel}/1`);
    });
}

export function buildReplySection(reply) {
    const replyBody = reply?.html ?? (reply?.text ? escapeHtml(reply.text) : "");
    if (!replyBody) return "";
    const metaParts = [];
    if (reply.author) metaParts.push(escapeHtml(reply.author));
    else if (reply.channel) metaParts.push(`@${reply.channel}`);
    else metaParts.push("original message");
    if (reply.postId) metaParts.push(`#${reply.postId}`);
    const metaText = metaParts.join(" ");
    const safeReplyLink = reply.link ? sanitizeUrl(reply.link) : null;
    const linkHtml = safeReplyLink
        ? `<a href="${escapeHtml(safeReplyLink)}" target="_blank" rel="noreferrer">View original</a>`
        : "";
    return `
        <div class="reply-banner">
            <div class="reply-banner__meta">
                Replying to <strong>${metaText}</strong>
                ${linkHtml ? `\u2022 ${linkHtml}` : ""}
            </div>
            <div class="reply-banner__text">${replyBody}</div>
        </div>
    `;
}

export function renderPostContent(
    postData,
    normalizedLink,
    { overrideStatusText = null, statusVariant = "error", parseLinkFn, showReaderFn } = {},
) {
    const canonicalLink = normalizedLink ?? appState.lastCanonicalLink;
    const parsed = parseLinkFn?.(canonicalLink);
    const statusText = overrideStatusText ?? (postData.error ? postData.error : null);
    const variant = overrideStatusText !== null ? statusVariant : "error";
    setStatusMessage(statusText, variant);
    const openLink = parsed?.cleanLink ?? canonicalLink ?? null;
    if (!postData.success || !postData.data) {
        document.getElementById("postBody").innerHTML = "";
        updatePostMeta(canonicalLink, null, parseLinkFn);
        updatePostFooter(parsed?.channel ?? null, parsed?.postId ?? null, openLink, showReaderFn);
        return;
    }
    const { content } = postData.data;
    const replySection = buildReplySection(postData.data.reply);
    document.getElementById("postBody").innerHTML = `
        ${replySection}
        ${content}
    `;
    updatePostMeta(canonicalLink, postData.data, parseLinkFn);
    updatePostFooter(parsed?.channel ?? null, parsed?.postId ?? null, openLink, showReaderFn);
}
