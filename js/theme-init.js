// Blocking theme init — runs synchronously before first paint to prevent FOUC.
// Must stay as a regular (non-module) script loaded before <body>.
(function () {
    var THEME_KEY = "tg-reader-theme";
    try {
        var stored = localStorage.getItem(THEME_KEY);
        if (stored === "light" || stored === "dark") {
            document.documentElement.dataset.theme = stored;
        } else {
            var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            document.documentElement.dataset.theme = prefersDark ? "dark" : "light";
        }
    } catch (e) {
        // localStorage unavailable — browser default applies
    }
})();
