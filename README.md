# Linux in Window

**A Customization Store + Package Manager + Runtime Engine for Windows Terminal.**

Turn your Windows Terminal into something completely different — a Cyberpunk deck,
a Minecraft world, a Matrix rain, a retro DOS box — with one click. Think
*Steam Workshop + VS Code Extensions + package manager*, but for terminal
customization.

```text
Open Linux in Window → Browse mods → Click "Cyberpunk Terminal" → INSTALL → RUN
                                                          ↓
                                     Windows Terminal opens, fully customized
```

Or from any shell (PowerShell / CMD / Git Bash / Windows Terminal):

```bash
linux run cyberpunk-terminal
```

---

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Development & Build](#development--build)
4. [CLI Reference](#cli-reference)
5. [Storage Layout](#storage-layout)
6. [Package Format](#package-format)
7. [The Nox Language](#the-nox-language)
8. [Creating a Mod](#creating-a-mod)
9. [Publishing a Mod](#publishing-a-mod)
10. [Profiles & Sharing](#profiles--sharing)
11. [Security Model](#security-model)
12. [Architecture](#architecture)
13. [Testing](#testing)
14. [Troubleshooting](#troubleshooting)

---

## Features

- **Marketplace GUI** (Electron + Vue 3): discover, search, filter, preview and
  install packages like an app store. Live WebGL previews (Three.js) before you
  even install anything.
- **Package manager CLI** (`linux`): 30+ commands — search, install, uninstall,
  update, upgrade, rollback, doctor, cache, logs, profiles, dev mode.
- **Runtime engine**: applies themes/fonts/prompts/backgrounds/animations to
  Windows Terminal, launches shells with the active customization.
- **Nox language**: a tiny declarative DSL for terminal UI, animation and 3D
  scenes — no JavaScript needed to write a mod.
- **Sandboxed execution**: `.nox` runs against a whitelisted capability API;
  Python scripts run with declared permissions only.
- **Mod combination**: theme + font + prompt + background + animation merge
  into one configuration, with conflict detection (never silent overwrites).
- **Backup & rollback**: every change snapshots Windows Terminal settings first;
  `linux rollback` restores instantly.
- **Mega packs & profiles**: bundle packages into profiles, export/import them
  as `.linuxprofile` files for one-click setup on another machine.
- **Safe mode** (`linux --safe`): disables third-party scripts, 3D and network
  packages when a mod breaks your terminal.
- **Offline mode** (`linux --offline`): installed + cached packages work without
  internet; local `.linuxmod` files can be installed directly.
- **Hot reload** (`linux dev watch`): edit `main.nox`, see it live.
- **SHA-256 integrity** on every download; failed checks cancel installation.

---

## Installation

### Requirements

| Component | Needed for |
|---|---|
| Node.js ≥ 18 | everything |
| Python ≥ 3.9 (optional) | packages that ship `.py` scripts |
| Windows Terminal | applying customizations on Windows |

Linux in Window is developed cross-platform, but *applying* changes to Windows
Terminal obviously requires Windows. On non-Windows systems everything else
(store, CLI, runtime simulation, tests) works normally.

### Install the app

```bash
git clone https://github.com/tamkogay9876-code/linux-in-window.git
cd linux-in-window
npm install
```

### Register the `linux` command globally

```bash
node packages/cli/src/index.js setup-path
# or: npm link ./packages/core   (adds bin/linux + bin/linux.cmd to PATH)
```

This asks before touching your user `PATH` — it never modifies system-wide
settings or requires Administrator.

Then from any terminal:

```bash
linux version
linux marketplace
```

---

## Development & Build

All commands run from the repository root.

```bash
npm install            # install all workspace dependencies

# --- CLI ---
npm run linux -- list          # run any CLI command through npm
node packages/cli/src/index.js help

# --- Tests ---
npm test               # node --test tests/  (parser, manifest, install,
                       # backup/rollback, registry, CLI smoke tests)

# --- Demo registry & sample .linuxmod files ---
node packages/demo-registry/src/index.js .demo-out
#    -> .demo-out/index.json      (marketplace index)
#    -> .demo-out/files/*.linuxmod
#    -> .demo-out/packages-src/   (readable source of each demo package)

# --- GUI (Vue 3 + Vite) ---
npm run dev:gui        # http://localhost:5173 (browser dev mode)
npm run build:gui      # production bundle -> packages/gui/dist

# --- Electron desktop app ---
npm run dev:electron   # full desktop window (loads dist GUI, IPC bridge)
```

Monorepo layout (npm workspaces):

```text
linux-in-window/
├── packages/
│   ├── core/       @liw/core      package manager, storage, backup, WT engine
│   ├── nox/        @liw/nox       Nox parser, sandbox runtime, browser compiler
│   ├── cli/        @liw/cli       `linux` command line
│   ├── gui/        @liw/gui       Vue 3 marketplace UI
│   ├── electron/   @liw/electron  desktop shell + IPC handlers
│   ├── ipc/        @liw/ipc       shared channel names
│   └── demo-registry/             bundled marketplace data + 6 demo packages
└── tests/                         end-to-end test suite
```

---

## CLI Reference

```text
Marketplace & packages
  linux search <query>            search the marketplace
  linux marketplace               browse the whole catalog
  linux install <package|file>    install by id, .linuxmod file or folder
  linux uninstall <package>       remove (backs up first)
  linux list                      installed packages + status
  linux info <package>            details (size, permissions, includes)
  linux update                    check for updates
  linux upgrade                   apply all updates (rollback-able)

Runtime
  linux run <package>             apply config + open Windows Terminal
  linux stop|restart <package>
  linux enable|disable <package>
  linux conflicts                 show pending theme merge conflicts

Profiles & sharing
  linux profile list|create|delete|add|remove|use
  linux export <profile> [file]   write a .linuxprofile
  linux import <file>             restore a shared setup

System
  linux doctor                    environment + package health check
  linux backup [label]            snapshot Windows Terminal settings + state
  linux rollback [backup-id]      restore latest or specific backup
  linux cache [list|clean]        manage the download cache
  linux logs <package>            per-package log tail
  linux settings [list|get|set]   application configuration
  linux favorite <package>        toggle favorite
  linux setup-path                register `linux` in user PATH

Developer mode
  linux dev create <name>         scaffold a new package skeleton
  linux dev validate              check manifest + nox files
  linux dev test                  run the package's self-test
  linux dev build                 pack folder -> <id>-<version>.linuxmod
  linux dev publish               submit to registry (goes to review queue)
  linux dev watch                 hot reload .nox while editing
  linux nox <file.nox>            compile a nox file to JSON

Flags
  linux --safe                    safe mode: no scripts, no 3D, no network
  linux --offline                 never touch the network
```

Example session:

```bash
$ linux search cyberpunk
Found 2 packages

ID                  VERSION  CATEGORY   DOWNLOADS  RATING
---------------------------------------------------------
cyberpunk-terminal  1.0.0    themes     12543      4.8
cyberpunk-ultimate  1.0.0    developer  5120       4.5

$ linux install cyberpunk-terminal
Downloading      ██████████████ 100%
Verifying sha256 ██████████████ 100%
Installing       ██████████████ 100%
Applying theme   ██████████████ 100%
✓ cyberpunk-terminal 1.0.0 installed

$ linux run cyberpunk-terminal
→ Windows Terminal launched with profile "Cyberpunk"
```

Package statuses reported by `linux list`:
`installed · running · stopped · disabled · broken · outdated · blocked`.

---

## Storage Layout

Everything lives under `%LOCALAPPDATA%\linux` (shown as `~/AppData/Local/linux`):

```text
linux/
├── packages/     installed packages, one folder per package id
├── cache/        downloaded .linuxmod archives
├── downloads/    in-flight downloads
├── temp/         extraction staging
├── runtime/      active runtime state
├── themes/       merged theme output
├── fonts/        package-provided fonts (only with user permission)
├── configs/      applied Windows Terminal settings fragments
├── scripts/      shared helper scripts
├── logs/         <package-id>.log per package
├── backups/      backup-YYYY-MM-DD-HHMMSS/ snapshots
├── registry/     local mirror of the marketplace index
└── settings/     app settings, state.json, profiles.json, collections.json
```

Override the root with the `LIW_HOME` environment variable (used by tests).

---

## Package Format

A package is a folder containing at minimum `package.json`; the shipped format
`.linuxmod` is a ZIP archive of that folder.

```text
cyberpunk-terminal/
├── package.json      manifest (required)
├── config.json       optional runtime config
├── main.py           optional entry point (manifest "entry")
├── install.py        optional post-install script
├── uninstall.py      optional cleanup script
├── README.md
├── theme/theme.json  color scheme + profile tweaks
├── assets/           icon, background, sounds, textures
├── scripts/          setup.ps1 / setup.cmd (run only with permission)
└── nox/              main.nox, ui.nox, background.nox
```

Manifest example:

```json
{
  "id": "cyberpunk-terminal",
  "name": "Cyberpunk Terminal",
  "version": "1.0.0",
  "author": "Linux in Window Community",
  "description": "Cyberpunk inspired terminal customization",
  "type": "theme",
  "entry": "main.py",
  "runtime": { "python": true, "nox": true, "webgl": true },
  "permissions": ["terminal", "filesystem:user", "windows-terminal"],
  "targets": ["windows-terminal", "powershell", "cmd"],
  "dependencies": ["neon-grid-animation"],
  "performance": { "gpu": "medium", "ram": "low", "fps": 60 },
  "assets": { "preview": "preview.png", "icon": "assets/icon.png" }
}
```

Rules enforced by the manifest validator:

- `id`: lowercase `[a-z0-9-]+`; `version`: strict semver.
- Every declared dependency must exist in the registry (auto-installed).
- Unknown permissions produce warnings and an explicit consent dialog.
- SHA-256 mismatch ⇒ `Package integrity check failed. Installation cancelled.`

### Theme JSON

`theme/theme.json` maps onto Windows Terminal settings:

```json
{
  "scheme": { "name": "Cyberpunk", "foreground": "#00FFCC",
              "background": "#050509", "cursorColor": "#FF00AA" },
  "profile": { "fontFace": "Cascadia Mono NF", "fontSize": 12,
               "opacity": 0.95, "padding": "8,8,8,8", "cursorShape": "vintage" },
  "prompt": { "style": "powerline", "format": "" }
}
```

Supported keys include colors, cursor style/color, font & size, background
(color/image), opacity/acrylic, padding, tab styling, selection color, startup
directory and shell command.

---

## The Nox Language

Nox is a small declarative language for terminal look, UI panels, animations
and 3D scenes. Files use the `.nox` extension. Comments start with `#`.

### Terminal

```nox
terminal {
    background "#050509"
    color "#00ffcc"
    cursor {
        color "#ff00aa"
        blink true
        shape bar
    }
}
```

### Panels (glassmorphism UI)

```nox
panel {
    position center
    width 600
    height 300
    blur 20
    radius 20
}
```

### Animations

```nox
animation pulse {
    target "terminal"
    property opacity
    from 0.7
    to 1.0
    duration 1200
    loop true
}
```

### 3D scenes (WebGL / Three.js)

```nox
scene {
    background "#050505"
    cube {
        position 0 0 -5
        rotation 0 45 0
        color "#00ffff"
        animate rotation.y {
            from 0
            to 360
            duration 4
            loop true
        }
    }
    particles { count 400 }
    grid {}
    stars {}
    rain {}
}
```

Allowed top-level blocks: `terminal · scene · animation · panel · prompt ·
cursor · window · widget`. Anything else is rejected by both
`validateNox()` and the sandbox runtime — this is what keeps mods from doing
arbitrary things.

Compile/check from the CLI:

```bash
linux nox nox/main.nox          # compile to JSON
linux dev validate              # parse-check every .nox in the package
```

### Nox runtime sandbox

`.nox` programs execute against a capability API object. Only these namespaces
exist inside the sandbox:

```text
terminal.*  theme.*  window.*  ui.*  scene.*  animation.*  audio.*  package.*  system.readOnly.*
```

There is **no** `fs`, `net`, `child_process`, registry access, or DOM escape
hatch. Programs are also budget-limited (max nodes / max nesting depth) so a
runaway animation cannot lock the terminal.

---

## Creating a Mod

```bash
linux dev create my-theme
cd my-theme
# edit package.json, theme/theme.json, nox/main.nox ...
linux dev validate      # manifest + nox syntax
linux dev test          # runtime smoke test in the sandbox
linux dev watch         # hot-reload preview while editing
linux dev build         # -> my-theme-1.0.0.linuxmod
linux install ./my-theme-1.0.0.linuxmod
linux run my-theme
```

The five bundled demo packages double as reference implementations:

| Package | Demonstrates |
|---|---|
| `minimal-terminal` | pure JSON theme, zero runtime |
| `retro-dos` | JSON + Python logic |
| `cyberpunk-terminal` | JSON + Nox (colors, cursor, animation) |
| `matrix-terminal` | Nox + WebGL rain effect |
| `minecraft-terminal` | Nox + Three.js scene + assets |
| `cyberpunk-ultimate` | mega-pack: combines 5 packages via dependencies |

---

## Publishing a Mod

```bash
linux dev publish
```

Uploads the `.linuxmod` + manifest to the registry, where it enters the
**Pending review** pipeline:

1. manifest schema validation
2. permission audit (dangerous scopes flagged)
3. file structure check
4. malware scan (script allow-list + static analysis)
5. dependency resolution check
6. compatibility matrix (Windows 10+/11+, shells)

Approved packages appear in `linux marketplace` / the GUI Discover page with
download counts and ratings metadata.

---

## Profiles & Sharing

```bash
linux profile create cyberpunk
linux profile add cyberpunk cyberpunk-terminal
linux profile add cyberpunk neon-grid
linux profile use cyberpunk          # apply + relaunch terminal
linux export cyberpunk               # -> cyberpunk.linuxprofile
linux import cyberpunk.linuxprofile  # on another machine: installs everything
```

In the GUI, profiles give you a one-click **INSTALL PROFILE** button
(theme + font + prompt + background + aliases in one action).

### Conflicts

If two enabled packages set the same key:

```text
Configuration conflict detected
cyberpunk-terminal wants: foreground = #00FFCC
glass-terminal     wants: foreground = #FFFFFF
Choose: [Use Cyberpunk] [Use Glass] [Merge]
```

Nothing is ever silently overwritten; the choice is recorded in
`configs/conflicts.json`.

---

## Security Model

- **Least privilege.** A package only gets what its manifest declares. Default
  grants: read own folder, write own state, restyle the terminal.
- **Explicit consent.** Installing a package that requests elevated scopes
  (network, filesystem beyond user dir, shell scripts) shows a permission
  dialog listing exactly what will happen.
- **Never automatic:** Administrator rights, registry modification, disabling
  antivirus, system directories, drivers, boot loader. These are not
  expressible in the permission vocabulary at all.
- **Integrity.** Every artifact carries a SHA-256 checksum verified after
  download and after extraction.
- **Isolation.** Nox runs in the capability sandbox; Python scripts run as
  separate processes with a scrubbed environment and a time limit.
- **Reversibility.** Backup-before-write everywhere; `linux rollback` and
  `linux --safe` recover from any bad mod.
- **Fonts** are only installed into the user font store, and only after the
  `fonts:user` permission is granted.

---

## Architecture

```text
                 LINUX IN WINDOW
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   Marketplace     Package Manager    Runtime
   (GUI/Electron)  (@liw/core)        (Nox + Python + WebGL)
        │               │                │
    Discover        Install/Update     Sandbox
    Search          Dependencies       Hot reload
    Preview         Backup/Rollback    Perf limits
        └───────────────┼────────────────┘
                        │
                Windows Terminal
          ┌─────────────┼──────────────┐
       Theme          Prompt           3D
       Font           Shell         Animation
    Background      Widget         Effects
```

Key flows:

- **Install pipeline (15 steps):** download manifest → verify → compatibility
  check → download → checksum → extract to `temp/` → analyze permissions →
  resolve dependencies → backup → copy files → run install script → apply
  Windows Terminal config → register → mark installed → clean temp.
- **Run flow:** load package state → merge themes of all enabled packages →
  detect conflicts → write WT settings fragment → spawn `wt.exe` (or simulate
  on other OS) with the chosen profile/shell.
- **IPC:** Electron main exposes typed channels (`@liw/ipc`) consumed by the
  Vue store through `window.liw` (context-isolated preload).

---

## Testing

```bash
npm test
```

Covers: Nox tokenizer/parser/validator/browser-compiler, manifest validation,
dependency resolver, install → uninstall → rollback roundtrip, backup system,
registry search, and CLI smoke tests (version/help/search). Uses a temporary
`LIW_HOME` so your real installation is never touched.

Current status: **22/22 passing**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| A mod broke my terminal | `linux --safe` then `linux disable <pkg>` or `linux rollback` |
| `linux` not found | rerun `linux setup-path`, restart the shell |
| Integrity check failed | package corrupted/MITM — `linux cache clean` and retry |
| Windows Terminal didn't change | close **all** WT windows, then `linux run <pkg>` again |
| `doctor` shows broken package | `linux logs <pkg>` → fix or `linux uninstall` + reinstall |
| Outdated dependency warning | `linux upgrade` |
| Everything slow | Settings → Performance: lower FPS cap / 3D quality, enable Reduce motion |
| Offline? | `linux --offline` — installed & cached packages keep working |

Logs: `~/AppData/Local/linux/logs/<package-id>.log` or `linux logs <pkg>`.

---

## License

MIT
