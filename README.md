# Doom on GitHub Contribution Graph

A high-performance port of Doom designed specifically to run on the GitHub contribution graph (53x39 resolution). Built with WebAssembly and DoomGeneric.

## Overview

This project runs the Doom engine inside a Web Worker and renders its output directly onto the GitHub contribution grid. It leverages **DoomGeneric** for portability and **Emscripten** for WebAssembly compilation.

### Key Features
- **Headless Execution**: Bypasses SDL and DOM dependencies to run entirely within a Web Worker.
- **Cinematic Rendering**: No-border grid expansion for a seamless, pixel-perfect visual experience on GitHub.
- **Dynamic Downscaling**: Real-time downsampling from 320x200 (Doom internal) to 53x39 (GitHub grid).
- **High Contrast Mapping**: Custom luma-to-contribution-level mapping ensuring deep shadows map to the GitHub "no contribution" color.
- **Low Latency Input**: Asynchronous key event injection via a ring buffer.

---

## Architecture

### 1. The Engine (`doomgeneric_github.c`)
Custom `doomgeneric` backend tailored for the GitHub environment:
- **Direct Framebuffer Export**: Renders to a static `uint8_t` array (`DG_Github_Framebuffer`) of 2067 bytes.
- **Optimized Resolution**: Compiled at 320x200 to balance performance and visual fidelity.
- **Custom Luma Mapping**: Maps 8-bit color to 5 GitHub contribution levels (0-4).

### 2. The Build Pipeline
- **Emscripten Standalone-ish**: Uses `-s MODULARIZE=1` and `-s ENVIRONMENT=worker` for clean worker integration.
- **WASI Compatibility**: Implements required WASI stubs for standard library support in a browser environment.
- **Embedded Assets**: `doom1.wad` is embedded directly into the WASM binary for zero-configuration startup.

### 3. The Controller (`worker.js`)
Acts as the "Host OS" for the WASM module:
- **Polymorphic Heap Detection**: Automatically detects the WASM memory buffer across different Emscripten build configurations.
- **Deterministic Ticking**: Drives the game loop at 35Hz via `setInterval`, perfectly syncing with Doom's internal tick rate.
- **Memory-Safe Transfers**: Uses `postMessage` with Transferables to send frame data to the UI thread without copying overhead.

---

## Build & Test

### Prerequisites
- **Emscripten SDK (EMSDK)**: Required for compiling the C source to WASM.
- **Python 3**: For the local test server.

### Compiling
To rebuild the engine from scratch:
```bash
make -f Makefile.emscripten clean
make -f Makefile.emscripten
```

### Testing Locally
1. Start a local server at the root:
   ```bash
   python -m http.server 8080
   ```
2. Open your browser to `http://localhost:8080/test/index.html`.
3. Press **Shift+F5** to force a clean load.

---

## ABI Specification

### Exported Symbols
| Symbol | Type | Description |
| :--- | :--- | :--- |
| `_main` | Function | Entry point. Initializes engine state. |
| `_DG_Github_Init` | Function | Resets framebuffer and input queue. |
| `_DG_Github_Input` | Function | Injects key event (key, pressed). |
| `_DG_GetFramebufferPtr`| Function | Returns pointer to the 2067-byte pixel array. |
| `_doomgeneric_Tick` | Function | Executes one game tick (1/35th sec). |

### Framebuffer Format
- **Dimensions**: 53 columns × 39 rows.
- **Pixel Values**:
  - `0`: Void / Background (#161b22)
  - `1`: Dark Green
  - `2`: Medium Green
  - `3`: Light Green
  - `4`: White / Peak Green

---

## Acknowledgments
- **DoomGeneric**: The foundation for this portable Doom implementation.
- **ozkl**: Original creator of the `doomgeneric` framework.
- **id Software**: The legends who started it all.
