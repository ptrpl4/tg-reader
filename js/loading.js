import { appState } from "./state.js";

let loaderOverlayEl = null;
let loaderMessageEl = null;
let countdownEl = null;
let fallbackTimer = null;
let countdownInterval = null;
let countdownRemaining = 0;

export function initLoaderElements() {
    loaderOverlayEl = document.getElementById("loadingOverlay");
    loaderMessageEl = document.getElementById("loaderMessage");
    countdownEl = document.getElementById("fallbackCountdown");
}

function updateCountdownText(nextServiceName) {
    if (!countdownEl) return;
    if (!nextServiceName) {
        countdownEl.textContent = "Waiting for response\u2026";
        return;
    }
    countdownEl.textContent = `Switching to ${nextServiceName} in ${countdownRemaining}s`;
}

export function clearFallbackTimers() {
    clearTimeout(fallbackTimer);
    clearInterval(countdownInterval);
    fallbackTimer = null;
    countdownInterval = null;
}

export function showLoadingOverlay(serviceName, nextServiceName) {
    if (!loaderOverlayEl) return;
    loaderOverlayEl.classList.add("active");
    if (loaderMessageEl) {
        loaderMessageEl.textContent = `Loading via ${serviceName}\u2026`;
    }
    countdownRemaining = 3;
    updateCountdownText(nextServiceName);
    clearFallbackTimers();
    const upcoming = nextServiceName;
    countdownInterval = setInterval(() => {
        countdownRemaining = Math.max(countdownRemaining - 1, 0);
        updateCountdownText(upcoming);
    }, 1000);
    fallbackTimer = setTimeout(() => {
        if (!upcoming) {
            updateCountdownText(null);
            return;
        }
        if (loaderMessageEl) {
            loaderMessageEl.textContent = `No response from ${serviceName}; switching to ${upcoming}\u2026`;
        }
        appState.activeAbortController?.abort();
    }, 3000);
}

export function stopLoadingOverlay() {
    clearFallbackTimers();
    if (loaderOverlayEl) {
        loaderOverlayEl.classList.remove("active");
    }
}
