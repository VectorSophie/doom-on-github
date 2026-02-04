let wasmInstance = null;
let framebufferOffset = 0;
let inputFn = null;
let inputQueue = new Int32Array(new SharedArrayBuffer(1024)); // SAB for input if available
let headIdx = 0; // Local head tracker
let tailIdx = 0; // Local tail tracker (or use Atomics)

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    // If payload has SAB, use it
    if (payload.inputBuffer) {
        inputQueue = new Int32Array(payload.inputBuffer);
    }

    const imports = {
      env: {
        emscripten_notify_memory_growth: () => {},
        __syscall_unlinkat: () => 0,
        __syscall_rmdir: () => 0,
        __syscall_renameat: () => 0,
        _emscripten_system: (cmd) => {
            // HOOK: This is our chance to run logic inside the blocking loop!
            
            // 1. Poll Inputs from Shared Buffer (if we have one)
            // Since onmessage is blocked, we can't receive normal messages.
            // But if we shared a buffer, we can read it here.
            
            if (inputFn && inputQueue) {
                // Check atomic flag or simple ring buffer?
                // Simple ring: [0]=head, [1]=tail, [2+] data
                const head = Atomics.load(inputQueue, 0);
                const tail = Atomics.load(inputQueue, 1);
                
                if (head !== tail) {
                     // Read events
                     // Format: [key, pressed]
                     const offset = 2 + (tail * 2);
                     const key = inputQueue[offset];
                     const pressed = inputQueue[offset + 1];
                     
                     // Inject to Engine
                     inputFn(key, pressed);
                     
                     // Advance tail
                     const nextTail = (tail + 1) % 16; // Max 16 events
                     Atomics.store(inputQueue, 1, nextTail);
                }
            }

            // 2. Poll Framebuffer? 
            // We can postMessage here? 
            // postMessage is async, but queuing it might work if the browser handles it in parallel?
            // Actually, postMessage from Worker usually works even if busy, but the receiver (Main) needs to be free.
            // Wait, if Worker is busy, it can SEND, but it can't RECEIVE.
            // So we can send frames here!
            
            // Throttle frame updates (e.g. every 16ms)
            const now = performance.now();
            if (now - lastFrameTime > 30) {
                if (wasmInstance) {
                    const mem = new Uint8Array(wasmInstance.exports.memory.buffer);
                    const fb = mem.subarray(framebufferOffset, framebufferOffset + 2067);
                    // Copy buffer to avoid race condition if engine writes while we post
                    self.postMessage({ type: 'FRAME', payload: fb }, [fb.slice().buffer]);
                }
                lastFrameTime = now;
            }

            // Return 0 to let engine continue
            return 0;
        }
      },
      wasi_snapshot_preview1: {
        proc_exit: (code) => { console.log('Exit:', code); },
        fd_write: (fd, iov, iovcnt, pnum) => {
             // Maybe hook stdout too as a heartbeat?
             return 0;
        },
        fd_read: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0
      }
    };

    try {
      console.log('Worker: Fetching WASM...', payload.wasmUrl);
      const response = await fetch(payload.wasmUrl);
      const module = await WebAssembly.instantiateStreaming(response, imports);
      wasmInstance = module.instance;
      
      const exports = wasmInstance.exports;
      framebufferOffset = exports.DG_Github_Framebuffer.value;
      inputFn = exports.DG_Github_Input;
      const initFn = exports.DG_Github_Init;
      const mainFn = exports.main;

      if (initFn) initFn();
      
      console.log('Worker: Starting Main (Blocking)...');
      setTimeout(() => {
          mainFn();
      }, 0);
      
    } catch (err) {
      console.error('DoomGeneric: Failed to load', err);
    }
  }
};

let lastFrameTime = 0;
