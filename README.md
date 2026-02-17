# <img src="src/public/tsugi-icon-48.png" width="32" height="32" align="center" /> Tsugi (次)

[![License](https://img.shields.io/badge/license-GPL--3.0-7c3aed)](LICENSE)
[![Development Status](https://img.shields.io/badge/status-alpha-orange)]()
[![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)]()
[![Firefox](https://img.shields.io/badge/Firefox-MV3-FF7139?logo=firefox&logoColor=white)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

> ⚠️ **Early Development** — Tsugi is currently in alpha. Features may change and bugs are expected. Not yet available on extension stores.

Tsugi is a powerful, lightweight browser extension designed to seamlessly track your anime and manga progress across dozens of platforms and sync them automatically to your favorite trackers.

## Features

- **Automated Detection**: Supports 90+ community manga sources and major anime streaming sites.
- **Cross-Platform Sync**: Sync progress to MyAnimeList, AniList, Shikimori, and Bangumi.
- **Smart Tracking**: Forward-only sync ensures your progress never accidentally regresses.
- **Seamless linking**: Link your favorite site's entries to tracker entries with one click.
- **Status Management**: Manage your reading/watching status (Reading, Completed, On-Hold, etc.) directly from the extension.
- **"Currently Viewing" Focus**: Prioritizes what you're active on for the fastest possible heartbeats.

## Roadmap & Future Development

Tsugi is evolving rapidly. Future goals include:
- **Expanded Tracking**: Support for Western media trackers like **Letterboxd** (Movies/TV), **Trakt**, and **Goodreads**.
- **Mobile Support**: Optimized versions for mobile browsers.
- **Improved UI/UX**: Continued refinements to the discovery and linking pipeline.
- **Community Plugins**: Allowing users to write their own site detectors via a simple JSON/JS API.

## Installation & Setup

1. **Install Dependencies**: `pnpm install`
2. **Setup Credentials**: Copy `.env.example` to `.env` and add your tracker API keys.
3. **Run Development Server**: `pnpm run dev`
4. **Build**: `pnpm run build`

## Contributing

Tsugi is open source and contributions are welcome!

**Ways to contribute:**
- Report bugs via [Issues](https://github.com/yourusername/tsugi/issues)
- Submit platform detector improvements
- Add new tracker integrations
- Improve documentation
- Test on different platforms

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Disclaimer

Tsugi is a progress tracking tool that works with publicly accessible websites. 
It does not host, store, or provide access to copyrighted content. 

Users are responsible for ensuring their use of third-party platforms complies 
with applicable laws and terms of service.

## License

MIT
