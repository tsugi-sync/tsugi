# Contributing to Tsugi

First off, thank you for considering contributing to Tsugi! It's people like you that make Tsugi possible.

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report for Tsugi. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Check for duplicates**: Search existing issues before creating a new one.
- **Describe the bug**: Include clear steps to reproduce, the actual behavior, and what you expected to happen.
- **Environment**: Mention your browser version and the site/tracker involved.

### Suggesting Enhancements
Enhancements include new platform detectors, tracker integrations, or UI improvements.

- **Submit a Feature Request**: Open an issue describing your idea.
- **Detector Contributions**: You can add new site support in `src/lib/detectors/index.ts`. Follow the existing patterns.

### Code Contributions
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a Pull Request.

## Coding Standards

- **TypeScript**: All new code should be written in TypeScript with proper typing.
- **React**: Use functional components and hooks for UI.
- **WXT**: Follow the [WXT framework](https://wxt.dev) patterns for extension structure.

## Style Guide
- Use 2-space indentation.
- Follow the project's CSS variables for styling in `src/entrypoints/popup/style.css`.
- Keep components small and focused.

## Questions?
Feel free to open a Discussion, reach out via an Issue, or contact me on Discord: `408664950815326208`.
