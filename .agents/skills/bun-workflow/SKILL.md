---
name: bun-workflow
description: Enforces the use of Bun for all package management, script execution, testing, and linting tasks across the web workspace.
---

# Bun Workflow (Audiobookphile Web)

This repository runs exclusively on **Bun**. Never invoke `npm`, `npx`, `yarn`, or `pnpm`.

## Core Directives

1. **Package Management**:
   ```bash
   bun install                # Install dependencies
   bun add <pkg>              # Add runtime dependency
   bun add -d <pkg>           # Add dev dependency
   bun remove <pkg>           # Remove dependency
   ```
2. **Type Checking**:
   - The type gate uses `tsrs` (Rust-based TypeScript checker) for ultra-fast compilation:
   ```bash
   bun run typecheck          # Runs scripts/tsrs.ts --noEmit
   ```
3. **Testing**:
   - Always run unit tests with Bun's native test runner:
   ```bash
   bun test                   # Run all 250+ unit tests
   bun test <path/to/test.ts> # Run single test suite
   ```
4. **Formatting & Linting**:
   ```bash
   bun run format             # Format codebase
   bun run lint               # Run linter
   ```
5. **Zero Node.js Overhead**:
   - Do not add Node.js polyfills or dependencies requiring native C++ Node addons unless verified with Bun.

