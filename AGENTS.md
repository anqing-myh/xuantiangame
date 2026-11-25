# Repository Guidelines

## Project Structure & Module Organization

This directory currently contains no application code, tests, assets, or package manifests. Establish the layout when adding the first implementation, and update this guide to match. Prefer `src/` for application code, `tests/` for automated tests, `assets/` for static resources, and `docs/` for supporting documentation when those directories are needed. Keep related modules together and avoid creating empty placeholder directories.

## Build, Test, and Development Commands

No build, test, or development commands are configured yet. When introducing tooling, document the exact setup and execution commands in `README.md`, including required runtime versions. Expose common tasks through the chosen build system or package scripts. For example, use `npm test` only if a Node.js package and a corresponding test script have been added.

## Coding Style & Naming Conventions

Follow the idiomatic style of the selected language. Use consistent indentation within each file, descriptive names, and small modules with clear responsibilities. Configure a formatter and linter when the language and toolchain are established; commit their configuration. Avoid unrelated formatting changes in functional patches.

## Testing Guidelines

No testing framework or coverage threshold is configured. Add appropriate automated tests with new behavior and regression tests for bug fixes. Use descriptive test names that state the expected behavior, and document how contributors run the suite.

## Commit & Pull Request Guidelines

No Git history is available to establish existing conventions. Use concise, imperative commit subjects, such as `Add initial application structure`. Keep commits focused. Pull requests should describe the change, explain its purpose, list validation performed, and link relevant issues. Include screenshots for visible interface changes.

## Security & Configuration

Keep secrets and local credentials out of version control. Document required environment variables using placeholder values, and ignore generated files and local configuration when adding the project toolchain.
