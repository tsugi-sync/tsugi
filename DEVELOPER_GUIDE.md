# Tsugi Developer Guide

Welcome to the Tsugi development guide. This document outlines the project's architecture and how to extend its capabilities.

## Architecture Overview

Tsugi is built using [WXT](https://wxt.dev/), React, and TypeScript.

### Project Structure

- `src/entrypoints/background.ts`: The core engine. Handles message routing, authentication flow, and synchronization logic.
- `src/entrypoints/content.ts`: The bridge between the browser tabs and the background script. Runs detectors periodically.
- `src/lib/detectors/`: Contains specific and generic site detectors.
- `src/lib/trackers/`: Implementations for various tracking APIs (MAL, AniList, etc.).
- `src/lib/utils/`: Shared utilities for storage, authentication (PKCE), and types.
- `src/entrypoints/popup/`: The React-based user interface.

## Adding a New Manga/Anime Site

To add support for a new site:

1. **Specific Detector**: If the site needs complex DOM parsing, add a new detector in `src/lib/detectors/index.ts`.
2. **Generic Detector**: If it's a standard community manga source, add its domain to the `matches` array in `genericMangaDetector` and ensure its domain is added to `wxt.config.ts` under `host_permissions`.
3. **WXT Configuration**: Update `wxt.config.ts` to include the new domain so the extension has permission to run content scripts on it.

## Adding a New Tracker

To integrate a new tracking service:

1. **Define Types**: Update `TrackerType` in `src/lib/types.ts`.
2. **Implement API**: Create a new file in `src/lib/trackers/` (e.g., `mytracker.ts`) implementing search and update functions.
3. **Update Background**: 
   - Add the new tracker to the `handleAuth`, `handleSearch`, and `syncToTrackers` functions in `background.ts`.
4. **Update Popup**: Add the tracker logo/colors to `popup.tsx`.

## Authentication

Tsugi uses OAuth 2.0 with PKCE wherever possible. Authentication secrets are stored in `.env` and injected via `import.meta.env`.

## Best Practices

- **Forward-Only Sync**: Always check `existing.lastProgress < newProgress` before syncing to avoid data loss.
- **Strict Detection**: Ensure detectors return `null` if they are not absolutely certain about the media title and current chapter.
- **Type Safety**: Leverage TypeScript's strict mode and ensure all messages and stored items follow the established interfaces in `types.ts`.
