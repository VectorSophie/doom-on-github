(function(global) {
  global.DoomHelpers = global.DoomHelpers || {};

  global.DoomHelpers.findContributionSettings = function() {
    const privateText = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent === 'Turning off private contributions will show only public activity on your profile.'
    );
    const overviewText = Array.from(document.querySelectorAll('*')).find(
        el => el.textContent === 'Turning off the activity overview will hide the section on your profile.'
    );

    if (!privateText || !overviewText) return null;

    let privateParent = privateText.parentElement;
    while (privateParent) {
        if (privateParent.contains(overviewText)) {
            return privateParent.closest('.ActionListWrap') || privateParent.closest('details-menu') || privateParent;
        }
        privateParent = privateParent.parentElement;
    }

    return null;
  };

  global.DoomHelpers.createMenuItem = function(onClick) {
    const listItem = document.createElement('li');
    listItem.className = 'ActionListItem';
    listItem.setAttribute('role', 'none');

    const button = document.createElement('button');
    button.className = 'ActionListContent';
    button.setAttribute('type', 'button');
    button.setAttribute('role', 'menuitemcheckbox');
    button.setAttribute('aria-checked', 'false');

    const visualSpan = document.createElement('span');
    visualSpan.className = 'ActionListItem-visual ActionListItem-action--leading';
    
    visualSpan.innerHTML = `
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-check ActionListItem-singleSelectCheckmark" style="opacity: 0">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
        </svg>
    `;

    const labelWrap = document.createElement('span');
    labelWrap.className = 'ActionListItem-descriptionWrap';

    const label = document.createElement('span');
    label.className = 'ActionListItem-label';
    label.textContent = 'Doom';

    const desc = document.createElement('span');
    desc.className = 'ActionListItem-description';
    desc.textContent = 'Play Doom on your contribution graph.';

    labelWrap.appendChild(label);
    labelWrap.appendChild(desc);
    button.appendChild(visualSpan);
    button.appendChild(labelWrap);
    listItem.appendChild(button);

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isChecked = button.getAttribute('aria-checked') === 'true';
        const newState = !isChecked;
        
        button.setAttribute('aria-checked', String(newState));
        visualSpan.querySelector('svg').style.opacity = newState ? '1' : '0';
        desc.textContent = newState 
            ? 'Stop playing Doom.' 
            : 'Play Doom on your contribution graph.';
            
        onClick(newState);
    });

    return listItem;
  };

})(window);
