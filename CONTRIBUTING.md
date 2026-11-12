# Contributing to Audiobookphile Web

Thank you for your interest in contributing to Audiobookphile Web! We welcome contributions from the open-source community, including bug fixes, UI improvements, localization, documentation, and feature proposals.

---

## Code of Conduct

All contributors and participants are expected to adhere to the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Toolchain & Principles

Audiobookphile Web runs on **Bun** end-to-end. There is no Node.js runtime or npm in this repository:

1. **Package Manager & Runtime**: Always use Bun (`bun install`, `bun run dev`, `bun test`). Never invoke `npm` or `yarn`.
2. **Type Checking**: We use `tsrs` (the fast Rust port of the TypeScript compiler). Run `bun run typecheck`.
3. **Linting & Formatting**: We use Bun's native linter and formatter (`bun lint`, `bun fmt`).
4. **Design Tokens**: UI components adhere to Tailwind CSS v4 and the "Liquid Glass" aesthetic tokens.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.2+) installed on your machine.
- A running Supabase instance (local via Supabase CLI or hosted via [Supabase Cloud](https://supabase.com)).

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Audiobookphile/audiobookphile-web.git
   cd audiobookphile-web
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure environment:**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. **Start the development server:**
   ```bash
   bun run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Gates

Before opening a pull request, ensure all gates pass locally:

```bash
# Type checking
bun run typecheck

# Unit tests
bun test

# Linting
bun run lint

# Code formatting check
bun run format:check
```

---

## Submitting a Pull Request

1. **Create a topic branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Follow Conventional Commits:**
   Use descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) convention:
   - `feat(player): add playback speed hotkeys`
   - `fix(auth): handle expired magic link callback`
   - `docs(readme): clarify Vercel template deployment steps`
3. **Push to your fork and submit a PR:**
   - Link any related GitHub issues.
   - Provide a clear summary of changes and before/after screenshots for visual UI changes.
