(() => {
  let roster = null;
  let loading = null;

  const GROUP_LOGOS = {
    'EPP': 'https://commons.wikimedia.org/wiki/Special:FilePath/EPP%20EP%20group%20logo%202015.svg',
    'Renew Europe': 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20of%20Renew%20Europe.svg',
    'S&D': 'https://commons.wikimedia.org/wiki/Special:FilePath/S%26D.svg',
    'Greens/EFA': 'https://commons.wikimedia.org/wiki/Special:FilePath/GreensEFA%20logo-en.svg',
    'The Left': 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20of%20The%20Left%20in%20the%20European%20Parliament.svg',
    'ECR': 'https://ecrgroup.eu/fajls/logo4.svg'
  };

  function addStyles() {
    if (document.getElementById('partyUiStyles')) return;
    const style = document.createElement('style');
    style.id = 'partyUiStyles';
    style.textContent = `
      .party-mark{display:inline-flex;align-items:center;justify-content:center;width:34px;height:30px;border:1px solid #e4e7ec;border-radius:7px;background:#fff;overflow:hidden;vertical-align:middle;flex:0 0 auto;margin-right:8px;padding:2px}
      .party-mark img{display:block;max-width:29px;max-height:24px;object-fit:contain}
      .party-mark.party-small{width:26px;height:24px;border-radius:6px;margin-right:6px;padding:2px}.party-mark.party-small img{max-width:22px;max-height:18px}
      .party-fallback{font-size:9px;font-weight:800;letter-spacing:.2px;color:#344054;background:#f2f4f7}
      .national-party-name{font-size:12px;color:#667085;margin-top:2px;line-height:1.3}
      .national-party-name::before{content:'Irish party: ';font-weight:700;color:#475467}
      .party-heading{display:inline-flex;align-items:center}
      .mep-card h3{display:flex;align-items:center}
      .analysis-table td:first-child strong,.coverage-table td:first-child strong,.comparison-row strong{display:flex;align-items:center}
      .analysis-table td:first-child .national-party-name,.coverage-table td:first-child .national-party-name{margin-left:32px}
      .comparison-row .national-party-name{grid-column:1/2;margin-left:32px;margin-top:-4px}
    `;
    document.head.appendChild(style);
  }

  async function getRoster() {
    if (roster) return roster;
    if (loading) return loading;
    loading = fetch('/api/irish-meps').then(r => {
      if (!r.ok) throw new Error('Unable to load European group data');
      return r.json();
    }).then(data => {
      const meps = Array.isArray(data.meps) ? data.meps : [];
      roster = meps;
      return meps;
    }).finally(() => { loading = null; });
    return loading;
  }

  function fallbackText(group) {
    if (group === 'Non-attached') return 'NI';
    if (group === 'Renew Europe') return 'RE';
    if (group === 'The Left') return 'LEFT';
    if (group === 'Greens/EFA') return 'G/EFA';
    return String(group || '?').replace(/[^A-Za-z&]/g,'').slice(0,5).toUpperCase();
  }

  function makeMark(mep, small = false) {
    const group = mep.group || 'European political group';
    const logo = GROUP_LOGOS[group];
    const span = document.createElement('span');
    span.className = 'party-mark' + (small ? ' party-small' : '');
    span.title = group;

    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = group + ' logo';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        span.classList.add('party-fallback');
        span.textContent = fallbackText(group);
      };
      span.appendChild(img);
    } else {
      span.classList.add('party-fallback');
      span.textContent = fallbackText(group);
    }
    return span;
  }

  function makeNationalPartyLine(mep) {
    const div = document.createElement('div');
    div.className = 'national-party-name';
    div.textContent = mep.partyName || 'Unavailable';
    return div;
  }

  function normaliseName(value) {
    return String(value || '').replace(/\s+/g,' ').trim();
  }

  function findMepByText(meps, text) {
    const value = normaliseName(text);
    return meps.find(m => value === normaliseName(m.name) || value.startsWith(normaliseName(m.name) + ' —'));
  }

  function decorateIrishCards(meps) {
    document.querySelectorAll('.mep-card').forEach(card => {
      const heading = card.querySelector('h3');
      if (!heading) return;
      const mep = findMepByText(meps, heading.textContent);
      if (!mep) return;

      if (!heading.dataset.partyDecorated) {
        heading.prepend(makeMark(mep));
        heading.dataset.partyDecorated = 'true';
      }

      const group = card.querySelector('.mep-group');
      if (group && !card.querySelector('.national-party-name')) {
        group.insertAdjacentElement('afterend', makeNationalPartyLine(mep));
      }
    });
  }

  function decorateAnalysisNames(meps) {
    const selectors = [
      '.analysis-table td:first-child strong',
      '.coverage-table td:first-child strong',
      '.comparison-row strong',
      '.profile-vote strong'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => {
      const mep = findMepByText(meps, el.textContent);
      if (!mep) return;

      if (!el.dataset.partyDecorated) {
        el.prepend(makeMark(mep, true));
        el.dataset.partyDecorated = 'true';
      }

      const container = el.closest('td') || el.closest('.comparison-row') || el.parentElement;
      if (container && !container.querySelector('.national-party-name')) {
        el.insertAdjacentElement('afterend', makeNationalPartyLine(mep));
      }
    });

    document.querySelectorAll('#mepProfilePanel h3').forEach(el => {
      const mep = findMepByText(meps, el.textContent);
      if (!mep) return;

      if (!el.dataset.partyDecorated) {
        el.prepend(makeMark(mep));
        el.classList.add('party-heading');
        el.dataset.partyDecorated = 'true';
      }

      const headingWrap = el.parentElement;
      if (headingWrap && !headingWrap.querySelector('.national-party-name')) {
        const existingMeta = headingWrap.querySelector('.small-meta');
        if (existingMeta) existingMeta.insertAdjacentElement('afterend', makeNationalPartyLine(mep));
        else el.insertAdjacentElement('afterend', makeNationalPartyLine(mep));
      }
    });
  }

  async function decorate() {
    try {
      const meps = await getRoster();
      decorateIrishCards(meps);
      decorateAnalysisNames(meps);
    } catch (error) {
      console.warn('European group logo decoration unavailable', error);
    }
  }

  addStyles();
  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList:true, subtree:true });
  decorate();
})();