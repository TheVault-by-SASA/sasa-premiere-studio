# Findings and release evidence

Prepared 2026-11-04. Version 0.3.0-alpha.1. This is a developer alpha source distribution.

## Historical evidence (2026-09-13/14)

The predecessor was exercised on Windows with Premiere 26.5.0 and UDT 2.3.0.5. MCP created a synthetic six-second clip, trimmed it to four seconds, saved, and the saved project was inspected. Queries took roughly 55–70 ms on that tiny test; no general performance promise follows. One initial save froze Premiere; a later attempt passed after host actions were separated from network callbacks and the demo location changed. The cause was not isolated.

Panel chat, account-provided model selection, token snapshots and restored history were tested then. No current model names, account availability or plan capacity are promised. Historical details: docs/08-validacion-premiere-real.md, docs/09-modelos-tokens-codex.md.

## Packaging findings and changes

1. The original launcher required a specific Windows local runtime. Setup now installs from the lockfile in the extracted folder and stages pairing outside source.
2. The original MCP example contained a developer's absolute path. Setup now generates the actual Node/server/state paths privately for each machine.
3. Premiere launch was pinned to one product year. Windows discovery now checks installed Adobe directories; all platforms can use an explicit executable or launch manually.
4. Private state had no native macOS default. It now uses Library/Application Support on macOS and LOCALAPPDATA on Windows, with an absolute environment override.
5. External MCP use is agent-independent. The panel's embedded conversation remains Codex-specific and currently text-only.
6. Secrets, generated config, dependencies, media and local verification output are excluded from repository/release files. A source-directory allowlist and credential/path checks guard the archive.

## Limitations and open work

- macOS host/UI behavior is untested; only platform path logic has automated coverage. Linux is test/bridge-only because Premiere is not hosted there.
- No fresh November live Premiere edit or quota-consuming Codex chat is included in this packaging validation. Installed app-server protocol versions may require adaptation; doctor only checks executable availability.
- No signed CCX, notarized macOS app, Windows installer, offline dependency bundle, auto-updater or Adobe Marketplace approval. Installation uses Adobe developer tooling.
- No complete audio/effects/titles/export pipeline. Video-end trim leaves linked audio alone. No panel image uploads or full bidirectional message synchronization with another Codex client.
- connection.json/session.json are private local pairing artifacts; mode 0600 is requested on POSIX, while Windows access protection depends on the user's profile ACLs. This is not a complete security audit.
- Default port 32145 supports one shared local installation. Concurrent independent instances need separate private state/ports and staged panels.

## Release validation

See validation-results.json for commands, counts and actual outcomes from the packaging run. Automated suites use isolated synthetic state; the source archive is extracted into a separate folder and installed there before delivery. These checks do not expand host compatibility claims.
