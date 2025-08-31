/*
 * Integral Lens JavaScript
 *
 * Handles navigation between views, sliding animations, focus management, and
 * communication with the backend OpenAI-powered Netlify functions. Each
 * integral lens (quadrants, levels, states) triggers its own API call and
 * dynamically updates the layout based on the JSON returned. Spinners
 * provide feedback during asynchronous operations.
 */

// Wait for the DOM to be ready before attaching handlers
document.addEventListener('DOMContentLoaded', () => {
  const views = {
    home: document.getElementById('home'),
    quadrants: document.getElementById('quadrants'),
    levels: document.getElementById('levels'),
    states: document.getElementById('states'),
  };

  let currentView = 'home';

  /**
   * Perform a slide transition from the current view to a target view.
   * @param {string} targetId - The ID of the view to show.
   * @param {string} direction - The direction of the incoming slide (right, left, up).
   */
  function slideTo(targetId, direction) {
    if (currentView === targetId) return;
    const outgoing = views[currentView];
    const incoming = views[targetId];

    if (incoming.id === 'home') {
      // Prepare the incoming view off‑screen using a directional helper class.
      incoming.classList.remove('hidden-view');
      incoming.classList.add('view');
      let fromClass = '';
      if (direction === 'right') fromClass = 'from-left';
      else if (direction === 'left') fromClass = 'from-right';
      else if (direction === 'up') fromClass = 'from-down';
      else if (direction === 'down') fromClass = 'from-up';
      if (fromClass) outgoing.classList.add(fromClass);
    }

    // Prepare the incoming view off‑screen using a directional helper class.
    incoming.classList.remove('hidden-view');
    incoming.classList.add('view');
    let fromClass = '';
    if (direction === 'right') fromClass = 'from-right';
    else if (direction === 'left') fromClass = 'from-left';
    else if (direction === 'up') fromClass = 'from-up';
    else if (direction === 'down') fromClass = 'from-down';
    if (fromClass) incoming.classList.add(fromClass);

    // Kick off the animation on the next frame: mark the view active (so it can receive
    // input) and remove the positioning class. The CSS transition on `.view` will
    // animate the transform to its default (0) once the class is removed.
    requestAnimationFrame(() => {
      incoming.classList.add('active-view');
      if (fromClass) incoming.classList.remove(fromClass);
    });

    // Outgoing view simply loses its active state; we hide it after the
    // animation completes. Once hidden, update the current view and focus the
    // input bar of the incoming view if it exists.
    outgoing.classList.remove('active-view');
    setTimeout(() => {
      outgoing.classList.add('hidden-view');
      const input = incoming.querySelector('.input-bar');
      if (input) input.focus();
      currentView = targetId;
    }, 700);
  }

  // Card click navigation
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      // Determine slide direction for each target
      let direction;
      if (target === 'quadrants') direction = 'right';
      else if (target === 'levels') direction = 'up';
      else if (target === 'states') direction = 'left';
      slideTo(target, direction);
    });
    // Support keyboard accessibility
    card.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Back buttons
  document.querySelectorAll('.back-button').forEach(btn => {
    btn.addEventListener('click', () => {
      // Mirror the direction used when navigating into this lens. For example, if
      // quadrants slid in from the right, we use 'right' again so home slides
      // in from the same side, creating a consistent lens-flipping feel.
      let direction;
      // Use the opposite direction of the forward transition to create a
      // reversing effect: quadrants slide in from the right, so home slides in from the left; levels
      // slide up from the bottom, so home slides in from the top (down); states slide in from the
      // left, so home slides in from the right.
      if (currentView === 'quadrants') direction = 'left';
      else if (currentView === 'levels') direction = 'down';
      else if (currentView === 'states') direction = 'right';
      slideTo('home', direction);
    });
  });

  // Input handlers for each lens
  const quadInput = views.quadrants.querySelector('.input-bar');
  const levelInput = views.levels.querySelector('.input-bar');
  const stateInput = views.states.querySelector('.input-bar');

  quadInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuadrantsQuery(quadInput.value.trim());
    }
  });
  levelInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLevelsQuery(levelInput.value.trim());
    }
  });
  stateInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStatesQuery(stateInput.value.trim());
    }
  });

  /**
   * Insert spinners into all content areas of a given view.
   * @param {NodeListOf<HTMLElement>} containers
   */
  function showSpinners(containers) {
    containers.forEach(el => {
      el.innerHTML = '';
      const spin = document.createElement('div');
      spin.classList.add('spinner');
      el.appendChild(spin);
    });
  }

  /**
   * Handle the quadrants API call and DOM update.
   * @param {string} input
   */
  async function handleQuadrantsQuery(input) {
    const containers = [
      document.querySelector('#quad-ul .content'),
      document.querySelector('#quad-ur .content'),
      document.querySelector('#quad-ll .content'),
      document.querySelector('#quad-lr .content'),
    ];
    showSpinners(containers);
    if (!input) return;
    try {
      const res = await fetch('/.netlify/functions/quadrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid JSON from API');
      }
      const { UL, UR, LL, LR } = data;
      const mapping = { UL, UR, LL, LR };
      ['UL', 'UR', 'LL', 'LR'].forEach((key, idx) => {
        const container = containers[idx];
        container.innerHTML = '';
        const para = document.createElement('p');
        para.textContent = mapping[key].paragraph;
        container.appendChild(para);
        const ul = document.createElement('ul');
        mapping[key].bullets.forEach(b => {
          const li = document.createElement('li');
          li.textContent = b;
          ul.appendChild(li);
        });
        container.appendChild(ul);
      });
    } catch (error) {
      containers.forEach(c => {
        c.innerHTML = '<p style="color:#b00020">An error occurred. Please try again.</p>';
      });
      console.error(error);
    }
  }

  /**
   * Handle the levels API call and DOM update.
   * @param {string} input
   */
  async function handleLevelsQuery(input) {
    const keys = ['Magenta', 'Red', 'Amber', 'Orange', 'Green', 'Teal'];
    const containers = keys.map(key => document.querySelector(`#level-${key.toLowerCase()} .content`));
    showSpinners(containers);
    if (!input) return;
    try {
      const res = await fetch('/.netlify/functions/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid JSON from API');
      }
      keys.forEach((key, idx) => {
        const container = containers[idx];
        container.innerHTML = '';
        const para = document.createElement('p');
        para.textContent = data[key].paragraph;
        container.appendChild(para);
        const ul = document.createElement('ul');
        data[key].bullets.forEach(b => {
          const li = document.createElement('li');
          li.textContent = b;
          ul.appendChild(li);
        });
        container.appendChild(ul);
      });
    } catch (error) {
      containers.forEach(c => {
        c.innerHTML = '<p style="color:#b00020">An error occurred. Please try again.</p>';
      });
      console.error(error);
    }
  }

  /**
   * Handle the states API call and DOM update.
   * @param {string} input
   */
  async function handleStatesQuery(input) {
    const keys = ['Gross', 'Subtle', 'Causal', 'Nondual'];
    const containers = keys.map(key => document.querySelector(`#state-${key.toLowerCase()} .content`));
    showSpinners(containers);
    if (!input) return;
    try {
      const res = await fetch('/.netlify/functions/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid JSON from API');
      }
      keys.forEach((key, idx) => {
        const container = containers[idx];
        container.innerHTML = '';
        const para = document.createElement('p');
        para.textContent = data[key].paragraph;
        container.appendChild(para);
        const ul = document.createElement('ul');
        data[key].bullets.forEach(b => {
          const li = document.createElement('li');
          li.textContent = b;
          ul.appendChild(li);
        });
        container.appendChild(ul);
      });
    } catch (error) {
      containers.forEach(c => {
        c.innerHTML = '<p style="color:#b00020">An error occurred. Please try again.</p>';
      });
      console.error(error);
    }
  }
});