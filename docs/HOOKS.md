# Engine Hooks

## Framebuffer Output
**Location**: `DG_DrawFrame`
**Trigger**: End of rendering phase (synchronous).
**Target**: `DG_Github_Framebuffer` (exported symbol).
**Action**: Downsamples internal 320x200 32-bit buffer to 53x39 3-bit grayscale.

## Input Injection
**Location**: `DG_Github_Input`
**Trigger**: Host event (keyboard).
**Storage**: Ring buffer `input_queue[16]`.
**Consumption**: `DG_GetKey` called by `D_DoomLoop`.

## Main Loop
**Location**: `main` -> `D_DoomMain`
**Advance**: Engine assumes continuous execution.
**Yielding**: Relies on Emscripten Asyncify or Host scheduler to break infinite loop.
