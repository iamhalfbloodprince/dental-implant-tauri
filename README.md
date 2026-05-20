# Dental Implant Case Management (offline)

Tauri v2 desktop app — React, Vite, TypeScript, SQLite, Tailwind.

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Test

```bash
npm run test       # Vitest (unit)
cargo check       # Rust (run in src-tauri/)
```

Architecture: UI → `@/api/commands` (`invoke`) → Rust commands → SQLite / local files under the app data `dental-implant` folder.

See [docs/QA.md](docs/QA.md) for cross-platform / offline smoke checklist.
