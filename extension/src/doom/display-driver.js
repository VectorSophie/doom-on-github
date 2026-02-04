(function(global) {
  global.DoomHelpers = global.DoomHelpers || {};

  class DisplayDriver {
    constructor() {
      this.tableBody = null;
      this.originalRows = [];
      this.width = 53;
      this.height = 39;
      this.cells = null;
      this.cache = new Uint8Array(this.width * this.height).fill(255);
    }

    attach(tableBody) {
      this.tableBody = tableBody;
      this.saveOriginalState();
      this.expandGrid();
    }

    detach() {
      if (this.tableBody) {
        this.restoreOriginalState();
        this.tableBody = null;
        this.cells = null;
      }
    }

    saveOriginalState() {
      this.originalRows = Array.from(this.tableBody.children).map(row => row.cloneNode(true));
    }

    restoreOriginalState() {
      this.tableBody.innerHTML = '';
      this.originalRows.forEach(row => this.tableBody.appendChild(row));
    }

    expandGrid() {
      while (this.tableBody.children.length < this.height) {
        const newRow = document.createElement('tr');
        newRow.style.height = '10px';
        
        const labelCell = document.createElement('td');
        labelCell.className = 'ContributionCalendar-label';
        labelCell.style.position = 'relative';
        newRow.appendChild(labelCell);
        
        this.tableBody.appendChild(newRow);
      }

      this.cells = new Array(this.width * this.height);
      
      for (let y = 0; y < this.height; y++) {
        const row = this.tableBody.children[y];
        
        for (let x = 0; x < this.width; x++) {
          let cell = row.children[x + 1];
          
          if (!cell) {
            cell = document.createElement('td');
            cell.className = 'ContributionCalendar-day';
            cell.style.width = '10px';
            cell.dataset.viewComponent = 'true';
            row.appendChild(cell);
          }
          
          cell.dataset.level = '0';
          this.cells[y * this.width + x] = cell;
        }
      }
    }

    update(buffer) {
      if (!this.cells) return;
      
      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i];
        if (val !== this.cache[i]) {
          if (this.cells[i]) {
              this.cells[i].dataset.level = val;
          }
          this.cache[i] = val;
        }
      }
    }
  }

  global.DoomHelpers.DisplayDriver = DisplayDriver;

})(window);
