import { appState, defaultTelegramLink } from "./state.js";
import { initThemeToggle } from "./theme.js";
import { initReaderTools } from "./reader-prefs.js";
import { initLoaderElements } from "./loading.js";
import { readPostCache, persistPostCache } from "./cache.js";
import { updateHistory, setNavigationButtonsState } from "./navigation.js";
import {
    setStatusMessage,
    updatePostMeta,
    updatePostFooter,
    renderPostContent,
} from "./rendering.js";
import { detectSource } from "./sources/registry.js";

// Register all source adapters (side-effect imports)
import "./sources/telegram.js";
import "./sources/newsletter.js";

// --- Service Worker ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("service-worker.js")
            .then((reg) => console.log("Service Worker registered:", reg))
            .catch((err) => console.error("Service Worker registration failed:", err));
    });
}

// --- Helpers that need showReader (circular dependency resolution) ---

function parseLinkViaAdapter(link) {
    const adapter = detectSource(link);
    return adapter?.parse(link) ?? null;
}

function goToAdjacentPost(delta) {
    if (!appState.currentChannel || !appState.currentPostId) return;
    const currentUrl = appState.lastCanonicalLink;
    const adapter = detectSource(currentUrl);
    if (!adapter?.supportsNavigation()) return;
    const nextUrl = adapter.getAdjacentUrl(currentUrl, delta);
    if (nextUrl) showReader(nextUrl);
}

// --- Load Post (generic, adapter-based) ---

async function loadPost(
    linkOverride = null,
    options = { updateHistory: false, replaceHistory: false },
) {
    const linkInput = document.getElementById("telegramLink");
    const rawLink = (linkOverride ?? linkInput.value).trim();
    if (!rawLink) {
        setStatusMessage("Please enter a link");
        return;
    }

    const adapter = detectSource(rawLink);
    if (!adapter) {
        setStatusMessage("Unsupported link format. Currently only Telegram post URLs are supported.");
        return;
    }

    const normalized = adapter.normalize(rawLink);
    if (!normalized) {
        setStatusMessage("Invalid link format.");
        return;
    }

    const parsed = adapter.parse(normalized);
    const canonicalLink = parsed?.cleanLink ?? normalized;

    appState.activeAbortController?.abort();
    appState.activeAbortController = null;
    appState.lastCanonicalLink = canonicalLink;

    if (linkOverride) {
        linkInput.value = parsed?.cleanLink ?? linkOverride;
    }
    if (options.updateHistory && parsed) {
        updateHistory(parsed.channel, parsed.postId, options.replaceHistory);
    }

    document.getElementById("postBody").innerHTML = "<p>Loading\u2026</p>";
    updatePostMeta(canonicalLink, null, parseLinkViaAdapter);
    setStatusMessage();

    let cachedEntry = null;
    if (parsed?.channel && parsed?.postId) {
        cachedEntry = readPostCache(parsed.channel, parsed.postId);
        if (cachedEntry) {
            const cachedAt = cachedEntry.cachedAt ?? cachedEntry.lastOpened ?? Date.now();
            const formatted = new Date(cachedAt).toLocaleString();
            renderPostContent(
                { success: true, data: cachedEntry.data },
                canonicalLink,
                {
                    overrideStatusText: `Showing cached copy from ${formatted} while refreshing\u2026`,
                    statusVariant: "info",
                    parseLinkFn: parseLinkViaAdapter,
                    showReaderFn: showReader,
                },
            );
        }
    }

    const shouldShowLoader = !cachedEntry;
    const result = await adapter.fetch(normalized, { showLoader: shouldShowLoader });

    if (parsed?.channel && parsed?.postId && !result.success) {
        const cached = readPostCache(parsed.channel, parsed.postId);
        if (cached) {
            persistPostCache(parsed.channel, parsed.postId, cached.data, {
                cachedAt: cached.cachedAt,
            });
            const cachedAt = cached.cachedAt ?? cached.lastOpened ?? Date.now();
            const formattedCached = new Date(cachedAt).toLocaleString();
            renderPostContent(
                { success: true, data: cached.data },
                canonicalLink,
                {
                    overrideStatusText: `Unable to fetch latest version; showing saved copy from ${formattedCached}.`,
                    statusVariant: "info",
                    parseLinkFn: parseLinkViaAdapter,
                    showReaderFn: showReader,
                },
            );
            return;
        }
    }

    if (parsed?.channel && parsed?.postId && result.success) {
        persistPostCache(parsed.channel, parsed.postId, result.data);
    }

    renderPostContent(result, canonicalLink, {
        parseLinkFn: parseLinkViaAdapter,
        showReaderFn: showReader,
    });
}

