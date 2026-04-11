import { Theme, THEME_ICONS, AUTO_ICONS, STORAGE_KEYS } from "./state.js";

export function getAutoIcon() {
    if (window.innerWidth >= 1024) return AUTO_ICONS.desktop;
    if (window.innerWidth >= 743) return AUTO_ICONS.tablet;
    return AUTO_ICONS.phone;
}

export function getStoredTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.THEME);
        if (stored === Theme.DARK || stored === Theme.LIGHT || stored === Theme.AUTO) {
            return stored;
        }
    } catch (error) {
        console.warn("Unable to read theme preference:", error);
    }
    return null;
}

export function applyTheme(theme, persist = true) {
    if (!theme) return;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === Theme.DARK || (theme === Theme.AUTO && prefersDark);
    document.documentElement.dataset.theme = isDark ? Theme.DARK : Theme.LIGHT;

    const lightBtn = document.getElementById("themeLightBtn");
    const darkBtn = document.getElementById("themeDarkBtn");
    const autoBtn = document.getElementById("themeAutoBtn");
    if (lightBtn) lightBtn.setAttribute("aria-pressed", String(theme === Theme.LIGHT));
    if (darkBtn) darkBtn.setAttribute("aria-pressed", String(theme === Theme.DARK));
    if (autoBtn) autoBtn.setAttribute("aria-pressed", String(theme === Theme.AUTO));

    const themeCycleBtn = document.getElementById("themeCycleBtn");
    if (themeCycleBtn) {
        themeCycleBtn.dataset.theme = theme;
        themeCycleBtn.querySelector(".cycle-btn-icon").innerHTML =
            theme === Theme.AUTO ? getAutoIcon() : THEME_ICONS[theme];
        themeCycleBtn.setAttribute("aria-label", `Theme: ${theme}`);
    }

    if (theme === Theme.AUTO) {
        const autoBtnPill = document.getElementById("themeAutoBtn");
        if (autoBtnPill) autoBtnPill.innerHTML = getAutoIcon();
    }

    if (persist) {
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
        } catch (error) {
            console.warn("Unable to persist theme:", error);
        }
    }
}

export function initThemeToggle() {
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme ?? Theme.AUTO;
    applyTheme(initialTheme, Boolean(storedTheme));

    document.getElementById("themeLightBtn")?.addEventListener("click", () => applyTheme(Theme.LIGHT, true));
    document.getElementById("themeDarkBtn")?.addEventListener("click", () => applyTheme(Theme.DARK, true));
    document.getElementById("themeAutoBtn")?.addEventListener("click", () => applyTheme(Theme.AUTO, true));

    const themeOrder = [Theme.LIGHT, Theme.DARK, Theme.AUTO];
    document.getElementById("themeCycleBtn")?.addEventListener("click", () => {
        const current = getStoredTheme() ?? Theme.AUTO;
        const next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.length];
        applyTheme(next, true);
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        const stored = getStoredTheme();
        if (!stored || stored === Theme.AUTO) {
            applyTheme(Theme.AUTO, Boolean(stored));
        }
    });

    let autoIconResizeFrame = null;
    window.addEventListener("resize", () => {
        if (autoIconResizeFrame) return;
        autoIconResizeFrame = requestAnimationFrame(() => {
            autoIconResizeFrame = null;
            const stored = getStoredTheme() ?? Theme.AUTO;
            if (stored !== Theme.AUTO) return;
            const icon = getAutoIcon();
            const autoBtn = document.getElementById("themeAutoBtn");
            if (autoBtn) autoBtn.innerHTML = icon;
            const cycleBtn = document.getElementById("themeCycleBtn");
            if (cycleBtn?.dataset.theme === Theme.AUTO) {
                cycleBtn.querySelector(".cycle-btn-icon").innerHTML = icon;
            }
        });
    });
}
