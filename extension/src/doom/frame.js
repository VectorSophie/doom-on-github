(function() {
  // Busted by extension version (not Date.now()): Chrome can cache a
  // dynamically-created Worker script across reloads even after the
  // extension itself is reloaded in chrome://extensions, silently running
  // stale logic. Tying the query to the manifest version means it refetches
  // exactly when the extension updates, and stays cached otherwise.
  const workerVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
    ? chrome.runtime.getManifest().version
    : 'dev';
  const worker = new Worker('worker.js?v=' + workerVersion);

  // Input Bridge: Parent -> Worker
  window.addEventListener('message', (e) => {
    const { type, payload } = e.data;

    if (type === 'INPUT') {
      worker.postMessage({ type, payload });
    }

    if (type === 'INIT') {
        worker.postMessage({ type: 'INIT', payload: { wasmUrl: payload.wasmUrl } });
    }
  });

  // Frame Bridge: Worker -> Parent
  worker.onmessage = (e) => {
    if (e.data.type === 'FRAME') {
      window.parent.postMessage({ type: 'FRAME', payload: e.data.payload }, '*');
    }
  };

})();
