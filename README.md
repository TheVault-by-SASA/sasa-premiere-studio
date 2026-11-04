# SASA Premiere Studio

Portable developer distribution **0.3.0-alpha.1**: an Adobe Premiere UXP panel, local service, optional Electron companion, and an MCP stdio server usable by any local MCP-capable agent.

The panel contains Codex chat, dynamic model/reasoning selection, confirmed token usage, stop/new-session controls and connection status. Its conversation is independent of other chats. External agents use MCP directly and do not require Codex; the embedded chat requires a locally authenticated Codex installation with a ChatGPT account.

## Install

Extract locally, keep the folder in place, install Node.js 22+ and npm, then run:

```sh
node scripts/setup.js
npm run doctor
npm run engine
```

Setup installs locked production dependencies, prepares a privately paired panel and writes a machine-specific MCP configuration outside this repository. Load the **printed staged manifest** in Adobe UXP Developer Tools, not the source manifest. Adobe requires Premiere 25.6+ and UXP Developer Tools 2.2+; enable developer mode in Premiere and UDT, and restart Premiere.

For the optional desktop companion, use `node scripts/setup.js --desktop`, then `npm start`. Windows also has `Install Windows.cmd` and `Abrir SASA Premiere Studio.cmd`. macOS can run `sh "Start macOS.command"` after setup. Setup downloads dependencies; this is a source distribution, not an offline binary installer or signed Adobe CCX package.

Read [INSTALL.md](INSTALL.md) for Windows/macOS steps, MCP configuration, updates and troubleshooting; [FINDINGS.md](FINDINGS.md) for evidence and limitations; [AGENTS.md](AGENTS.md) for agent handoff; [docs/MCP-TOOLS.md](docs/MCP-TOOLS.md) for exact tool contracts.

## Implemented capabilities

- Read host status, project/sequences and timeline identities/times.
- Inspect local media with FFprobe.
- Shorten the end of one video clip, preserving its start. Linked audio is not adjusted.
- Explicitly save the identified active project.
- Create an isolated synthetic demo only when no project is active.

There are eight MCP tools. Full audio editing, effects, titles, transitions, export and panel image attachments remain unimplemented. Supported APIs are not equivalent to implemented tools.

## Compatibility and validation

Windows Premiere 26.5 was exercised during September 2026 development: a synthetic six-second clip was shortened to four seconds and the saved project was inspected. This release adds portable paths/setup. It does not claim a fresh November Premiere session or a completed macOS host test. macOS portability is provisional; Linux can run bridge tests but cannot host Premiere.

`npm test` runs isolated automated tests (FFmpeg, FFprobe and desktop development dependencies required); `npm run check` checks syntax/JSON. Live scripts are opt-in and described in AGENTS.md. Credentials, media and conversations are excluded from distributions.

## Ownership

Copyright 2026 SASA. Private internal distribution; no open-source license is granted. Adobe, OpenAI, Node.js, FFmpeg and npm dependencies retain their respective licenses and are installed separately.
