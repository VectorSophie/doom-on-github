let wasmInstance = null;
let framebufferOffset = 0;
let inputFn = null;
let inputQueue = null; 

let lastFrameTime = 0;
let frameCount = 0;
let lastLogTime = 0;

function pumpEvents() {
    if (inputFn && inputQueue) {
        const head = Atomics.load(inputQueue, 0);
        const tail = Atomics.load(inputQueue, 1);
        
        if (head !== tail) {
             const offset = 2 + (tail * 2);
             const key = inputQueue[offset];
             const pressed = inputQueue[offset + 1];
             inputFn(key, pressed);
             const nextTail = (tail + 1) % 16;
             Atomics.store(inputQueue, 1, nextTail);
        }
    }

    const now = performance.now();
    
    if (now - lastLogTime > 2000) {
        console.log(`Worker Heartbeat: Running... Frames pushed: ${frameCount}`);
        lastLogTime = now;
    }

    if (now - lastFrameTime > 30) {
        if (wasmInstance) {
            const buffer = wasmInstance.exports.memory.buffer;
            
            const check = new Uint8Array(buffer, framebufferOffset, 10);

            const fbSize = 2067;
            const fbCopy = new Uint8Array(fbSize);
            const src = new Uint8Array(buffer, framebufferOffset, fbSize);
            fbCopy.set(src);
            
            self.postMessage({ type: 'FRAME', payload: fbCopy }, [fbCopy.buffer]);
            frameCount++;
        }
        lastFrameTime = now;
    }
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    if (payload.inputBuffer) {
        inputQueue = new Int32Array(payload.inputBuffer);
    }

    const imports = {
      env: {
        emscripten_notify_memory_growth: () => { pumpEvents(); },
        __syscall_unlinkat: () => { pumpEvents(); return 0; },
        __syscall_rmdir: () => { pumpEvents(); return 0; },
        __syscall_renameat: () => { pumpEvents(); return 0; },
        _emscripten_system: (cmd) => { 
            pumpEvents(); 
            return 0; 
        }
      },
      wasi_snapshot_preview1: {
        proc_exit: (code) => { console.log('Exit:', code); },
        fd_write: (fd, iov, iovcnt, pnum) => {
             if (wasmInstance) {
                 const mem = new DataView(wasmInstance.exports.memory.buffer);
                 const ptr = mem.getUint32(iov, true);
                 const len = mem.getUint32(iov + 4, true);
                 
                 const bytes = new Uint8Array(wasmInstance.exports.memory.buffer, ptr, len);
                 const str = new TextDecoder("utf-8").decode(bytes);
                 console.log('Doom Stdout:', str.trim());
                 
                 mem.setUint32(pnum, len, true);
             }
             
             pumpEvents();
             return 0; 
        },
        fd_read: () => { pumpEvents(); return 0; },
        fd_close: () => { pumpEvents(); return 0; },
        fd_seek: () => { pumpEvents(); return 0; }
      }
    };

    try {
      console.log('Worker: Fetching WASM...', payload.wasmUrl);
      const response = await fetch(payload.wasmUrl);
      const module = await WebAssembly.instantiateStreaming(response, imports);
      wasmInstance = module.instance;
      
      const exports = wasmInstance.exports;
      
      if (exports.DG_Github_Framebuffer) {
          framebufferOffset = exports.DG_Github_Framebuffer.value;
          console.log('Worker: Framebuffer found at offset:', framebufferOffset);
      } else {
          console.error('Worker: DG_Github_Framebuffer export NOT found!');
      }

      inputFn = exports.DG_Github_Input;
      const initFn = exports.DG_Github_Init;
      const mainFn = exports.main;

      console.log('Worker: Initialized. Starting Engine...');

      if (initFn) initFn();
      
      setTimeout(() => {
          console.log('Worker: Entering Main Loop...');
          mainFn();
          console.log('Worker: Main Loop Exited (Unexpected)');
      }, 0);
      
    } catch (err) {
      console.error('DoomGeneric: Failed to load', err);
    }
  }
};
