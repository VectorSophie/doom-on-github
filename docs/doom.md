# Doom on GitHub Contribution Graph - Architecture & Implementation

## Overview
This project ports the Doom engine (via `doomgeneric`) to WebAssembly, specifically designed to run in a **headless** environment (Web Worker) and render to a non-standard output (GitHub contribution graph / 53x39 pixels).

## Architecture

### 1. The Engine (`doomgeneric_github.c`)
We use a custom backend for `doomgeneric` that minimizes dependencies:
*   **No SDL/DOM**: Standard Emscripten HTML5 ports rely on the browser's DOM and SDL for input/output. We bypass this to run inside a Worker.
*   **Custom Resolution**: The engine is compiled with `-DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200` to match standard Doom, preventing buffer size mismatches.
*   **Direct Framebuffer Export**: 
    *   The engine renders to an internal 320x200 buffer.
    *   `DG_DrawFrame` downscales this to 53x39 (GitHub graph size) and writes to `DG_Github_Framebuffer`.
    *   `DG_Github_Framebuffer` is exported directly to WASM for JavaScript to read.

### 2. WASM Build (Standalone)
We use a **Standalone WASM** build strategy to avoid the heavy Emscripten JS runtime glue:
*   **Flags**: `-s ENVIRONMENT=worker -s MODULARIZE=1 -s EXPORT_NAME='DoomModule' -O2 -g`
*   **Exports**: We explicitly export `_doomgeneric_Tick`, `_DG_Github_Input`, etc.
*   **Imports**: We provide a minimal `env` object with `get_host_ticks_ms`, `emscripten_sleep`, and `exit`.

### 3. The Controller (`worker.js`)
The worker acts as the "Operating System" for the engine:
*   **Loading**: Fetches and instantiates `engine.wasm`.
*   **Game Loop**: Instead of `emscripten_set_main_loop` (which requires the main browser thread), the worker runs its own `setInterval` at ~35 FPS.
    *   Calls `exports.doomgeneric_Tick()` directly.
    *   Reads `DG_Github_Framebuffer` from WASM memory.
    *   Posts the frame to the main thread.
*   **Input**: Receives key events via `postMessage` and feeds them into the engine's ring buffer via `DG_Github_Input`.

## Key Challenges & Solutions

### A. "Blank Screen" / Crash on Load
*   **Cause**: `doomgeneric` defaults to 640x400, but our buffer expected 320x200. The engine was writing out of bounds.
*   **Fix**: Explicitly set `-DDOOMGENERIC_RESX=320 -DDOOMGENERIC_RESY=200` in `Makefile.emscripten`.

### B. LinkError: "import function requires a callable"
*   **Cause**: Standalone WASM builds expect certain imports (like `exit`, `emscripten_set_main_loop`) to exist in the `env` object, even if unused.
*   **Fix**: 
    1.  Removed `emscripten_set_main_loop` from C code (switched to external ticking).
    2.  Added `exit: () => {}` stub to `worker.js` imports.

### C. Import Name Minification (`module is not an object`)
*   **Cause**: High optimization levels (`-O3`) minified import module names (e.g., `env` became `a`).
*   **Fix**: Used `-O2 -g` (debug info) to preserve readable import names (`env`).

## Reference
*   **doomgeneric**: https://github.com/ozkl/doomgeneric
*   **Emscripten Standalone**: https://emscripten.org/docs/compiling/WebAssembly.html#standalone-wasm
