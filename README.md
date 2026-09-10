# <img src="packages/apps/tauri/src-tauri/icons/icon.png" width="52" height="52" alt="ambery icon"> Ambery

English | [中文](README.zh.md)

Ambery is an agent harness built on Tauri: it gives an agent memory, tools, and a schedule. It is a draggable, always-on-top desktop pet, and what it has to say shows up as Cards.

Early stage: releases are published as pre-releases, the protocol is not frozen yet, and the release ladder is [docs/roadmap.md](docs/roadmap.md).

At its core is the [Ambery Protocol](docs/access-protocol.md): a higher-level access protocol built on MCP, which makes outside programs and files into things the pet can watch. Each one keeps a stable id, and changes are filed under it; news arrives either pushed by the thing itself or read by the pet on a schedule.

## Quickstart

Rust stable, Node 24 + npm; Windows builds also need .NET 9 (the no-sidecar scripts in `packages/apps` drop that requirement).

```bash
# Let the pet hear your Claude Code sessions (Windows, PowerShell 7) — from the repository root
# today this installs hook scripts; it will change to parsing session files
pwsh -File scripts/install-hooks.ps1

# Frontend dependencies, then the shell (it embeds the core)
cd packages/apps && npm ci
cd tauri && npx tauri dev
```

`npx tauri build` produces the installer, and `cargo test --workspace` runs the Rust suite. The headless cases, the browser debug UI, and the storage tooling are in [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Platform matrix

| Platform | Status |
|---|---|
| Windows 10/11 | Tauri shell + tray + hook installer |
| macOS | Tauri shell + hook-driven supervision |
| Linux | Tauri shell + hook-driven supervision |

## Documentation

- [concepts.md](concepts.md) — the concept model
- [spec.md](spec.md) — repository structure and technology choices
- [docs/roadmap.md](docs/roadmap.md) — the release ladder
- [docs/DEVELOPING.md](docs/DEVELOPING.md) — build, run, debug
- [CONTRIBUTING.md](CONTRIBUTING.md) — contributing

## License

MIT
