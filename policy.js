(() => {
  const TERM_START = '16 July 2024';
  let policyLoaded = false;
  let policyLoading = false;

  const CATEGORY_RULES = [
    { name: 'Competitiveness & SMEs', words: ['competitiveness', 'small business', 'small and medium', 'sme', 'single market', 'simplification', 'administrative burden'] },
    { name: 'Trade', words: ['trade', 'customs', 'export', 'import', 'tariff', 'mercosur', 'free trade'] },
    { name: 'Energy', words: ['energy', 'electricity', 'gas market', 'renewable', 'power market'] },
    { name: 'Digital', words: ['digital', 'artificial intelligence', 'cyber', 'data act', 'platform', 'semiconductor'] },
    { name: 'Employment & Skills', words: ['employment', 'labour', 'worker', 'skills', 'apprenticeship', 'training'] },
    { name: 'Transport', words: ['transport', 'aviation', 'rail', 'road freight', 'shipping', 'mobility'] },
    { name: 'Climate & Environment', words: ['climate', 'emissions', 'carbon', 'environment', 'circular economy', 'nature restoration'] },
    { name: 'Tax & Finance', words: ['tax', 'taxation', 'vat', 'banking', 'capital markets', 'finance', 'investment'] }
  ];

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .policy-note { background:#f8fafc; border:1px solid #e4e7ec; border-radius:10px; padding:18px; margin:16px 0; }
      .policy-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:16px 0; }
      .policy-stat { background:white; border:1px solid #e4e7ec; border-radius:10px; padding:16px; }
      .policy-stat strong { display:block; font-size:24px; color:#003399; margin-bottom:4px; }
      .policy-table { width:100%; border-collapse:collapse; margin-top:14px; background:white; }
      .policy-table th,.policy-table td { border-bottom:1px solid #e4e7ec; padding:10px 8px; text-align:left; font-size:13px; vertical-align:middle; }
      .policy-table th { color:#475467; font-size:12px; }
      .participation-track { width:150px; max-width:100%; height:10px; background:#eaecf0; border-radius:20px; overflow:hidden; }
      .participation-fill { height:100%; background:#039855; border-radius:20px; }
      .position-stack { display:flex; width:210px; max-width:100%; height:12px; background:#eaecf0; border-radius:20px; overflow:hidden; }
      .stack-for { background:#039855; }
      .stack-against { background:#d92d20; }
      .stack-abstain { background:#f79009; }
      .stack-dnv { background:#98a2b3; }
      .policy-legend { display:flex; flex-wrap:wrap; gap:12px; margin:10px 0 16px; font-size:12px; color:#475467; }
      .legend-dot { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
      .category-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px; }
      .category-card { background:#f8fafc; border:1px solid #e4e7ec; border-radius:8px; padding:12px; }
      .category-card strong { color:#003399; }
      @media(max-width:760px){ .policy-grid,.category-grid{grid-template-columns:1fr;} .policy-table{display:block; overflow-x:auto;} }
    `;
    document.head.appendChild(style);
  }

  function installTab() {
    const tabs = document.querySelector('.tabs');
    const main = document.querySelector('main');
    if (!tabs || !main || document.getElementById('policy')) return;

    const button = document.createElement('button');
    button.className = 'tab';
    button.textContent = 'Policy Alignment';
    button.addEventListener('click', () => showPolicyTab(button));
    tabs.appendChild(button);

    const section = document.createElement('section');
    section.id = 'policy';
    section.className = 'section';
    section.innerHTML = `
      <h2>Policy alignment & participation</h2>
      <p>Compare Irish MEP participation and recorded voting behaviour across the current parliamentary term, with a framework for evidence-backed Chambers Ireland / Eurochambres policy alignment.</p>
      <button class="primary" id="policyRefresh">Refresh analysis</button>
      <div id="policyResults"><div class="loader">Open this tab to calculate the current-term analysis.</div></div>
    `;
    main.appendChild(section);
    document.getElementById('policyRefresh').addEventListener('click', () => loadPolicyAnalysis(true));
  }

  function showPolicyTab(button) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('policy').classList.add('active');
    button.classList.add('active');
    if (!policyLoaded) loadPolicyAnalysis();
  }

  async function fetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} returned ${r.status}`);
    return r.json();
  }

  async function mapWithConcurrency(items, limit, fn) {
    const output = new Array(items.length);
    let index = 0;
    async function worker() {
      while (index < items.length) {
        const current = index++;
        output[current] = await fn(items[current], current);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return output;
  }

  function countPositions(votes) {
    const c = { FOR:0, AGAINST:0, ABSTENTION:0, DID_NOT_VOTE:0 };
    for (const v of votes) {
      const p = String(v?.position || '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(c, p)) c[p] += 1;
    }
    return c;
  }

  function classifyVote(vote) {
    const fields = [vote?.display_title, vote?.description, vote?.reference];
    if (Array.isArray(vote?.topics)) fields.push(...vote.topics.map(t => t?.label || t?.code));
    if (Array.isArray(vote?.oeil_subjects)) fields.push(...vote.oeil_subjects.map(t => t?.label || t?.code));
    const text = fields.filter(Boolean).join(' ').toLowerCase();
    return CATEGORY_RULES.filter(r => r.words.some(w => text.includes(w))).map(r => r.name);
  }

  function pct(n, d) {
    return d ? Math.round((n / d) * 1000) / 10 : 0;
  }

  async function loadPolicyAnalysis(force = false) {
    if (policyLoading) return;
    if (policyLoaded && !force) return;
    policyLoading = true;
    const results = document.getElementById('policyResults');
    results.innerHTML = '<div class="loader">Calculating Irish MEP participation and voting patterns from the current term...</div>';

    try {
      const rosterData = await fetchJson('/api/irish-meps');
      const meps = Array.isArray(rosterData.meps) ? rosterData.meps : [];
      const valid = meps.map(m => ({ ...m, numericId: String(m.id || '').replace(/\D/g,'') })).filter(m => m.numericId);

      const histories = await mapWithConcurrency(valid, 4, async mep => {
        const data = await fetchJson('/api/member-votes?id=' + encodeURIComponent(mep.numericId));
        const votes = Array.isArray(data.results) ? data.results : [];
        return { mep, votes, counts: countPositions(votes) };
      });

      const rows = histories.map(item => {
        const c = item.counts;
        const total = c.FOR + c.AGAINST + c.ABSTENTION + c.DID_NOT_VOTE;
        const participated = c.FOR + c.AGAINST + c.ABSTENTION;
        return { ...item, total, participation: pct(participated, total) };
      }).sort((a,b) => b.participation - a.participation || a.mep.name.localeCompare(b.mep.name));

      const uniqueVotes = new Map();
      for (const row of rows) {
        for (const vote of row.votes) {
          if (vote?.id != null && !uniqueVotes.has(String(vote.id))) uniqueVotes.set(String(vote.id), vote);
        }
      }
      const categoryCounts = Object.fromEntries(CATEGORY_RULES.map(r => [r.name, 0]));
      for (const vote of uniqueVotes.values()) {
        for (const cat of classifyVote(vote)) categoryCounts[cat] += 1;
      }

      const avgParticipation = rows.length ? Math.round(rows.reduce((s,r) => s + r.participation,0) / rows.length * 10) / 10 : 0;
      const activeRecorded = rows.reduce((s,r) => s + r.total, 0);

      results.innerHTML = `
        <div class="policy-note">
          <strong>How to read this</strong>
          <p style="margin-bottom:0;">Participation and policy alignment are deliberately separate. Abstentions count as participation but remain visible as their own position. A future alignment percentage will only score votes where a Chambers Ireland or Eurochambres position can be supported by a published policy source; unscored votes will not affect the percentage.</p>
        </div>

        <div class="policy-grid">
          <div class="policy-stat"><strong>${rows.length}</strong><span>Current Irish MEPs analysed</span></div>
          <div class="policy-stat"><strong>${avgParticipation}%</strong><span>Average recorded participation</span></div>
          <div class="policy-stat"><strong>${uniqueVotes.size}</strong><span>Unique roll-call votes in dataset</span></div>
        </div>

        <div class="card">
          <h3>Participation since ${TERM_START}</h3>
          <p class="meta">For + Against + Abstention divided by all recorded positions. “Did not vote” is kept separate.</p>
          <table class="policy-table">
            <thead><tr><th>MEP</th><th>Participation</th><th>Rate</th><th>Recorded positions</th></tr></thead>
            <tbody>
              ${rows.map(r => `<tr>
                <td><strong>${escapeHTMLSafe(r.mep.name)}</strong></td>
                <td><div class="participation-track"><div class="participation-fill" style="width:${Math.min(100,r.participation)}%"></div></div></td>
                <td>${r.participation}%</td>
                <td>${r.total}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3>Recorded voting positions by Irish MEP</h3>
          <div class="policy-legend">
            <span><i class="legend-dot stack-for"></i>For</span>
            <span><i class="legend-dot stack-against"></i>Against</span>
            <span><i class="legend-dot stack-abstain"></i>Abstained</span>
            <span><i class="legend-dot stack-dnv"></i>Did not vote</span>
          </div>
          <table class="policy-table">
            <thead><tr><th>MEP</th><th>Distribution</th><th>For</th><th>Against</th><th>Abstain</th><th>Did not vote</th></tr></thead>
            <tbody>
              ${rows.map(r => {
                const c = r.counts; const t = r.total || 1;
                return `<tr>
                  <td><strong>${escapeHTMLSafe(r.mep.name)}</strong></td>
                  <td><div class="position-stack">
                    <span class="stack-for" style="width:${pct(c.FOR,t)}%"></span>
                    <span class="stack-against" style="width:${pct(c.AGAINST,t)}%"></span>
                    <span class="stack-abstain" style="width:${pct(c.ABSTENTION,t)}%"></span>
                    <span class="stack-dnv" style="width:${pct(c.DID_NOT_VOTE,t)}%"></span>
                  </div></td>
                  <td>${c.FOR}</td><td>${c.AGAINST}</td><td>${c.ABSTENTION}</td><td>${c.DID_NOT_VOTE}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3>Business-relevant vote candidates</h3>
          <p class="meta">Automatic topic matching helps identify votes for policy review. It does <strong>not</strong> decide whether a vote is pro- or anti-business.</p>
          <div class="category-grid">
            ${Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1]).map(([name,count]) => `<div class="category-card"><strong>${escapeHTMLSafe(name)}</strong><div class="meta" style="margin-top:4px;">${count} potentially relevant unique votes</div></div>`).join('')}
          </div>
        </div>

        <div class="card">
          <h3>Evidence-backed policy alignment</h3>
          <p>The scoring layer is ready to sit here, but it should only score a vote when we can connect that vote to an explicit Chambers Ireland or Eurochambres position and record the source and confidence level.</p>
          <div class="policy-note" style="margin-bottom:0;">
            <strong>Recommended scoring rule</strong>
            <p style="margin-bottom:0;">Aligned / Not aligned are calculated only from scored votes. Abstained and Did not vote are reported separately. Votes with no reliable policy position remain “Unscored” and do not change an MEP's alignment percentage.</p>
          </div>
        </div>

        <div class="meta" style="margin-top:12px;">${activeRecorded.toLocaleString('en-IE')} individual recorded MEP positions analysed · current parliamentary term.</div>
      `;
      policyLoaded = true;
    } catch (error) {
      console.error(error);
      results.innerHTML = '<div class="card error"><strong>Unable to calculate policy analysis.</strong><p>Please try the refresh button again shortly.</p></div>';
    } finally {
      policyLoading = false;
    }
  }

  function escapeHTMLSafe(value) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(value);
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  addStyles();
  installTab();
})();
