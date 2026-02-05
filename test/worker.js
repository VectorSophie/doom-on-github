let DoomModuleInstance = null;
let framebufferOffset = 0;
let inputFn = null;
let inputQueue = null; 

let lastFrameTime = 0;
let frameCount = 0;
let lastLogTime = 0;
let startTime = performance.now();

// Load the Emscripten-generated JS glue
importScripts('engine.js');

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
                const fbSize = 2067;
                const src = new Uint8Array(buffer, framebufferOffset, fbSize);
                
                // Check if we actually have pixel data
                let hasData = false;
                for (let i = 0; i < 50; i++) { if (src[i] !== 0) { hasData = true; break; } }
                
                const fbCopy = new Uint8Array(fbSize);
                fbCopy.set(src);
                
                self.postMessage({ type: 'FRAME', payload: fbCopy }, [fbCopy.buffer]);
                frameCount++;

                if (hasData && frameCount % 35 === 0) {
                    console.log(`Worker: Pushing frame ${frameCount} (pixel data detected)`);
                }
            } else {
                // Final fallback: check for global wasmMemory if not on Module
                if (typeof wasmMemory !== 'undefined') {
                    buffer = wasmMemory.buffer;
                    // Re-run the logic above if found
                    if (buffer) {
                        const fbSize = 2067;
                        const src = new Uint8Array(buffer, framebufferOffset, fbSize);
                        const fbCopy = new Uint8Array(fbSize);
                        fbCopy.set(src);
                        self.postMessage({ type: 'FRAME', payload: fbCopy }, [fbCopy.buffer]);
                        frameCount++;
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
    
    if (payload.inputBuffer) {
        inputQueue = new Int32Array(payload.inputBuffer);
    }

    // Configure the Module
    const Module = {
        noInitialRun: true,
        locateFile: (path) => {
            console.log('Worker: Locating file:', path);
            return path + '?v=' + Date.now();
        },
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

  if (type === 'INPUT' && inputFn) {
      inputFn(payload.key, payload.pressed);
  }
};
