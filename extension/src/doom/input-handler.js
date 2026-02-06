(function(global) {
  global.DoomHelpers = global.DoomHelpers || {};

  class InputHandler {
    constructor(target = window) {
      this.target = target;
      this.listeners = [];
      
      this.KEYS = {
        ArrowRight: 0xae,
        ArrowLeft: 0xac,
        ArrowUp: 0xad,
        ArrowDown: 0xaf,
        Control: 0xa3, // KEY_FIRE
        ' ': 0xa2,     // KEY_USE
        Enter: 13,
        Escape: 27,
        w: 119,
        a: 97,
        s: 115,
        d: 100,
        Shift: 0xb6,   // KEY_RSHIFT
        Alt: 0xb8,     // KEY_RALT
        m: 109,
        ',': 44,
        '.': 46
      };

      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
    }

    init() {
      this.target.addEventListener('keydown', this.onKeyDown, { passive: false });
      this.target.addEventListener('keyup', this.onKeyUp, { passive: false });
    }

    cleanup() {
      this.target.removeEventListener('keydown', this.onKeyDown);
      this.target.removeEventListener('keyup', this.onKeyUp);
    }

    onInput(callback) {
      this.listeners.push(callback);
    }

    getDoomKey(evt) {
      if (this.KEYS[evt.key]) return this.KEYS[evt.key];
      if (this.KEYS[evt.key.toLowerCase()]) return this.KEYS[evt.key.toLowerCase()];
      if (evt.key.length === 1) return evt.key.charCodeAt(0);
      return 0;
    }

    onKeyDown(evt) {
      const key = this.getDoomKey(evt);
      if (key) {
        evt.preventDefault();
        this.emit(key, 1);
      }
    }

    onKeyUp(evt) {
      const key = this.getDoomKey(evt);
      if (key) {
        evt.preventDefault();
        this.emit(key, 0);
      }
    }

    emit(key, pressed) {
      for (const cb of this.listeners) {
        cb(key, pressed);
      }
    }
  }

  global.DoomHelpers.InputHandler = InputHandler;

})(window);
