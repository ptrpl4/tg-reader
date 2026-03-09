# tg-reader

A frontend-only Progressive Web App (PWA) for reading public Telegram posts in a cleaner interface, without requiring a Telegram account.

## What It Does

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

## Notes

- Telegram extraction relies on undocumented embed HTML that may change anytime.
- Public CORS proxies are external dependencies and may be unstable or rate-limited.

## Tech

- Plain HTML, CSS, and JavaScript
- No backend services
- Browser `localStorage` + Service Worker caching
