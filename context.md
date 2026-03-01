# Project Context

## User Requests
- Build frontend-only PWA for reading Telegram posts
- Core features: 
  1. Homepage describing project (`index.html`)
  2. `/reader` page that takes Telegram post links and displays content (`reader.html`)
- Future enhancements:
  - UI/UX customization
  - Text highlighting/bookmarks
  - Shareable links with custom data (highlights, etc)
  - Client-side reconstruction of shared links without server

## Model Details
- Model used: Gemini 3.5 Flash (via expert assistant)
- Processing time: Variable - optimized for rapid iterative development.

## Technical Context
- **Project structure:**
  - Frontend-only architecture (no backend server)
  - PWA capabilities (offline access, installable)
  - Key files:
    - `index.html`: Main homepage.
    - `reader.html`: Page for fetching and displaying Telegram post content.
    - `manifest.json`: PWA manifest for installability.
    - `service-worker.js`: Handles offline capabilities and asset caching.
    - `styles.css`: Centralized CSS for the application, including post formatting.
- **Content Extraction Strategy:**
  - Uses `api.allorigins.win` as a CORS proxy to fetch Telegram's public embed HTML (`?embed=1`).
  - Uses `DOMParser` client-side to extract text, images, and video metadata from the Telegram widget DOM.
  - Handles various Telegram link formats by normalizing them to embed URLs.
- **Key challenges:**
  1. **CORS:** Solved via AllOrigins proxy.
  2. **Content Extraction:** Solved via DOM parsing of Telegram's public embed widgets.
  3. **PWA Offline Support:** Managed via Service Worker.
- **Example test link:** https://t.me/korovany/1494
- **Development notes:** 
  - Using pure JavaScript and modern web APIs.
  - No legacy browser support required.

## Current Progress
- [x] Basic PWA manifest and service worker.
- [x] Responsive UI for homepage and reader.
- [x] Functional client-side scraping of public Telegram posts.
- [x] Support for text formatting, links, and images from posts.
- [x] Loading states and error handling for fetch operations.

## Development Notes
- Prioritize core functionality first.
- Maintain pure JavaScript approach to keep the project lightweight and dependency-free.
- Next steps involve enhancing the UI/UX and implementing shareable link state.