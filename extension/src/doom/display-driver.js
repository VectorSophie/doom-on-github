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
      this.debugLogged = false;
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
      // Hide the legend and footer to clear space
      const footer = document.querySelector('.contrib-footer');
      if (footer) footer.style.display = 'none';
      const legend = document.querySelector('.ContributionCalendar-label--legend');
      if (legend) legend.parentElement.style.display = 'none';

      // Ensure we have 39 rows (GitHub usually has 7)
      while (this.tableBody.children.length < this.height) {
        const newRow = document.createElement('tr');
        newRow.style.height = '10px';
        
        // Add dummy label cell
        const labelCell = document.createElement('td');
        labelCell.className = 'ContributionCalendar-label';
        labelCell.style.width = '30px';
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
            cell.setAttribute('data-ix', x.toString());
            cell.setAttribute('tabindex', '-1');
            cell.setAttribute('aria-selected', 'false');
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('data-view-component', 'true');
            
            // Add attributes for consistent GitHub styling (borders/outlines)
            cell.setAttribute('id', `contribution-day-component-${y}-${x}`);
            cell.setAttribute('aria-describedby', 'contribution-graph-legend-level-0');
            
            row.appendChild(cell);
          }
          
          cell.style.backgroundColor = ''; // Clear any inline styles
          cell.dataset.level = '0';
          this.cells[y * this.width + x] = cell;
        }
      }
    }

    update(buffer) {
      if (!this.cells) return;
      
      if (!this.debugLogged) {
          let hasData = false;
          for(let k=0; k<buffer.length; k++) {
              if (buffer[k] > 0) {
                  console.log('DisplayDriver: First non-zero frame received!', buffer);
                  hasData = true;
                  this.debugLogged = true;
                  break;
              }
          }
          if (!hasData && Math.random() < 0.01) {
              console.log('DisplayDriver: Still receiving zeros...');
          }
      }

      for (let i = 0; i < buffer.length; i++) {
        const val = buffer[i];
        if (val !== this.cache[i]) {
          if (this.cells[i]) {
              this.cells[i].setAttribute('data-level', val.toString());
          }
          this.cache[i] = val;
        }
      }
    }
  }

  global.DoomHelpers.DisplayDriver = DisplayDriver;

})(window);
