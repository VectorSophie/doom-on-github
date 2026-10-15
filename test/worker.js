let DoomModuleInstance = null;
let framebufferOffset = 0;
let inputFn = null;
let pendingInput = []; // INPUT events that arrive before the WASM module is ready

let lastFrameTime = 0;
let frameCount = 0;
let lastLogTime = 0;
let startTime = performance.now();
let lastSentFrame = null;
const GH_BUFFER_SIZE = 53 * 60; // keep in sync with GH_RES_X/GH_RES_Y in doomgeneric_github.c

// Load the Emscripten-generated JS glue
importScripts('engine.js');

function sendFrameIfChanged(src, fbSize) {
    if (lastSentFrame && lastSentFrame.length === fbSize) {
        let same = true;
        for (let i = 0; i < fbSize; i++) {
            if (src[i] !== lastSentFrame[i]) { same = false; break; }
        }
        if (same) return false;
    }

    lastSentFrame = new Uint8Array(src);

    const fbCopy = new Uint8Array(src);
    self.postMessage({ type: 'FRAME', payload: fbCopy }, [fbCopy.buffer]);
    frameCount++;
    return true;
}

function pumpEvents(source) {
    const now = performance.now();
    
    if (now - lastLogTime > 2000) {
        console.log(`Worker Heartbeat: Running... Frames pushed: ${frameCount}. Last source: ${source}`);
        lastLogTime = now;
    }

    if (now - lastFrameTime > 30) {
        const activeModule = DoomModuleInstance || self.Module;
        if (activeModule && framebufferOffset) {
            // Find the buffer wherever it lives
            let buffer = null;
            if (activeModule.HEAPU8) buffer = activeModule.HEAPU8.buffer;
            else if (activeModule.heapU8) buffer = activeModule.heapU8.buffer;
            else if (activeModule.wasmMemory) buffer = activeModule.wasmMemory.buffer;
            else if (activeModule.asm && activeModule.asm.memory) buffer = activeModule.asm.memory.buffer;
            // Handle MODULARIZE weirdness where exports might be direct properties
            else if (activeModule.memory) buffer = activeModule.memory.buffer;
            
            if (buffer) {
                const fbSize = GH_BUFFER_SIZE;
                const src = new Uint8Array(buffer, framebufferOffset, fbSize);
                const sent = sendFrameIfChanged(src, fbSize);

                if (sent && frameCount % 35 === 0) {
                    console.log(`Worker: Pushing frame ${frameCount}`);
                }
            } else {
                // Final fallback: check for global wasmMemory if not on Module
                if (typeof wasmMemory !== 'undefined') {
                    buffer = wasmMemory.buffer;
                    // Re-run the logic above if found
                    if (buffer) {
                        const fbSize = GH_BUFFER_SIZE;
                        const src = new Uint8Array(buffer, framebufferOffset, fbSize);
                        sendFrameIfChanged(src, fbSize);
                        return;
                    }
                }
                if (frameCount === 0 && now - startTime > 5000 && (Math.floor(now) % 1000 < 50)) {
                    console.error('Worker: Still no buffer found. Keys on Module:', Object.keys(activeModule));
                }
            }
        }
        lastFrameTime = now;
    }
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    console.log('Worker: Initializing via Emscripten Glue...');

    // Configure the Module
    const Module = {
        noInitialRun: true,
        // No cache-busting query string: engine.wasm is immutable per extension
        // version, so letting Chrome reuse its compiled WASM module cache
        // avoids re-downloading/re-compiling the ~5MB binary on every launch.
        locateFile: (path) => path,
        print: (text) => console.log(`[Doom] ${text}`),
        printErr: (text) => console.error(`[Doom Error] ${text}`),
        onRuntimeInitialized: () => {
            console.log('Worker: Runtime Initialized.');
            
            // In MODULARIZE mode, Emscripten populates the object passed to the factory
            const exports = Module;
            
            const getPtr = exports._DG_GetFramebufferPtr;
            const initFn = exports._DG_Github_Init;
            const mainFn = exports._main;
            const tickFn = exports._doomgeneric_Tick;
            inputFn = exports._DG_Github_Input;

            // Flush any key events that arrived while the module was loading.
            for (const ev of pendingInput) inputFn(ev.key, ev.pressed);
            pendingInput = [];

            if (getPtr) {
                framebufferOffset = getPtr();
                console.log('Worker: Framebuffer address:', framebufferOffset);
            }

            if (initFn) {
                console.log('Worker: Calling DG_Github_Init...');
                initFn();
            }

            console.log('Worker: Starting Main...');
            try {
                if (!Module._main_called) {
                    Module._main_called = true;
                    // Assignment for pumpEvents
                    DoomModuleInstance = Module;
                    mainFn(0, 0);
                }
            } catch (e) {
                console.log('Worker: Main returned:', e);
            }

            if (tickFn) {
                console.log('Worker: Starting Tick Loop...');
                if (self.tickInterval) clearInterval(self.tickInterval);
                self.tickInterval = setInterval(() => {
                    try {
                        tickFn();
                        pumpEvents('tick');
                    } catch (e) {
                        console.error('Tick Error:', e);
                    }
                }, 1000 / 35);
            }
        }
    };

    try {
        // CRITICAL: In MODULARIZE mode, the actual "live" module is the one 
        // returned by the promise. The 'Module' object we pass is just configuration.
        const instance = await DoomModule(Module);
        DoomModuleInstance = instance;
        console.log('Worker: Module instance acquired. Keys:', Object.keys(DoomModuleInstance).filter(k => k.startsWith('HEAP') || k === 'wasmMemory'));
    } catch (err) {
        console.error('Worker: Failed to load DoomModule', err);
    }
  }

  if (type === 'INPUT') {
      if (inputFn) {
          inputFn(payload.key, payload.pressed);
      } else {
          // Module not ready yet; don't drop the event, or a press that
          // arrives during load could leave the engine thinking a key is
          // stuck down forever with no release ever delivered to replace it.
          pendingInput.push(payload);
      }
  }
};
