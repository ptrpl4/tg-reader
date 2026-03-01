# Project Context

## User Requests
- Build frontend-only PWA for reading Telegram posts
- Core features: 
  1. Homepage describing project
  2. /reader page that takes Telegram post links and displays content
- Future enhancements:
  - UI/UX customization
  - Text highlighting/bookmarks
  - Shareable links with custom data (highlights, etc)
  - Client-side reconstruction of shared links without server

## Model Details
- Model used: qwen3:8b (local model)
- Processing time: ~3.2s (initial prompt), ~1.8s (subsequent requests) - tested on M2 MacBook Pro

## Technical Context
- Project structure: 
  - Frontend-only architecture (no backend server)
  - PWA capabilities (offline access, installable)
  - Client-side data storage for shared links
- Key challenges:
  1. Telegram API access without server (potential rate limits)
  2. Cross-browser PWA compatibility
  3. Secure client-side storage of sensitive data
  4. Content extraction from Telegram posts (HTML sanitization)
  5. Link-based state reconstruction for shared content

## Development Notes
- Prioritize core functionality first
- Use modern frontend frameworks (e.g., React/Vue) for PWA
- Implement content security policies for embedded media
- Design shareable URLs with query parameters for customization
- Plan for progressive feature rollout (basic reader → advanced customization)