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

    inner.querySelectorAll('.header-kicker,.hero-badges').forEach(el => el.remove());

    const title = inner.querySelector('h1');
    const subtitle = inner.querySelector('p');

    if (title && !inner.querySelector('.brand-rule')) {
      const rule = document.createElement('div');
      rule.className = 'brand-rule';
      inner.insertBefore(rule, title);
    }

    if (subtitle) {
      subtitle.textContent = 'European Parliament voting, committee and MEP intelligence for business.';
    }
  }

  enhanceHeader();
})();