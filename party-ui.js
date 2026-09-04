(() => {
  let roster = null;
  let loading = null;

  function addStyles() {
    if (document.getElementById('partyUiStyles')) return;
    const style = document.createElement('style');
    style.id = 'partyUiStyles';
    style.textContent = `
      .party-mark{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid #e4e7ec;border-radius:7px;background:#fff;overflow:hidden;vertical-align:middle;flex:0 0 auto;margin-right:8px}
      .party-mark img{display:block;max-width:26px;max-height:24px;object-fit:contain}
      .party-mark.party-small{width:24px;height:24px;border-radius:6px;margin-right:6px}.party-mark.party-small img{max-width:21px;max-height:19px}
      .party-fallback{font-size:9px;font-weight:800;letter-spacing:.2px;color:#344054;background:#f2f4f7}
      .party-name{font-size:12px;color:#475467;margin-top:3px;display:flex;align-items:center;gap:4px}
      .party-heading{display:inline-flex;align-items:center}
      .mep-card h3{display:flex;align-items:center}
      .analysis-table td:first-child strong,.coverage-table td:first-child strong,.comparison-row strong{display:flex;align-items:center}
    `;
    document.head.appendChild(style);
  }

  async function getRoster() {
    if (roster) return roster;
    if (loading) return loading;
    loading = fetch('/api/irish-meps').then(r => {
      if (!r.ok) throw new Error('Unable to load party data');
      return r.json();
    }).then(data => {
      const meps = Array.isArray(data.meps) ? data.meps : [];
      roster = meps;
      return meps;
    }).finally(() => { loading = null; });
    return loading;
  }

  function fallbackText(party) {
    if (party === 'Independent') return 'IND';
    if (party === 'Independent Ireland') return 'II';
    return String(party || '?').split(/\s+/).filter(Boolean).map(x => x[0]).join('').slice(0,3).toUpperCase();
  }

  function makeMark(mep, small = false) {
    const span = document.createElement('span');
    span.className = 'party-mark' + (small ? ' party-small' : '');
    span.title = mep.partyName || 'National party';
    if (mep.partyLogo) {
      const img = document.createElement('img');
      img.src = mep.partyLogo;
      img.alt = mep.partyName || 'Party logo';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        span.classList.add('party-fallback');
        span.textContent = fallbackText(mep.partyName);
      };
      span.appendChild(img);
    } else {
      span.classList.add('party-fallback');
      span.textContent = fallbackText(mep.partyName);
    }
    return span;
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
      if (!heading || heading.dataset.partyDecorated) return;
      const mep = findMepByText(meps, heading.textContent);
      if (!mep) return;
      heading.prepend(makeMark(mep));
      heading.dataset.partyDecorated = 'true';
      const group = card.querySelector('.mep-group');
      if (group && !card.querySelector('.party-name')) {
        const party = document.createElement('div');
        party.className = 'party-name';
        party.textContent = mep.partyName || 'National party unavailable';
        group.insertAdjacentElement('afterend', party);
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
      if (el.dataset.partyDecorated) return;
      const mep = findMepByText(meps, el.textContent);
      if (!mep) return;
      el.prepend(makeMark(mep, true));
      el.dataset.partyDecorated = 'true';
    });

    document.querySelectorAll('#mepProfilePanel h3').forEach(el => {
      if (el.dataset.partyDecorated) return;
      const mep = findMepByText(meps, el.textContent);
      if (!mep) return;
      el.prepend(makeMark(mep));
      el.classList.add('party-heading');
      el.dataset.partyDecorated = 'true';
    });
  }

  async function decorate() {
    try {
      const meps = await getRoster();
      decorateIrishCards(meps);
      decorateAnalysisNames(meps);
    } catch (error) {
      console.warn('Party logo decoration unavailable', error);
    }
  }

  addStyles();
  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList:true, subtree:true });
  decorate();
})();
