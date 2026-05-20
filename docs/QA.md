# QA — Offline desktop (PRD §12)

## macOS

- [ ] Install from built `.dmg` / app bundle
- [ ] Launch without network (airplane mode)
- [ ] First-run setup password, login
- [ ] Create clinic, patient, logbook row, file import, backup ZIP, restore ZIP
- [ ] Paths under app data resolve (no hard-coded separators in UI)

## Windows

- [ ] Install from `.msi` / `.exe`
- [ ] Same functional checklist as macOS

## Cross-cutting

- [ ] SQLite file created under app data `dental-implant/database/app.sqlite`
- [ ] Patient files under `dental-implant/files/patients/...`
- [ ] Login blocks access until authenticated
- [ ] CSV / backup exports open in external tools
