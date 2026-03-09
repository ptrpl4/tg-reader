# tg-reader

A frontend-only Progressive Web App (PWA) for reading public Telegram posts in a cleaner interface, without requiring a Telegram account.

## Current Project State

`tg-reader` is currently a **single-page app** implemented in `index.html` (not a separate `reader.html` route).

### What Works Today
- Single-page flow with two UI modes:
  - Hero mode (project intro + quick link input)
  - Reader mode (post loading + rendering)
- Telegram link handling:
  - Supports `https://t.me/<channel>/<post>` links
  - Supports `tg://resolve?...post=...` links
  - Normalizes links to Telegram embed format (`?embed=1`)
- Client-side content extraction:
  - Fetches Telegram embed HTML through public CORS proxies
  - Parses content with `DOMParser`
  - Renders text, links, reply context, images, and videos
- Resilience:
  - Multi-proxy fallback chain (`CodeTabs` -> `AllOrigins` -> `ThingProxy`)
  - Timeout-based failover with user-visible loading state
  - Local post cache in `localStorage`
- Reader UX:
  - Theme toggle (light/dark) with persisted preference
  - URL state via query params (`?channel=<name>&post=<id>`)
  - Basic post navigation (`First`, `Previous`, `Next`)
- PWA baseline:
  - `manifest.json`
  - `service-worker.js` for asset and proxy response caching

## Known Gaps / Risks

- Telegram extraction relies on undocumented embed HTML that may change anytime.
- Public CORS proxies are external dependencies and may be unstable or rate-limited.
- `manifest.json` references icon files that are not currently present.
- Service worker still contains stale `reader.html` cache entries and should be cleaned up.

## Near-Term Plan

1. **Documentation Alignment**
- Keep README and planning docs synchronized with actual SPA architecture.
- Remove stale references to a separate `reader.html` page.

2. **Stability Hardening**
- Clean service worker cache lists and fallback behavior.
- Define and document proxy ordering, timeout policy, and failure UX.

3. **Product Features (Incremental)**
- UI customization improvements (themes, typography, layout options).
- Reading features (highlights/bookmarks).
- Shareable reader state encoded in URL (no backend).

4. **Optional Extensions**
- Local persistence enhancements (e.g., IndexedDB if needed).
- Accessibility and media features (e.g., text-to-speech).

## Repository Files (Current)

- `index.html`: App shell + all reader logic
- `styles.css`: Visual styling for hero, reader, and controls
- `service-worker.js`: Offline/cache logic
- `manifest.json`: PWA manifest metadata
- `context.md`: Detailed current-state and implementation notes
- `idea.md`: Product roadmap and phased future work
- `REGRESSION_CHECKLIST.md`: Manual smoke/regression checklist for core flows
