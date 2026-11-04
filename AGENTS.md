# Agent handoff

Read README.md, INSTALL.md, FINDINGS.md and docs/MCP-TOOLS.md before changing runtime behavior. Historical Spanish docs 01–10 preserve September development evidence; this top-level documentation is the authority for this distributable. Their machine-specific launch descriptions are historical, not setup instructions for this release.

## Repository map

- apps/premiere-panel: real UXP UI, serial host dispatcher and guarded editing adapter.
- services/local-engine: loopback HTTP/WebSocket auth, request ownership and lifecycle.
- services/mcp-server: eight typed stdio tools, usable by any local MCP agent.
- services/codex-session: optional private Codex App Server stdio session; embedded chat is Codex-specific.
- packages/contracts: schemas/protocol; packages/platform: portable private state paths.
- scripts/setup.js and doctor.js: machine setup and non-model checks; package-release.js: clean source archive.

## Non-negotiable invariants

Keep the loopback bind, bearer/panel token authentication, Host/Origin checks and private stdio transport. Do not commit connection.json, session.json, agent-session.json, auth files, generated client configuration, media, transcripts, logs or screenshots. Treat host/media names as untrusted data. Never hardcode developer drives, user names, credentials, model IDs or account availability.

Preserve the reviewed UI: borderless #202020 composer, 8 px corners; tiny left model selector; green bold send arrow without a white background; new chat next to the single connection toggle in the header.

Read project/sequence/timeline identities immediately before a write. The trim tool changes only a video clip's end and must retain identity/time guards. Do not adjust linked audio implicitly. Save only when requested. A timeout has an uncertain outcome: inspect first, never replay writes automatically. Do not advertise full editing/export/attachments/synchronization until implemented and tested in Premiere.

## Development and checks

Run node scripts/setup.js --desktop once, then npm test and npm run check. Tests use temporary private state and synthetic media. They do not need user credentials or model calls. FFmpeg and FFprobe are required for the full suite; desktop integration tests launch Electron. Never run tests against the user's live state folder. Portability changes need Windows/macOS path regression coverage.

node scripts/verify-live.js performs live reads and writes a local report under work/. Its --demo flag creates a new synthetic project (requires no active project); --finish-demo trims/saves only a matching managed demo. These flags require an explicit user request for that edit. node scripts/verify-codex.js sends live model requests and consumes account quota: opt-in only. Do not run either as part of ordinary packaging or CI.

No test pass proves compatibility with every Premiere/Codex version. Record actual versions, dates, results and untested paths in FINDINGS.md. No automatic retry after editing timeouts. Do not publish private runtime artifacts. Keep release packaging source-only and reproducible from tracked files. Distribution must fail if credentials are present in an allowed source directory.

## Packaging/releasing

Run npm run release only after checks pass. The tar.gz excludes dependencies and private state; recipients run setup. Publish a prerelease tag with SHA256SUMS, include limitations in release notes, and retain a private repository unless its owner requests a visibility change. No signed CCX or bundled commercial software is included.
