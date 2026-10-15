<p align="center">
  <img src="extension/images/icon128.png" alt="Doom on GitHub" width="96">
</p>

<h1 align="center">Doom on GitHub</h1>

<p align="center">
  Play Doom on your GitHub contribution graph — a Chrome extension that
  compiles <b>DoomGeneric</b> to WebAssembly and renders every frame live
  onto the real contribution grid.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/engine-C%20%2F%20WebAssembly-informational" alt="C / WebAssembly">
  <img src="https://img.shields.io/badge/browser-Chrome-yellow" alt="Chrome">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="status: active">
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/hglcoobloepnmeagpgmmiiohnkcaiham">Install</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#build-from-source">Build from source</a> ·
  <a href="docs/SPECS.md">ABI spec</a> ·
  <a href="PRIVACY.md">Privacy</a>
</p>

---

## Install

**[Get it from the Chrome Web Store](https://chromewebstore.google.com/detail/hglcoobloepnmeagpgmmiiohnkcaiham).**

Then on any GitHub profile: open the contribution graph's **Contribution
settings** menu (top right of the graph) and check **Doom**. The graph
expands to a taller grid and a live game starts immediately — no setup,
no save file, nothing to configure.

Prefer to run it from source? See [Build from source](#build-from-source).

## How it works

- **Arrows** move and turn, **Ctrl** fires, **Space** uses/opens doors,
  **Escape** pauses. Standard Doom controls — nothing GitHub-specific.
- The game starts straight into E1M1 with monster respawning turned on, so
  a long-running tab stays lively instead of running out of demons.
- Every GitHub contribution-graph color level (the 5 shades from "no
  activity" to "a lot") maps directly to Doom's rendered brightness, dithered
  to avoid hard banding at this resolution.
- Toggling **Doom** off restores your actual contribution graph exactly as
  it was.

## Architecture

| Piece | What it does |
|---|---|
| `doomgeneric_github.c` | The DoomGeneric backend: owns the framebuffer, downsamples Doom's 320×200 render to the graph's resolution, and exposes a tiny C ABI (see [`docs/SPECS.md`](docs/SPECS.md)) for the JS host to drive. |
| `extension/src/doom/worker.js` | Runs the compiled WASM module in a dedicated Web Worker at Doom's native 35Hz tick rate, off the page's main thread. |
| `extension/src/doom/frame.js` + `engine.html` | A hidden iframe hosting the worker, relaying input in and frames out via `postMessage`. |
| `extension/src/doom/display-driver.js` | Expands the real contribution grid to the taller display size and paints each cell by setting its `data-level` attribute — the exact mechanism GitHub's own CSS uses to color a real contribution square. |
| `extension/src/content.js` + `utils.js` | Finds the contribution graph's settings menu and injects the **Doom** toggle into it. |

Nothing is downloaded at runtime: the WASM binary, the shareware IWAD, and
the Doom engine are all bundled in the extension. No network requests, no
accounts, no data collected — see [`PRIVACY.md`](PRIVACY.md).

## Build from source

Requires the [Emscripten SDK](https://emscripten.io/docs/getting_started/downloads.html)
on `PATH`.

```bash
emsdk_env    # or emsdk_env.bat / emsdk_env.ps1, from your emsdk checkout
make -f Makefile.emscripten clean
make -f Makefile.emscripten
```

This produces `engine.js` / `engine.wasm` at the repo root — copy both into
`extension/src/doom/` before loading the extension.

**Load the extension locally**: `chrome://extensions` → enable *Developer
mode* → *Load unpacked* → select the `extension/` folder.

**Test the engine without the extension**: serve the repo root
(`python -m http.server 8080`) and open `test/pipeline.html`, which drives
the exact same worker/iframe/input pipeline the real extension uses.

## ABI

The C ↔ JS boundary is small and documented in full in
[`docs/SPECS.md`](docs/SPECS.md): a handful of exported functions
(`DG_Github_Init`, `DG_Github_Input`, `DG_GetFramebufferPtr`,
`doomgeneric_Tick`) and one flat framebuffer, one byte per cell, values
`0`–`4` matching GitHub's contribution levels.

## Acknowledgments

- [**DoomGeneric**](https://github.com/ozkl/doomgeneric) by ozkl — the
  portable Doom implementation this is built on.
- **id Software** — for Doom, and for releasing the source.