// --- View switching ---

function showHero({ pushHistory = true, replaceHistory = false } = {}) {
    document.querySelector(".hero").classList.remove("hidden");
    document.querySelector(".reader-container").classList.add("hidden");
    document.getElementById("modePill")?.classList.add("hidden");
    document.getElementById("modeCycleBtn")?.classList.add("hidden");
    document.getElementById("postBody").innerHTML =
        `<p>Enter a Telegram link above and click "Load Post" to see the content.</p>`;
    updatePostMeta(null, null, parseLinkViaAdapter);
    setStatusMessage();
    updatePostFooter(null, null, null, showReader);
    document.getElementById("telegramLink").value = "";
    appState.lastCanonicalLink = null;
    document.getElementById("homeLink")?.focus();
    if (pushHistory || replaceHistory) {
        updateHistory(null, null, replaceHistory);
    }
}

function showReader(link, { pushHistory = true, replaceHistory = false } = {}) {
    const heroEl = document.querySelector(".hero");
    const readerEl = document.querySelector(".reader-container");
    heroEl.classList.add("hidden");
    readerEl.classList.remove("hidden");
    document.getElementById("modePill")?.classList.remove("hidden");
    document.getElementById("modeCycleBtn")?.classList.remove("hidden");
    if (link) {
        document.getElementById("telegramLink").value = link;
        loadPost(link, {
            updateHistory: pushHistory || replaceHistory,
            replaceHistory,
        });
    } else {
        document.getElementById("postBody").innerHTML =
            `<p>Enter a Telegram link above and click "Load Post" to see the content.</p>`;
        updatePostMeta(null, null, parseLinkViaAdapter);
        setStatusMessage();
        updatePostFooter(null, null, null, showReader);
        document.getElementById("telegramLink").value = "";
        appState.lastCanonicalLink = null;
    }
}

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
    initLoaderElements();

    const urlParams = new URLSearchParams(window.location.search);
    let initialLink = null;
    const paramChannel = urlParams.get("channel");
    const paramPost = urlParams.get("post");
    if (paramChannel && paramPost) {
        initialLink = `https://t.me/${paramChannel}/${paramPost}`;
    } else {
        const legacyLink = urlParams.get("link");
        if (legacyLink) {
            const adapter = detectSource(legacyLink);
            if (adapter) {
                const normalized = adapter.normalize(legacyLink);
                if (normalized) {
                    const parsed = adapter.parse(normalized);
                    if (parsed?.channel && parsed?.postId) {
                        initialLink = `https://t.me/${parsed.channel}/${parsed.postId}`;
                    }
                }
            }
        }
    }

    if (initialLink) {
        document.getElementById("homeLink").value = initialLink;
        showReader(initialLink, { pushHistory: false, replaceHistory: true });
    } else {
        showHero({ pushHistory: false, replaceHistory: true });
    }

    document.getElementById("heroForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const rawLink = document.getElementById("homeLink").value.trim();
        const link = rawLink || defaultTelegramLink;
        showReader(link);
    });

    document.getElementById("readerForm").addEventListener("submit", (e) => {
        e.preventDefault();
        loadPost(null, { updateHistory: true });
    });

    document.getElementById("edgeNextZone").onclick = () => goToAdjacentPost(1);
    document.getElementById("edgePrevZone").onclick = () => goToAdjacentPost(-1);

    document.getElementById("headerLink")?.addEventListener("click", (event) => {
        event.preventDefault();
        showHero({ pushHistory: true, replaceHistory: true });
    });

    initThemeToggle();
    initReaderTools();
    setNavigationButtonsState();

    window.addEventListener("popstate", (event) => {
        const channel = event.state?.channel;
        const postId = event.state?.postId;
        if (channel && postId) {
            showReader(`https://t.me/${channel}/${postId}`, {
                pushHistory: false,
                replaceHistory: false,
            });
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const pc = params.get("channel");
        const pp = params.get("post");
        if (pc && pp) {
            showReader(`https://t.me/${pc}/${pp}`, {
                pushHistory: false,
                replaceHistory: false,
            });
            return;
        }
        showHero({ pushHistory: false, replaceHistory: false });
    });
});
