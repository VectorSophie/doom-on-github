(function(global) {
  let display = null;
  let input = null;
  let iframe = null;

  async function bootstrap(tableBody, wasmUrl) {
    if (display) return;
    
    const DisplayDriver = global.DoomHelpers.DisplayDriver;
    const InputHandler = global.DoomHelpers.InputHandler;

    display = new DisplayDriver();
    display.attach(tableBody);
    
    input = new InputHandler(document.body);
    input.init();

    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('src/doom/engine.html');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    await new Promise(resolve => {
      iframe.onload = resolve;
    });

    const frameWindow = iframe.contentWindow;

    // Send Input to Iframe
    input.onInput((key, pressed) => {
        frameWindow.postMessage({ 
          type: 'INPUT', 
          payload: { key, pressed } 
        }, '*');
    });

    window.addEventListener('message', onMessage);
    
    function onMessage(e) {
      if (e.data.type === 'FRAME') {
        const buffer = new Uint8Array(e.data.payload);
        display.update(buffer);
      }
    }

    iframe._cleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    };
    
    // Init Iframe (It will handle SAB creation if possible)
    frameWindow.postMessage({ 
       type: 'INIT', 
       payload: { wasmUrl } 
    }, '*');
  }

  function stop() {
      if (input) {
          input.cleanup();
          input = null;
      }
      if (display) {
          display.detach();
          display = null;
      }
      if (iframe) {
          if (iframe._cleanup) iframe._cleanup();
          iframe = null;
      }
  }

  global.DoomHelpers.bootstrap = bootstrap;
  global.DoomHelpers.stop = stop;

})(window);
