# Doom WASM Extension - Troubleshooting & Handoff Notes

## Current Status
- **Engine Running**: The WASM engine loads, initializes, and enters the main loop.
- **Worker Active**: The JS worker successfully drives the engine tick (35 FPS) and receives frame buffers.
- **Rendering Issue**: The output frame buffer contains all zeros (black screen), despite the engine appearing to run.
- **Input System**: Hooked up but untested due to lack of visual feedback.

## Architecture Overview
1.  **Core**: `doomgeneric` ported to Emscripten.
2.  **Headless Mode**: 
    - No HTML5/SDL DOM dependencies.
    - Runs in a Web Worker.
    - Custom "Tick" loop driven by `setInterval` in JS.
    - Framebuffer (320x200) downscaled to 53x39 (GitHub graph size) in C.
3.  **Data Flow**:
    - C `DG_DrawFrame` reads `DG_ScreenBuffer` -> Writes to `DG_Github_Framebuffer`.
    - JS Worker reads `DG_Github_Framebuffer` -> PostMessage -> Main Thread -> Canvas.

## Known Issues & Findings

### 1. The "Black Screen" (All Zeros)
- **Symptoms**: `DG_Github_Framebuffer` is full of zeros.
- **Verification**: 
    - Hardcoding pixels in `DG_DrawFrame` (e.g., `buffer[0] = 4`) **WORKS** and shows up in JS.
    - This proves the C->JS memory pipeline is valid.
    - Therefore, the source `DG_ScreenBuffer` is empty/black.
- **Hypotheses**:
    - **Palette**: Doom uses 8-bit color. If the palette isn't applied or `DG_ScreenBuffer` (which is 32-bit XRGB) isn't being populated by `R_DrawViewBorder` / `D_Display`, the result is black.
    - **Game State**: The game might be paused, in a "wipe" effect (fading from black), or stuck in a demo loop start state.
    - **Initialization**: `D_DoomMain` initializes the engine, but the first frame might not be drawn until several ticks later.

### 2. Emscripten "Standalone" Quirks
- **Syscalls**: We had to manually stub `__syscall_openat`, `fcntl64`, `ioctl`, etc., in `worker.js` because we aren't using the standard Emscripten JS runtime.
- **Main Loop**: `emscripten_set_main_loop` fails in worker/headless mode. We successfully switched to exporting `_doomgeneric_Tick` and calling it from JS.

### 3. Build Configuration
- **Resolution**: Fixed a mismatch where `doomgeneric` defaulted to 640x400. We explicitly set `-DDOOMGENERIC_RESX=320` in the Makefile.
- **Optimization**: Used `-O2 -g` to keep symbol names readable (`env` vs `a`).

## Next Steps for the New Engineer

1.  **Investigate `DG_ScreenBuffer` Population**:
    - Look at `doomgeneric/doomgeneric/doomgeneric.c`. Is `DG_ScreenBuffer` actually being written to by the software renderer?
    - `doomgeneric` usually hooks `I_FinishUpdate`. Check if that hook is actually copying the internal Doom 8-bit buffer to the 32-bit `DG_ScreenBuffer`.
    
2.  **Check `I_FinishUpdate`**:
    - In standard Doom, `I_FinishUpdate` is where the frame is blitted to the screen.
    - In `doomgeneric`, this function typically does the color conversion.
    - **Critical**: Ensure `I_FinishUpdate` is being called and is correctly converting the 8-bit buffer to the 32-bit `DG_ScreenBuffer`.

3.  **Verify WAD Loading**:
    - Ensure `doom1.wad` is correctly embedded and accessible. (Logs say "Init WADfiles", so this is likely fine).

4.  **Debug the Palette**:
    - If `DG_ScreenBuffer` is being written to but the values are 0, the palette lookup might be returning black (0x00000000).

## Key Files
- `doomgeneric_github.c`: The C adapter layer.
- `extension/src/doom/worker.js`: The JS host environment.
- `Makefile.emscripten`: Build configuration.
- `doomgeneric/doomgeneric/doomgeneric.c`: The core library we are using.
