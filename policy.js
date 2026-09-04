(() => {
  const TERM_START = '16 July 2024';
  const STORAGE_KEY = 'mepTrackerPolicyPositionsV1';
  let analysisLoaded = false;
  let analysisLoading = false;
  let cachedModel = null;

  const CATEGORY_RULES = [
    { name: 'Competitiveness & SMEs', words: ['competitiveness', 'small business', 'small and medium', 'sme', 'single market', 'simplification', 'administrative burden', 'late payment'] },
    { name: 'Trade', words: ['trade', 'customs', 'export', 'import', 'tariff', 'mercosur', 'free trade', 'trade agreement'] },
    { name: 'Energy', words: ['energy', 'electricity', 'gas market', 'renewable', 'power market', 'energy market'] },
    { name: 'Digital', words: ['digital', 'artificial intelligence', 'cyber', 'data act', 'platform', 'semiconductor'] },
    { name: 'Employment & Skills', words: ['employment', 'labour', 'worker', 'skills', 'apprenticeship', 'training', 'minimum wage'] },
    { name: 'Transport', words: ['transport', 'aviation', 'rail', 'road freight', 'shipping', 'mobility'] },
    { name: 'Climate & Environment', words: ['climate', 'emissions', 'carbon', 'environment', 'circular economy', 'nature restoration', 'packaging'] },
    { name: 'Tax & Finance', words: ['tax', 'taxation', 'vat', 'banking', 'capital markets', 'finance', 'investment', 'financial'] }
  ];

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .analysis-note { background:#f8fafc; border:1px solid #e4e7ec; border-radius:10px; padding:18px; margin:16px 0; }
      .analysis-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0; }
      .analysis-stat { background:white; border:1px solid #e4e7ec; border-radius:10px; padding:16px; }
      .analysis-stat strong { display:block; font-size:24px; color:#003399; margin-bottom:4px; }
      .analysis-table { width:100%; border-collapse:collapse; margin-top:14px; background:white; }
      .analysis-table th,.analysis-table td { border-bottom:1px solid #e4e7ec; padding:10px 8px; text-align:left; font-size:13px; vertical-align:middle; }
      .analysis-table th { color:#475467; font-size:12px; }
      .participation-track { width:150px; max-width:100%; height:10px; background:#eaecf0; border-radius:20px; overflow:hidden; }
      .participation-fill { height:100%; background:#039855; border-radius:20px; }
      .position-stack { display:flex; width:210px; max-width:100%; height:12px; background:#eaecf0; border-radius:20px; overflow:hidden; }
      .stack-for { background:#039855; }
      .stack-against { background:#d92d20; }
      .stack-abstain { background:#f79009; }
      .stack-dnv { background:#98a2b3; }
      .analysis-legend { display:flex; flex-wrap:wrap; gap:12px; margin:10px 0 16px; font-size:12px; color:#475467; }
      .legend-dot { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
      .category-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:12px; }
      .category-card { background:#f8fafc; border:1px solid #e4e7ec; border-radius:8px; padding:12px; }
      .category-card strong { color:#003399; }
      .review-row { border-top:1px solid #e4e7ec; padding:16px 0; }
      .review-row:first-child { border-top:0; }
      .review-title { font-weight:700; margin:4px 0 6px; line-height:1.35; }
      .review-tags { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
      .review-tag { display:inline-block; background:#eef4ff; color:#003399; border-radius:5px; padding:4px 7px; font-size:11px; font-weight:700; }
      .vote-split { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 10px; font-size:12px; color:#475467; }
      .position-editor { display:grid; grid-template-columns:180px minmax(180px,1fr) auto; gap:8px; align-items:center; margin-top:10px; }
      .position-editor select,.position-editor input { width:100%; padding:9px 10px; border:1px solid #d0d5dd; border-radius:7px; font-size:13px; background:white; }
      .alignment-good { color:#027a48; font-weight:700; }
      .alignment-bad { color:#b42318; font-weight:700; }
      .alignment-muted { color:#667085; }
      .analysis-toolbar { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; align-items:center; }
      .analysis-toolbar select { padding:9px 10px; border:1px solid #d0d5dd; border-radius:7px; background:white; }
      .small-note { font-size:12px; color:#667085; line-height:1.45; }
      @media(max-width:900px){ .analysis-grid,.category-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
      @media(max-width:760px){ .analysis-grid,.category-grid{grid-template-columns:1fr;} .analysis-table{display:block; overflow-x:auto;} .position-editor{grid-template-columns:1fr;} }
    `;
    document.head.appendChild(style);
  }

  function installTab() {
    const tabs = document.querySelector('.tabs');
    const main = document.querySelector('main');
    if (!tabs || !main || document.getElementById('mep-analysis')) return;

    const button = document.createElement('button');
    button.className = 'tab';
    button.textContent = 'MEP Analysis';
    button.addEventListener('click', () => showAnalysisTab(button));
    tabs.appendChild(button);

    const section = document.createElement('section');
    section.id = 'mep-analysis';
    section.className = 'section';
    section.innerHTML = `
      <h2>Irish MEP analysis</h2>
      <p>See participation and voting behaviour first, then review the business-relevant votes where a Chambers Ireland or Eurochambres position can be evidenced.</p>
      <button class="primary" id="analysisRefresh">Refresh analysis</button>
      <div id="analysisResults"><div class="loader">Open this tab to calculate the current-term analysis.</div></div>
    `;
    main.appendChild(section);
    document.getElementById('analysisRefresh').addEventListener('click', () => loadAnalysis(true));
  }

  function showAnalysisTab(button) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('mep-analysis').classList.add('active');
    button.classList.add('active');
    if (!analysisLoaded) loadAnalysis();
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

  function pct(n, d) {
    return d ? Math.round((n / d) * 1000) / 10 : 0;
  }

  function classifyVote(vote) {
    const fields = [vote?.display_title, vote?.description, vote?.reference];
    if (Array.isArray(vote?.topics)) fields.push(...vote.topics.map(t => t?.label || t?.code));
    if (Array.isArray(vote?.oeil_subjects)) fields.push(...vote.oeil_subjects.map(t => t?.label || t?.code));
    if (Array.isArray(vote?.responsible_committees)) fields.push(...vote.responsible_committees.map(c => c?.label || c?.code || c?.abbreviation));
    const text = fields.filter(Boolean).join(' ').toLowerCase();
    return CATEGORY_RULES.filter(r => r.words.some(w => text.includes(w))).map(r => r.name);
  }

  function getPolicyStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function savePolicyStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function buildModel(meps, histories) {
    const rows = histories.map(item => {
      const c = item.counts;
      const total = c.FOR + c.AGAINST + c.ABSTENTION + c.DID_NOT_VOTE;
      const participated = c.FOR + c.AGAINST + c.ABSTENTION;
      return {
        ...item,
        total,
        participation: pct(participated, total),
        abstentionRate: pct(c.ABSTENTION, total),
        didNotVoteRate: pct(c.DID_NOT_VOTE, total)
      };
    }).sort((a,b) => b.participation - a.participation || a.mep.name.localeCompare(b.mep.name));

    const voteMap = new Map();
    for (const row of rows) {
      for (const vote of row.votes) {
        if (vote?.id == null) continue;
        const id = String(vote.id);
        if (!voteMap.has(id)) {
          voteMap.set(id, { ...vote, positions: {}, categories: classifyVote(vote) });
        }
        voteMap.get(id).positions[row.mep.numericId] = String(vote.position || 'UNKNOWN').toUpperCase();
      }
    }

    const uniqueVotes = [...voteMap.values()].sort((a,b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    const relevantVotes = uniqueVotes.filter(v => v.categories.length);
    const categoryCounts = Object.fromEntries(CATEGORY_RULES.map(r => [r.name, 0]));
    relevantVotes.forEach(v => v.categories.forEach(cat => categoryCounts[cat] += 1));

    return { meps, rows, uniqueVotes, relevantVotes, categoryCounts };
  }

  function alignmentForMep(mep, relevantVotes, store) {
    let aligned = 0;
    let notAligned = 0;
    let abstained = 0;
    let didNotVote = 0;
    let scoredEvents = 0;

    for (const vote of relevantVotes) {
      const decision = store[String(vote.id)];
      if (!decision || !['SUPPORT','OPPOSE'].includes(decision.position)) continue;
      const actual = vote.positions[mep.numericId];
      if (!actual) continue;
      scoredEvents += 1;

      if (actual === 'ABSTENTION') { abstained += 1; continue; }
      if (actual === 'DID_NOT_VOTE') { didNotVote += 1; continue; }
      if (actual !== 'FOR' && actual !== 'AGAINST') continue;

      const isAligned = (decision.position === 'SUPPORT' && actual === 'FOR') ||
        (decision.position === 'OPPOSE' && actual === 'AGAINST');
      if (isAligned) aligned += 1;
      else notAligned += 1;
    }

    const comparable = aligned + notAligned;
    return {
      aligned,
      notAligned,
      abstained,
      didNotVote,
      scoredEvents,
      comparable,
      rate: comparable ? pct(aligned, comparable) : null
    };
  }

  function splitForVote(vote) {
    const c = { FOR:0, AGAINST:0, ABSTENTION:0, DID_NOT_VOTE:0 };
    Object.values(vote.positions || {}).forEach(p => {
      if (Object.prototype.hasOwnProperty.call(c, p)) c[p] += 1;
    });
    return c;
  }

  function committeeText(vote) {
    if (!Array.isArray(vote?.responsible_committees)) return '';
    return vote.responsible_committees
      .map(c => c?.abbreviation || c?.code || c?.label || '')
      .filter(Boolean)
      .join(', ');
  }

  function renderAnalysis(model) {
    const results = document.getElementById('analysisResults');
    const store = getPolicyStore();
    const scoredVotes = model.relevantVotes.filter(v => ['SUPPORT','OPPOSE'].includes(store[String(v.id)]?.position));
    const reviewedMixed = model.relevantVotes.filter(v => store[String(v.id)]?.position === 'MIXED');
    const avgParticipation = model.rows.length
      ? Math.round(model.rows.reduce((s,r) => s + r.participation,0) / model.rows.length * 10) / 10
      : 0;

    const alignmentRows = model.rows.map(row => ({
      mep: row.mep,
      ...alignmentForMep(row.mep, model.relevantVotes, store)
    })).sort((a,b) => {
      if (a.rate == null && b.rate == null) return a.mep.name.localeCompare(b.mep.name);
      if (a.rate == null) return 1;
      if (b.rate == null) return -1;
      return b.rate - a.rate || a.mep.name.localeCompare(b.mep.name);
    });

    results.innerHTML = `
      <div class="analysis-note">
        <strong>What this tab tells you</strong>
        <p style="margin-bottom:0;">The first half is factual: who participates and how they vote. The second half is a policy review workflow. The app identifies votes that may matter to business, but it does not guess whether Chambers Ireland or Eurochambres would support them. You can mark an evidenced position and the app will then calculate MEP alignment automatically.</p>
      </div>

      <div class="analysis-grid">
        <div class="analysis-stat"><strong>${model.rows.length}</strong><span>Current Irish MEPs</span></div>
        <div class="analysis-stat"><strong>${avgParticipation}%</strong><span>Average recorded participation</span></div>
        <div class="analysis-stat"><strong>${model.uniqueVotes.length}</strong><span>Unique roll-call votes found</span></div>
        <div class="analysis-stat"><strong>${model.relevantVotes.length}</strong><span>Business-relevant candidates</span></div>
      </div>

      <div class="card">
        <h3>1. Participation since ${TERM_START}</h3>
        <p class="meta">For + Against + Abstention divided by all recorded positions returned for that MEP. “Did not vote” is shown separately.</p>
        <table class="analysis-table">
          <thead><tr><th>MEP</th><th>Participation</th><th>Rate</th><th>Abstain</th><th>Did not vote</th><th>Recorded positions</th></tr></thead>
          <tbody>
            ${model.rows.map(r => `<tr>
              <td><strong>${esc(r.mep.name)}</strong></td>
              <td><div class="participation-track"><div class="participation-fill" style="width:${Math.min(100,r.participation)}%"></div></div></td>
              <td>${r.participation}%</td>
              <td>${r.abstentionRate}%</td>
              <td>${r.didNotVoteRate}%</td>
              <td>${r.total}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="small-note" style="margin-top:10px;">A lower number of recorded positions can reflect when an MEP entered Parliament, not just attendance, so the rate is more useful than comparing raw totals alone.</div>
      </div>

      <div class="card">
        <h3>2. Recorded voting behaviour</h3>
        <p class="meta">This shows behaviour only. A high number of “For” votes is not treated as more business-friendly than “Against”.</p>
        <div class="analysis-legend">
          <span><i class="legend-dot stack-for"></i>For</span>
          <span><i class="legend-dot stack-against"></i>Against</span>
          <span><i class="legend-dot stack-abstain"></i>Abstained</span>
          <span><i class="legend-dot stack-dnv"></i>Did not vote</span>
        </div>
        <table class="analysis-table">
          <thead><tr><th>MEP</th><th>Distribution</th><th>For</th><th>Against</th><th>Abstain</th><th>Did not vote</th></tr></thead>
          <tbody>
            ${model.rows.map(r => {
              const c = r.counts; const t = r.total || 1;
              return `<tr>
                <td><strong>${esc(r.mep.name)}</strong></td>
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
        <h3>3. Business-policy areas in the voting record</h3>
        <p class="meta">These are automatic relevance matches only. They help you find votes worth reviewing.</p>
        <div class="category-grid">
          ${Object.entries(model.categoryCounts).sort((a,b)=>b[1]-a[1]).map(([name,count]) => `<div class="category-card"><strong>${esc(name)}</strong><div class="meta" style="margin-top:4px;">${count} potentially relevant votes</div></div>`).join('')}
        </div>
      </div>

      <div class="card">
        <h3>4. Chambers / Eurochambres policy review queue</h3>
        <p>Use this only when you have a defensible Chambers Ireland or Eurochambres view on the vote. Once you mark <strong>Support</strong> or <strong>Oppose</strong>, the MEP alignment table below updates automatically.</p>
        <div class="analysis-note" style="margin-bottom:12px;">
          <strong>${scoredVotes.length} scored votes · ${reviewedMixed.length} marked mixed/neutral</strong>
          <div class="small-note" style="margin-top:4px;">Decisions and evidence notes are saved in this browser only. “Mixed / neutral” is treated as reviewed but is not used in alignment percentages.</div>
        </div>
        <div class="analysis-toolbar">
          <label for="analysisCategoryFilter"><strong>Show:</strong></label>
          <select id="analysisCategoryFilter">
            <option value="ALL">All business-relevant candidates</option>
            ${CATEGORY_RULES.map(r => `<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('')}
          </select>
          <button class="secondary" id="showUnreviewedOnly">Unreviewed only</button>
        </div>
        <div id="policyReviewList"></div>
      </div>

      <div class="card">
        <h3>5. Evidence-backed MEP alignment</h3>
        ${scoredVotes.length ? `
          <p class="meta">Calculated only from votes you have explicitly marked Support or Oppose. Abstentions and non-votes are shown separately and do not count as aligned or not aligned.</p>
          <table class="analysis-table">
            <thead><tr><th>MEP</th><th>Alignment</th><th>Aligned</th><th>Not aligned</th><th>Abstained</th><th>Did not vote</th></tr></thead>
            <tbody>
              ${alignmentRows.map(r => `<tr>
                <td><strong>${esc(r.mep.name)}</strong></td>
                <td>${r.rate == null ? '<span class="alignment-muted">No comparable votes</span>' : `<span class="${r.rate >= 50 ? 'alignment-good' : 'alignment-bad'}">${r.rate}%</span>`}</td>
                <td>${r.aligned}</td>
                <td>${r.notAligned}</td>
                <td>${r.abstained}</td>
                <td>${r.didNotVote}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        ` : `
          <div class="analysis-note" style="margin-bottom:0;">
            <strong>No votes scored yet</strong>
            <p style="margin-bottom:0;">Start in the review queue above. When you identify a reliable Chambers Ireland or Eurochambres position, mark the vote Support or Oppose and add the evidence/source. The alignment table will then appear here.</p>
          </div>
        `}
      </div>
    `;

    bindReviewControls(model);
    renderReviewQueue(model, 'ALL', false);
  }

  function bindReviewControls(model) {
    const filter = document.getElementById('analysisCategoryFilter');
    const toggle = document.getElementById('showUnreviewedOnly');
    let unreviewedOnly = false;

    if (filter) {
      filter.addEventListener('change', () => renderReviewQueue(model, filter.value, unreviewedOnly));
    }
    if (toggle) {
      toggle.addEventListener('click', () => {
        unreviewedOnly = !unreviewedOnly;
        toggle.textContent = unreviewedOnly ? 'Show all' : 'Unreviewed only';
        renderReviewQueue(model, filter?.value || 'ALL', unreviewedOnly);
      });
    }
  }

  function renderReviewQueue(model, category, unreviewedOnly) {
    const container = document.getElementById('policyReviewList');
    if (!container) return;
    const store = getPolicyStore();

    let votes = model.relevantVotes.filter(v => category === 'ALL' || v.categories.includes(category));
    if (unreviewedOnly) votes = votes.filter(v => !store[String(v.id)]?.position);
    votes = votes.slice(0, 40);

    if (!votes.length) {
      container.innerHTML = '<div class="meta" style="padding:14px 0;">No votes match this view.</div>';
      return;
    }

    container.innerHTML = votes.map(vote => {
      const decision = store[String(vote.id)] || {};
      const split = splitForVote(vote);
      const date = vote.timestamp ? new Date(vote.timestamp).toLocaleDateString('en-IE') : 'Date unavailable';
      const title = vote.display_title || vote.description || 'European Parliament vote';
      const committees = committeeText(vote);
      return `
        <div class="review-row" data-review-vote="${esc(vote.id)}">
          <div class="meta">${esc(date)}${committees ? ' · ' + esc(committees) : ''}</div>
          <div class="review-title">${esc(title)}</div>
          <div class="review-tags">${vote.categories.map(cat => `<span class="review-tag">${esc(cat)}</span>`).join('')}</div>
          <div class="vote-split"><span>Irish MEPs: <strong>${split.FOR} For</strong></span><span>${split.AGAINST} Against</span><span>${split.ABSTENTION} Abstained</span><span>${split.DID_NOT_VOTE} Did not vote</span></div>
          <div class="position-editor">
            <select id="policy-pos-${esc(vote.id)}">
              <option value="" ${!decision.position ? 'selected' : ''}>No position identified</option>
              <option value="SUPPORT" ${decision.position === 'SUPPORT' ? 'selected' : ''}>Chambers / Eurochambres: Support</option>
              <option value="OPPOSE" ${decision.position === 'OPPOSE' ? 'selected' : ''}>Chambers / Eurochambres: Oppose</option>
              <option value="MIXED" ${decision.position === 'MIXED' ? 'selected' : ''}>Mixed / neutral</option>
            </select>
            <input id="policy-evidence-${esc(vote.id)}" value="${esc(decision.evidence || '')}" placeholder="Evidence/source e.g. Eurochambres paper or link">
            <button class="secondary save-policy-position" data-vote-id="${esc(vote.id)}">Save</button>
          </div>
          <div style="margin-top:8px;"><a href="https://howtheyvote.eu/votes/${encodeURIComponent(vote.id)}" target="_blank" rel="noopener">Open full vote →</a></div>
        </div>`;
    }).join('');

    container.querySelectorAll('.save-policy-position').forEach(button => {
      button.addEventListener('click', () => saveVoteDecision(button.dataset.voteId));
    });
  }

  function saveVoteDecision(voteId) {
    const positionEl = document.getElementById('policy-pos-' + voteId);
    const evidenceEl = document.getElementById('policy-evidence-' + voteId);
    const position = positionEl?.value || '';
    const evidence = evidenceEl?.value?.trim() || '';
    const store = getPolicyStore();

    if (!position) {
      delete store[voteId];
    } else {
      store[voteId] = { position, evidence, updatedAt: new Date().toISOString() };
    }
    savePolicyStore(store);
    if (cachedModel) renderAnalysis(cachedModel);
  }

  async function loadAnalysis(force = false) {
    if (analysisLoading) return;
    if (analysisLoaded && !force) return;
    analysisLoading = true;
    const results = document.getElementById('analysisResults');
    results.innerHTML = '<div class="loader">Calculating Irish MEP participation and voting patterns from the current term...</div>';

    try {
      const rosterData = await fetchJson('/api/irish-meps');
      const meps = Array.isArray(rosterData.meps) ? rosterData.meps : [];
      const valid = meps
        .map(m => ({ ...m, numericId: String(m.id || '').replace(/\D/g,'') }))
        .filter(m => m.numericId);

      const histories = await mapWithConcurrency(valid, 4, async mep => {
        const data = await fetchJson('/api/member-votes?id=' + encodeURIComponent(mep.numericId));
        const votes = Array.isArray(data.results) ? data.results : [];
        return { mep, votes, counts: countPositions(votes) };
      });

      cachedModel = buildModel(valid, histories);
      renderAnalysis(cachedModel);
      analysisLoaded = true;
    } catch (error) {
      console.error(error);
      results.innerHTML = '<div class="card error"><strong>Unable to calculate MEP analysis.</strong><p>Please try the refresh button again shortly.</p></div>';
    } finally {
      analysisLoading = false;
    }
  }

  addStyles();
  installTab();
})();
