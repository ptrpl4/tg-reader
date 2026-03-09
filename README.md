# tg-reader

A serverless Progressive Web App (PWA) designed to provide a clean, customizable reading experience for Telegram posts without requiring a Telegram account.

## Project Overview

`tg-reader` is a frontend-only application that extracts content from public Telegram posts and displays them in a reader-friendly interface. It leverages client-side processing to maintain privacy and eliminate the need for backend infrastructure.

### Key Features
- **Serverless Architecture**: No backend server required; all fetching and parsing happens client-side.
- **PWA Support**: Installable as a standalone app with offline capabilities.
- **Clean Reader View**: Focused on readability, extracting text and media from public Telegram links.

## ⚠️ AI Experiment & Risks

This project is an **AI experiment** and should be treated as such.

- **Undocumented Requests**: The application functions by scraping Telegram's public web embed widgets. These are undocumented interfaces that Telegram can change, rate-limit, or block at any time without notice.
- **External Dependencies**: To bypass CORS restrictions in a serverless environment, the app currently relies on public CORS proxies.
- **Experimental Nature**: This is a proof-of-concept exploring the limits of browser-based content extraction.

## Usage Note

There is no point in building or deploying this project locally yet. It is currently in a research and development phase to test the feasibility of its serverless approach.

---
*Developed as an experiment in AI-assisted software engineering.*