# Installation and operation

## Requirements

Use a local Windows or macOS workstation supported by your installed Premiere. Required: Node.js 22+ with npm, Premiere 25.6+, UXP Developer Tools 2.2+, and network access for dependency installation. FFprobe enables media inspection; FFmpeg enables the synthetic demo and automated media tests. Neither is bundled. Obtain prerequisite software from its official publisher.

For embedded panel chat only: install Codex, sign in locally with your own ChatGPT account, and ensure its native executable is available. Do not copy another user's auth files. The integration rejects API-key account fallback. External MCP agents authenticate through their own client; they do not need Codex installed.

## 1. Prepare a fresh workstation

Download the release archive, extract into a permanent local folder, open a terminal there, and run:

```sh
node scripts/setup.js
npm run doctor
```

The optional desktop UI requires `node scripts/setup.js --desktop` instead. Windows double-click installation uses that desktop option. Do not run this from a network share. No administrator privileges or global install is required by this project. Setup changes only its local dependencies and the selected private state folder; it does not alter your agent's configuration automatically.

Default private state: Windows `%LOCALAPPDATA%/SASA/PremiereStudio`; macOS `~/Library/Application Support/SASA/PremiereStudio`. For a separate installation, set `SASA_STUDIO_STATE_DIR` to an absolute private writable folder **before setup and for every subsequent process**. Each independent simultaneous instance also needs a unique port in its private connection.json; stop that instance before changing the port and restage the panel afterward.

## 2. Load the panel in Premiere

Enable developer mode manually in Premiere Settings/Preferences > Plugins and in UXP Developer Tools. Restart Premiere. In UDT, Add Plugin > choose the staged manifest.json printed by setup > Load. Open Window > UXP Plugins > SASA Premiere Studio and dock the panel.

Use `npm run engine` to keep the service alive, or `npm start` for the optional desktop UI. An MCP client can also start the engine on demand. Green power = connected; gray = off; amber = waiting. Turning off cancels automatic reconnect. The source panel is intentionally unpaired; loading it directly is not the installation procedure. The staged panel contains a local secret and must never be shared.

## 3. Connect any local agent

Setup writes `mcp-client.json` in the private state directory with the correct absolute Node executable, server path and state environment. Merge its `mcpServers.sasa-premiere-studio` entry into your client's supported local stdio MCP configuration; preserve other entries. Clients with another schema must map command, args and env to their equivalent fields. Reload the client or start a fresh task and confirm eight tools are available. Begin with studio_status and premiere_project_snapshot.

The embedded chat needs no separate global MCP registration: it injects its own scoped bridge config. Use `node scripts/doctor.js --codex` before trying it. Models come from the signed-in account. Enter sends, Shift+Enter inserts a newline. References cannot yet be attached to the panel; images attached to another chat do not transfer automatically.

## Configuration overrides

| Variable | Purpose |
| --- | --- |
| SASA_STUDIO_STATE_DIR | Absolute private pairing/history directory; keep consistent across clients |
| SASA_CODEX_EXECUTABLE | Absolute native Codex binary, useful when a GUI app cannot find PATH |
| SASA_PREMIERE_EXECUTABLE | Optional full Premiere executable path (macOS: executable inside the .app); otherwise launch Premiere manually |
| SASA_FFPROBE | Custom FFprobe executable path |
| SASA_STUDIO_DEMO_DIR | Absolute location for opt-in synthetic demos |

On macOS install native Node for your architecture; npm downloads the matching Electron build when desktop dependencies are selected. Codex must be a native executable, not a Windows .cmd shim. Finder-launched apps may have a different PATH: configure the explicit Codex path or launch from a terminal.

## Updates and removal

Stop work and close the desktop/service/MCP clients before replacing their source folder. Keep private state to preserve pairing/history. Extract the new version, rerun setup and update the agent's absolute path if it moved; unload/load the staged plugin in UDT after manifest changes. Back up private state only to a private location. Do not ship it in a release. There is no auto-updater.

To remove: unload the plugin in UDT, remove only this server entry from each agent, close its processes and remove the extracted source folder. Private state may be retained or removed explicitly by its owner; setup never deletes conversations or media.

## Troubleshooting

- Offline: start the engine, check the power toggle, staged manifest and state-directory match. Do not expose port 32145 externally. If occupied, stop only the known owner or use a separately configured instance.
- Authentication mismatch: clients must use the same private state. Never paste tokens into issues/logs. Restage with `npm run stage-panel` using the same environment.
- Host absent in UDT: check developer mode, restart Premiere and verify its version. Manifest edits require unload/load.
- Desktop dependency missing: rerun setup with --desktop. Headless production-only setup intentionally omits Electron.
- A model/action times out: inspect the project and current turn before retrying. An edit can already have applied.
- Desktop cannot launch Premiere: open it in Creative Cloud or configure its executable; arbitrary installed versions are not hardcoded.
- Doctor failures: fix required dependencies first; FFmpeg/FFprobe/Codex are optional for features not used. Doctor checks executables only, not login or a live Premiere connection.

## Upstream references

[Adobe prerequisites and UDT loading](https://developer.adobe.com/premiere-pro/uxp/plugins/) · [Codex App Server](https://learn.chatgpt.com/docs/app-server). Reviewed for packaging on 2026-11-04; runtime compatibility must still be checked against the installed versions.
