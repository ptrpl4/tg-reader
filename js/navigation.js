import { appState } from "./state.js";
import { detectSource } from "./sources/registry.js";

export function updateHistory(channel, postId, replace = false) {
    const params = new URLSearchParams();
    if (channel && postId) {
        // Check if this is a Telegram-style channel/postId (numeric postId)
        if (typeof postId === "number" || /^\d+$/.test(postId)) {
            params.set("channel", channel);
            params.set("post", postId);
        } else {
            params.set("url", appState.lastCanonicalLink);
        }
    }
    const query = params.toString().replace(/%3A/gi, ":").replace(/%2F/gi, "/");
    const url = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
    const state = { channel, postId, url: appState.lastCanonicalLink };
    if (replace) {
        window.history.replaceState(state, "", url);
    } else {
        window.history.pushState(state, "", url);
    }
}

export function setNavigationButtonsState() {
    const edgePrev = document.getElementById("edgePrevZone");
    const edgeNext = document.getElementById("edgeNextZone");
    const currentUrl = appState.lastCanonicalLink;
    const adapter = currentUrl ? detectSource(currentUrl) : null;
    const navigable = adapter?.supportsNavigation() &&
        Boolean(appState.currentChannel && appState.currentPostId);
    const atStart = !navigable || appState.currentPostId <= 1;
    if (edgePrev) edgePrev.disabled = atStart;
    if (edgeNext) edgeNext.disabled = !navigable;
}
