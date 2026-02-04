# ABI Specification: DoomGeneric-Github

## 1. Exported Symbols

The module MUST export the following C symbols:

### Lifecycle
- `int main(void)`
  - Initializes the engine state and enters the main loop.
- `void DG_Github_Init(void)`
  - Resets the framebuffer to 0 and clears the input queue.
  - MUST be called before execution begins if `main` is not the entry point.

### Memory
- `uint8_t* DG_Github_Framebuffer`
  - Pointer to the static pixel data array.
  - Fixed size: 2067 bytes.

### Input
- `int DG_Github_Input(int key, int pressed)`
  - Injects a key event into the internal queue.
  - `key`: Doom internal key code or ASCII character.
  - `pressed`: 1 (down) or 0 (up).
  - Returns: 0 on success, 1 if queue is full.

## 2. Memory Ownership

- **Framebuffer**: 
  - Allocated statically within the WASM module's data segment.
  - Read-only for the Host.
  - Write-only for the Engine.
  - Valid only after `DG_Github_Init` has been called.

- **Internal State**:
  - The engine manages its own heap (Z_Zone) and stack.
  - No external memory injection is supported.

## 3. Framebuffer Semantics

- **Dimensions**: 53 columns × 39 rows.
- **Total Size**: 2067 bytes.
- **Structure**: Flat `uint8_t` array, row-major order.
- **Origin**: Top-left (0,0).
- **Pixel Format**:
  - `0`: Void / Background
  - `1`: Dark
  - `2`: Medium
  - `3`: Light
  - `4`: White / Peak
- **Consistency**: The buffer is fully rewritten every game tick.

## 4. Update Frequency

- **Tick Rate**: The engine logic runs at 35 Hz.
- **Execution**: The Host MUST yield execution time to the WASM module.
- **Determinism**: The engine execution is deterministic based on input history. Time-based entropy is disabled (`DG_GetTicksMs` returns 0).

## 5. Host Restrictions

- **File System**: Disabled. No WAD loading from disk.
- **Audio**: Disabled. No sound output.
- **Video**: No native window or canvas access.
- **Stdio**: Ignored.
