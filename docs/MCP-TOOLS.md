# MCP tools for any agent

Transport: local stdio, command/args/env printed by setup. Eight tools; schemas in services/mcp-server/main.js and packages/contracts/index.js are canonical.

| Tool | Inputs | Behavior |
| --- | --- | --- |
| studio_status | {} | Local service/panel state; no project changes |
| premiere_host_info | {} | Connected host version/capabilities |
| premiere_project_snapshot | {} | Active project/sequences and identifiers |
| premiere_sequence_timeline | projectId, sequenceId, limit (1–500, default 200) | Video/audio timeline identity and timing |
| media_probe | path (absolute local file) | FFprobe format/streams; read only |
| premiere_trim_video_clip_end | projectId, sequenceId, trackIndex, clipIndex, expectedName, expectedStartTicks, expectedEndTicks, newEndTicks | Shortens one video end; inspect schema for tick/string constraints |
| premiere_save_project | projectId | Saves only the matching active project |
| premiere_create_demo_edit | {} | New synthetic project, 6→4s demo and save; no existing active project allowed |

Begin with studio_status, then project_snapshot and sequence_timeline. Take exact identities/ticks from fresh results, never infer them from display names or rounded seconds. After an authorized trim, reread the timeline before any save. Report linked-audio limitations. Check isError in MCP results; text content carries structured JSON errors. A transport failure or timeout is not proof that a write did not apply.

Codex embedded chat injects this bridge automatically, disables other MCP servers and requests read-only sandbox configuration for shell/file behavior. That sandbox setting does not make MCP editing tools read-only. Other clients must apply their own tool approval controls.
