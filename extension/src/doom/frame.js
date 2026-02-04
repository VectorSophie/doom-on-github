(function() {
  const worker = new Worker('worker.js');
  let wasmUrl = '';

  // SAB Logic
  let inputBuffer = null;
  let inputView = null;
  
  // Try to create SAB in Extension Context
  try {
      if (typeof SharedArrayBuffer !== 'undefined') {
          inputBuffer = new SharedArrayBuffer(1024);
          inputView = new Int32Array(inputBuffer);
          Atomics.store(inputView, 0, 0); // Head
          Atomics.store(inputView, 1, 0); // Tail
          console.log('DoomGeneric Frame: SAB created.');
      }
  } catch(e) {
      console.log('DoomGeneric Frame: SAB failed.', e);
  }

  // Input Bridge: Parent -> Worker
  window.addEventListener('message', (e) => {
    const { type, payload } = e.data;
    
    if (type === 'INPUT') {
      if (inputView) {
          // Write to SAB
          const head = Atomics.load(inputView, 0);
          const tail = Atomics.load(inputView, 1);
          const nextHead = (head + 1) % 16;
          
          if (nextHead !== tail) {
              const offset = 2 + (head * 2);
              inputView[offset] = payload.key;
              inputView[offset + 1] = payload.pressed;
              Atomics.store(inputView, 0, nextHead);
          }
      } else {
          // Fallback
          worker.postMessage({ type, payload });
      }
    }
    
    if (type === 'INIT') {
        wasmUrl = payload.wasmUrl;
        // Pass payload (including SAB) to worker
        worker.postMessage({ 
            type: 'INIT', 
            payload: { 
                wasmUrl, 
                inputBuffer 
            } 
        });
    }
  });

  // Frame Bridge: Worker -> Parent
  worker.onmessage = (e) => {
    if (e.data.type === 'FRAME') {
      window.parent.postMessage({ type: 'FRAME', payload: e.data.payload }, '*');
    }
  };

})();
