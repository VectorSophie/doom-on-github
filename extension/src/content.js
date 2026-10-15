(async function() {
  'use strict';
  
  let menuInjected = false;
  let isRunning = false;

  async function init() {
    if (!window.DoomHelpers) return;

    const findSettings = window.DoomHelpers.findContributionSettings;
    const createMenu = window.DoomHelpers.createMenuItem;
    const bootstrap = window.DoomHelpers.bootstrap;
    const stop = window.DoomHelpers.stop;

    const settings = findSettings();
    if (!settings || menuInjected) return;

    const graphTable = document.querySelector('.js-calendar-graph-table > tbody');
    if (!graphTable) return;

    const menuItem = createMenu((enable) => {
        if (enable) {
            console.log('Doom: Starting...');
            
            if (!chrome.runtime?.id) {
                console.error('DoomGeneric: Extension context invalidated.');
                return;
            }

            const wasmUrl = chrome.runtime.getURL('src/doom/engine.wasm');
            bootstrap(graphTable, wasmUrl).then(() => {
                isRunning = true;
            });
        } else {
            console.log('Doom: Stopping...');
            if (isRunning) {
                stop();
                isRunning = false;
            }
        }
    });

    settings.appendChild(menuItem);
    menuInjected = true;
    console.log('Doom: Menu injected');
  }

  const observer = new MutationObserver(() => {
    if (window.DoomHelpers && !document.contains(window.DoomHelpers.findContributionSettings())) {
        menuInjected = false;
    }
    init();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
  } else {
      init();
  }

})();
