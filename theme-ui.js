(() => {
  if (!document.getElementById('mepTrackerTheme')) {
    const link = document.createElement('link');
    link.id = 'mepTrackerTheme';
    link.rel = 'stylesheet';
    link.href = '/theme.css';
    document.head.appendChild(link);
  }

  function enhanceHeader() {
    const inner = document.querySelector('header .inner');
    if (!inner) return;

    const title = inner.querySelector('h1');
    const subtitle = inner.querySelector('p');

    if (title && !inner.querySelector('.header-kicker')) {
      const kicker = document.createElement('div');
      kicker.className = 'header-kicker';
      kicker.textContent = 'EU policy intelligence';
      inner.insertBefore(kicker, title);
    }

    if (subtitle && !inner.querySelector('.hero-badges')) {
      const badges = document.createElement('div');
      badges.className = 'hero-badges';
      badges.innerHTML = `
        <span class="hero-badge live">Live parliamentary data</span>
        <span class="hero-badge">Irish MEP focus</span>
        <span class="hero-badge">Roll-call analysis</span>
      `;
      subtitle.insertAdjacentElement('afterend', badges);
    }
  }

  enhanceHeader();
})();