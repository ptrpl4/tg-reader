import { appState } from "./state.js";

export function updateHistory(channel, postId, replace = false) {
    const params = new URLSearchParams();
    if (channel) params.set("channel", channel);
    if (postId) params.set("post", postId);
    const query = params.toString();
    const url = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
    const state = { channel, postId };
    if (replace) {
        window.history.replaceState(state, "", url);
    } else {
        window.history.pushState(state, "", url);
    }
}

export function setNavigationButtonsState() {
    const edgePrev = document.getElementById("edgePrevZone");
    const edgeNext = document.getElementById("edgeNextZone");
    const hasChannel = Boolean(appState.currentChannel && appState.currentPostId);
    const atStart = !hasChannel || appState.currentPostId <= 1;
    if (edgePrev) edgePrev.disabled = atStart;
    if (edgeNext) edgeNext.disabled = !hasChannel;
}
