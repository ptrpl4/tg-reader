import { MODE_ICONS, STORAGE_KEYS } from "./state.js";

function normalizeReaderPreferences(raw) {
    return { minimal: Boolean(raw?.minimal) };
}

function getStoredReaderPreferences() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.READER_PREFS);
        if (!stored) return null;
        return normalizeReaderPreferences(JSON.parse(stored));
    } catch (error) {
        console.warn("Unable to read reader preferences:", error);
        return null;
    }
}

export function applyReaderPreferences(preferences, persist = true) {
    const normalized = normalizeReaderPreferences(preferences);
    document.documentElement.dataset.readerMinimal = String(normalized.minimal);

    document.getElementById("modeDefaultBtn")?.setAttribute("aria-pressed", String(!normalized.minimal));
    document.getElementById("modeMinimalBtn")?.setAttribute("aria-pressed", String(normalized.minimal));

    const modeCycleBtn = document.getElementById("modeCycleBtn");
    if (modeCycleBtn) {
        const modeKey = normalized.minimal ? "minimal" : "default";
        modeCycleBtn.dataset.mode = modeKey;
        modeCycleBtn.querySelector(".cycle-btn-icon").innerHTML = MODE_ICONS[modeKey];
        modeCycleBtn.setAttribute("aria-label", `Reading mode: ${modeKey}`);
    }

    if (persist) {
        try {
            localStorage.setItem(STORAGE_KEYS.READER_PREFS, JSON.stringify(normalized));
        } catch (error) {
            console.warn("Unable to persist reader preferences:", error);
        }
    }
}

export function initReaderTools() {
    const stored = getStoredReaderPreferences();
    applyReaderPreferences(stored ?? { minimal: false }, false);

    document.getElementById("modeDefaultBtn")?.addEventListener("click", () => {
        applyReaderPreferences({ minimal: false }, true);
    });
    document.getElementById("modeMinimalBtn")?.addEventListener("click", () => {
        applyReaderPreferences({ minimal: true }, true);
    });
    document.getElementById("modeCycleBtn")?.addEventListener("click", () => {
        const isMinimal = document.documentElement.dataset.readerMinimal === "true";
        applyReaderPreferences({ minimal: !isMinimal }, true);
    });

    window.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) return;
        if (event.key.toLowerCase() !== "m") return;
        const target = event.target;
        const isTypingContext =
            target instanceof HTMLElement &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable);
        if (isTypingContext) return;
        applyReaderPreferences(
            { minimal: document.documentElement.dataset.readerMinimal !== "true" },
            true,
        );
    });
}
