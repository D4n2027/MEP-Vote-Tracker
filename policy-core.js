(() => {
  const TERM_START_ISO = '2024-07-16';
  const TERM_START_LABEL = '16 July 2024';
  let analysisLoaded = false;
  let analysisLoading = false;
  let cachedModel = null;

  const CORE_COMMITTEES = {
    ECON: 'Economic and Monetary Affairs',
    FISC: 'Tax Matters',
    IMCO: 'Internal Market and Consumer Protection',
    ITRE: 'Industry, Research and Energy',
    INTA: 'International Trade',
    TRAN: 'Transport and Tourism',
    HOUS: 'Housing Crisis in the European Union',
    REGI: 'Regional Development',
    EMPL: 'Employment and Social Affairs',
    ENVI: 'Environment, Climate and Food Safety'
  };

  const CATEGORY_RULES = [
    { name: 'Competitiveness & SMEs', words: ['competitiveness','small business','small and medium','sme','single market','simplification','administrative burden','late payment'] },
    { name: 'Trade', words: ['trade','customs','export','import','tariff','mercosur','free trade','trade agreement'] },
    { name: 'Energy', words: ['energy','electricity','gas market','renewable','power market','energy market'] },
    { name: 'Digital', words: ['digital','artificial intelligence','cyber','data act','platform','semiconductor'] },
    { name: 'Employment & Skills', words: ['employment','labour','worker','skills','apprenticeship','training','minimum wage'] },
    { name: 'Transport', words: ['transport','aviation','rail','road freight','shipping','mobility'] },
    { name: 'Climate & Environment', words: ['climate','emissions','carbon','environment','circular economy','nature restoration','packaging'] },
    { name: 'Tax & Finance', words: ['tax','taxation','vat','banking','capital markets','finance','investment','financial'] }
  ];

  const state = {
    view: 'overview',
    dataset: 'BUSINESS',
    period: 'TERM',
    start: TERM_START_ISO,
    end: '',
    category: 'ALL',
    committee: 'ALL',
    committeeSet: 'CORE',
    mep: 'ALL',
    search: '',
    sort: 'DATE_DESC',
    limit: 30
  };

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const pct = (n,d) => d ? Math.round((n / d) * 1000) / 10 : 0;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .analysis-note{background:#f8fafc;border:1px solid #e4e7ec;border-radius:10px;padding:16px 18px;margin:16px 0;line-height:1.5}
      .analysis-subnav{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0}.analysis-subnav button{background:#eef2f6;color:#344054;border:1px solid #d0d5dd}.analysis-subnav button.active{background:#003399;color:#fff;border-color:#003399}
      .analysis-controls{background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:16px;margin:14px 0 18px}.control-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px}.control-field label{display:block;font-size:12px;font-weight:700;color:#475467;margin-bottom:5px}.control-field select,.control-field input{width:100%;padding:10px;border:1px solid #d0d5dd;border-radius:7px;background:white;font-size:13px}.control-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}.control-hint{font-size:12px;color:#667085;margin-left:auto}
      .analysis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}.analysis-stat{background:white;border:1px solid #e4e7ec;border-radius:10px;padding:16px}.analysis-stat strong{display:block;font-size:24px;color:#003399;margin-bottom:4px}.analysis-stat span{font-size:13px;color:#475467}
      .analysis-table-wrap{overflow-x:auto}.analysis-table{width:100%;border-collapse:collapse;margin-top:12px;background:white;min-width:720px}.analysis-table th,.analysis-table td{border-bottom:1px solid #e4e7ec;padding:10px 8px;text-align:left;font-size:13px;vertical-align:middle}.analysis-table th{color:#475467;font-size:12px;white-space:nowrap}.analysis-table tr:last-child td{border-bottom:0}
      .participation-track{width:150px;height:10px;background:#eaecf0;border-radius:20px;overflow:hidden}.participation-fill{height:100%;background:#039855;border-radius:20px}.position-stack{display:flex;width:220px;height:12px;background:#eaecf0;border-radius:20px;overflow:hidden}.stack-for{background:#039855}.stack-against{background:#d92d20}.stack-abstain{background:#f79009}.stack-dnv{background:#98a2b3}
      .analysis-legend{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 12px;font-size:12px;color:#475467}.legend-dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}.role-member{background:#e7f6ec;color:#027a48}.role-substitute{background:#fff1d6;color:#b54708}.role-vice{background:#e7eef9;color:#173f70}.role-chair{background:#ede9fe;color:#6941c6}
      .coverage-wrap{overflow-x:auto;margin-top:12px}.coverage-table{border-collapse:separate;border-spacing:0;min-width:900px;width:100%}.coverage-table th,.coverage-table td{border-right:1px solid #eaecf0;border-bottom:1px solid #eaecf0;padding:7px;text-align:center;font-size:12px}.coverage-table th:first-child,.coverage-table td:first-child{text-align:left;position:sticky;left:0;background:#fff;z-index:2;min-width:180px}.coverage-table thead th{background:#f8fafc;color:#475467;position:sticky;top:0;z-index:1}.coverage-table thead th:first-child{z-index:3}.coverage-cell{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:28px;border-radius:5px;font-weight:800}.coverage-empty{color:#d0d5dd}.coverage-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:12px 0}.coverage-card{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px}.coverage-card strong{display:block;color:#003399;font-size:18px}.coverage-card span{font-size:12px;color:#667085}.committee-name{font-size:11px;color:#667085;font-weight:400;display:block;margin-top:2px}
      .category-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.category-card{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px}.category-card strong{display:block;color:#003399}.category-card span{font-size:12px;color:#667085}
      .analysis-vote{border-top:1px solid #e4e7ec;padding:15px 0}.analysis-vote:first-child{border-top:0}.analysis-vote-title{font-weight:700;margin:4px 0 6px;line-height:1.35}.analysis-tags{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}.analysis-tag{display:inline-block;background:#eef4ff;color:#003399;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700}.vote-split{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;font-size:12px;color:#475467}.split-badge,.consensus-badge{display:inline-block;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700}.split-badge{background:#fff4e5;color:#b54708}.consensus-badge{background:#ecfdf3;color:#027a48}
      .comparison-box{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px;margin-top:10px}.comparison-row{display:grid;grid-template-columns:minmax(170px,1.6fr) 110px 1fr;gap:8px;padding:7px 0;border-top:1px solid #e4e7ec;align-items:center;font-size:13px}.comparison-row:first-child{border-top:0}.position-pill{display:inline-block;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700;width:max-content}.p-for{background:#ecfdf3;color:#027a48}.p-against{background:#fee4e2;color:#b42318}.p-abstention{background:#fef0c7;color:#b54708}.p-dnv{background:#f2f4f7;color:#475467}.p-other{background:#eef2ff;color:#3730a3}
      .empty-state{padding:28px;text-align:center;color:#667085}.analysis-section-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.analysis-section-title h3{margin-bottom:4px}.small-meta{font-size:12px;color:#667085}.filter-summary{font-size:12px;color:#475467;background:#f8fafc;border-radius:6px;padding:7px 9px;display:inline-block;margin-top:6px}
      @media(max-width:980px){.control-grid{grid-template-columns:repeat(2,minmax(150px,1fr))}.analysis-grid,.category-grid,.coverage-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.control-grid,.analysis-grid,.category-grid,.coverage-summary{grid-template-columns:1fr}.control-hint{width:100%;margin-left:0}.comparison-row{grid-template-columns:1fr}.analysis-subnav button{flex:1 1 auto}}
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
      <p>Explore committee coverage, participation, voting behaviour and business-related votes using live European Parliament and HowTheyVote data.</p>
      <button class="primary" id="analysisRefresh">Refresh source data</button>
      <div id="analysisResults"><div class="loader">Open this tab to build the current analysis.</div></div>
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
        try {
          output[current] = await fn(items[current], current);
        } catch (error) {
          console.warn('Analysis item failed', items[current]?.name || current, error);
          output[current] = null;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return output.filter(Boolean);
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
    if (Array.isArray(vote?.responsible_committees)) fields.push(...vote.responsible_committees.map(c => c?.label || c?.code || c?.abbreviation));
    const text = fields.filter(Boolean).join(' ').toLowerCase();
    return CATEGORY_RULES.filter(r => r.words.some(w => text.includes(w))).map(r => r.name);
  }

  function committeeCodesForVote(vote) {
    if (!Array.isArray(vote?.responsible_committees)) return [];
    return vote.responsible_committees
      .map(c => String(c?.abbreviation || c?.code || c?.label || '').trim().toUpperCase())
      .filter(Boolean);
  }

  function committeeText(vote) {
    return committeeCodesForVote(vote).join(', ');
  }

  function splitForVote(vote) {
    const c = { FOR:0, AGAINST:0, ABSTENTION:0, DID_NOT_VOTE:0 };
    Object.values(vote.positions || {}).forEach(p => {
      if (Object.prototype.hasOwnProperty.call(c, p)) c[p] += 1;
    });
    return c;
  }

  function buildModel(meps, histories) {
    const usableIds = new Set(histories.map(h => h.mep.numericId));
    const usableMeps = meps.filter(m => usableIds.has(m.numericId));

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
          voteMap.set(id, {
            ...vote,
            positions: {},
            categories: classifyVote(vote),
            committeeCodes: committeeCodesForVote(vote)
          });
        }
        voteMap.get(id).positions[row.mep.numericId] = String(vote.position || 'UNKNOWN').toUpperCase();
      }
    }

    const uniqueVotes = [...voteMap.values()].sort((a,b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    uniqueVotes.forEach(v => {
      v.irishSplit = splitForVote(v);
      v.isDivided = v.irishSplit.FOR > 0 && v.irishSplit.AGAINST > 0;
    });

    const committeeDirectory = new Map();
    for (const [code,name] of Object.entries(CORE_COMMITTEES)) committeeDirectory.set(code, name);
    for (const mep of usableMeps) {
      for (const c of Array.isArray(mep.committees) ? mep.committees : []) {
        if (c.code) committeeDirectory.set(String(c.code).toUpperCase(), c.name || c.code);
      }
    }

    return { meps: usableMeps, rows, uniqueVotes, committeeDirectory };
  }

  function roleCode(role) {
    const value = String(role || '').toLowerCase();
    if (value.includes('vice') && value.includes('chair')) return { code:'VC', cls:'role-vice', label:'Vice-Chair' };
    if (value.includes('chair')) return { code:'C', cls:'role-chair', label:'Chair' };
    if (value.includes('substitute')) return { code:'S', cls:'role-substitute', label:'Substitute' };
    return { code:'M', cls:'role-member', label:'Member' };
  }

  function positionInfo(position) {
    const p = String(position || '').toUpperCase();
    if (p === 'FOR') return { label:'FOR', cls:'p-for' };
    if (p === 'AGAINST') return { label:'AGAINST', cls:'p-against' };
    if (p === 'ABSTENTION') return { label:'ABSTAINED', cls:'p-abstention' };
    if (p === 'DID_NOT_VOTE') return { label:'DID NOT VOTE', cls:'p-dnv' };
    return { label:p.replaceAll('_',' ') || 'NO DATA', cls:'p-other' };
  }

  function dateRange() {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    let start = new Date(TERM_START_ISO + 'T00:00:00');

    if (state.period === '2026') start = new Date('2026-01-01T00:00:00');
    if (state.period === '2025') start = new Date('2025-01-01T00:00:00');
    if (state.period === '2024') start = new Date('2024-07-16T00:00:00');
    if (state.period === '12M') {
      start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
    }
    if (state.period === '90D') {
      start = new Date(today);
      start.setDate(start.getDate() - 90);
    }
    if (state.period === 'CUSTOM') {
      start = state.start ? new Date(state.start + 'T00:00:00') : new Date(TERM_START_ISO + 'T00:00:00');
      return { start, end: state.end ? new Date(state.end + 'T23:59:59') : end };
    }

    if (state.period === '2024') return { start, end:new Date('2024-12-31T23:59:59') };
    if (state.period === '2025') return { start, end:new Date('2025-12-31T23:59:59') };
    if (state.period === '2026') return { start, end };
    return { start, end };
  }

  function searchText(vote) {
    const parts = [vote?.display_title, vote?.description, vote?.reference, ...(vote.categories || []), ...(vote.committeeCodes || [])];
    if (Array.isArray(vote?.topics)) parts.push(...vote.topics.map(t => t?.label || t?.code));
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function filteredVotes(model) {
    const range = dateRange();
    let votes = model.uniqueVotes.filter(v => {
      const date = new Date(v.timestamp || 0);
      return date >= range.start && date <= range.end;
    });

    if (state.dataset === 'BUSINESS') votes = votes.filter(v => v.categories.length);
    if (state.dataset === 'DIVIDED') votes = votes.filter(v => v.categories.length && v.isDivided);
    if (state.category !== 'ALL') votes = votes.filter(v => v.categories.includes(state.category));
    if (state.committee !== 'ALL') votes = votes.filter(v => v.committeeCodes.includes(state.committee));
    if (state.mep !== 'ALL') votes = votes.filter(v => Object.prototype.hasOwnProperty.call(v.positions || {}, state.mep));
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      votes = votes.filter(v => searchText(v).includes(q));
    }

    if (state.sort === 'DIVIDED') {
      votes.sort((a,b) => {
        const aScore = Math.min(a.irishSplit.FOR, a.irishSplit.AGAINST);
        const bScore = Math.min(b.irishSplit.FOR, b.irishSplit.AGAINST);
        return bScore - aScore || new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });
    } else if (state.sort === 'DATE_ASC') {
      votes.sort((a,b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    } else {
      votes.sort((a,b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }

    return votes;
  }

  function selectedMeps(model) {
    return state.mep === 'ALL' ? model.meps : model.meps.filter(m => m.numericId === state.mep);
  }

  function statsForVotes(model, votes) {
    const meps = selectedMeps(model);
    return meps.map(mep => {
      const positions = votes.map(v => v.positions?.[mep.numericId]).filter(Boolean);
      const counts = { FOR:0, AGAINST:0, ABSTENTION:0, DID_NOT_VOTE:0 };
      positions.forEach(p => { if (Object.prototype.hasOwnProperty.call(counts, p)) counts[p] += 1; });
      const total = counts.FOR + counts.AGAINST + counts.ABSTENTION + counts.DID_NOT_VOTE;
      const participated = counts.FOR + counts.AGAINST + counts.ABSTENTION;
      return {
        mep,
        counts,
        total,
        participation:pct(participated,total),
        abstentionRate:pct(counts.ABSTENTION,total),
        didNotVoteRate:pct(counts.DID_NOT_VOTE,total)
      };
    }).sort((a,b) => b.participation - a.participation || a.mep.name.localeCompare(b.mep.name));
  }

  function filterSummary(votes) {
    const bits = [];
    bits.push(state.dataset === 'ALL' ? 'All roll-call votes' : state.dataset === 'DIVIDED' ? 'Divided business-related votes' : 'Business-related votes');
    if (state.category !== 'ALL') bits.push(state.category);
    if (state.committee !== 'ALL') bits.push(state.committee);
    if (state.mep !== 'ALL' && cachedModel) bits.push(cachedModel.meps.find(m => m.numericId === state.mep)?.name || 'Selected MEP');
    if (state.search.trim()) bits.push(`Search: ${state.search.trim()}`);
    bits.push(`${votes.length} vote${votes.length === 1 ? '' : 's'}`);
    return bits.join(' · ');
  }

  function renderControls(model) {
    const committees = [...model.committeeDirectory.entries()].sort((a,b) => a[0].localeCompare(b[0]));
    return `
      <div class="analysis-subnav" id="analysisSubnav">
        ${[
          ['overview','Overview'],
          ['committees','Committee coverage'],
          ['participation','Participation'],
          ['behaviour','Voting behaviour'],
          ['votes','Vote explorer']
        ].map(([id,label]) => `<button data-view="${id}" class="${state.view === id ? 'active' : ''}">${label}</button>`).join('')}
      </div>

      <div class="analysis-controls">
        <div class="control-grid">
          <div class="control-field"><label>Vote set</label><select id="analysisDataset">
            <option value="BUSINESS" ${state.dataset==='BUSINESS'?'selected':''}>Business-related votes</option>
            <option value="DIVIDED" ${state.dataset==='DIVIDED'?'selected':''}>Divided business-related votes</option>
            <option value="ALL" ${state.dataset==='ALL'?'selected':''}>All roll-call votes</option>
          </select></div>
          <div class="control-field"><label>Period</label><select id="analysisPeriod">
            <option value="TERM" ${state.period==='TERM'?'selected':''}>Current term</option>
            <option value="2026" ${state.period==='2026'?'selected':''}>2026</option>
            <option value="2025" ${state.period==='2025'?'selected':''}>2025</option>
            <option value="2024" ${state.period==='2024'?'selected':''}>2024 term start onwards</option>
            <option value="12M" ${state.period==='12M'?'selected':''}>Last 12 months</option>
            <option value="90D" ${state.period==='90D'?'selected':''}>Last 90 days</option>
            <option value="CUSTOM" ${state.period==='CUSTOM'?'selected':''}>Custom dates</option>
          </select></div>
          <div class="control-field"><label>Policy area</label><select id="analysisCategory"><option value="ALL">All areas</option>${CATEGORY_RULES.map(r=>`<option value="${esc(r.name)}" ${state.category===r.name?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
          <div class="control-field"><label>Responsible committee</label><select id="analysisCommittee"><option value="ALL">All committees</option>${committees.map(([code,name])=>`<option value="${esc(code)}" ${state.committee===code?'selected':''}>${esc(code)} — ${esc(name)}</option>`).join('')}</select></div>
          <div class="control-field"><label>Irish MEP</label><select id="analysisMep"><option value="ALL">All Irish MEPs</option>${model.meps.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`<option value="${esc(m.numericId)}" ${state.mep===m.numericId?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
          <div class="control-field"><label>Search vote text</label><input id="analysisSearch" value="${esc(state.search)}" placeholder="e.g. energy, SMEs, Mercosur"></div>
          <div class="control-field"><label>Sort votes</label><select id="analysisSort"><option value="DATE_DESC" ${state.sort==='DATE_DESC'?'selected':''}>Newest first</option><option value="DATE_ASC" ${state.sort==='DATE_ASC'?'selected':''}>Oldest first</option><option value="DIVIDED" ${state.sort==='DIVIDED'?'selected':''}>Most divided first</option></select></div>
          <div class="control-field"><label>Committee matrix</label><select id="analysisCommitteeSet"><option value="CORE" ${state.committeeSet==='CORE'?'selected':''}>Relevant committees</option><option value="ALL" ${state.committeeSet==='ALL'?'selected':''}>All current committees</option></select></div>
          ${state.period === 'CUSTOM' ? `<div class="control-field"><label>Start date</label><input type="date" id="analysisStart" value="${esc(state.start)}"></div><div class="control-field"><label>End date</label><input type="date" id="analysisEnd" value="${esc(state.end)}"></div>` : ''}
        </div>
        <div class="control-actions">
          <button class="primary" id="analysisApply">Apply filters</button>
          <button class="secondary" id="analysisReset">Reset</button>
          <button class="secondary" id="analysisExportVotes">Download filtered votes CSV</button>
          <button class="secondary" id="analysisExportCommittees">Download committee coverage CSV</button>
          <span class="control-hint">Filters recalculate the tab without re-downloading the source data.</span>
        </div>
      </div>
    `;
  }

  function bindControls(model) {
    document.querySelectorAll('#analysisSubnav [data-view]').forEach(btn => btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      renderAnalysis(model);
    }));

    const apply = () => {
      state.dataset = document.getElementById('analysisDataset')?.value || state.dataset;
      state.period = document.getElementById('analysisPeriod')?.value || state.period;
      state.category = document.getElementById('analysisCategory')?.value || 'ALL';
      state.committee = document.getElementById('analysisCommittee')?.value || 'ALL';
      state.mep = document.getElementById('analysisMep')?.value || 'ALL';
      state.search = document.getElementById('analysisSearch')?.value || '';
      state.sort = document.getElementById('analysisSort')?.value || 'DATE_DESC';
      state.committeeSet = document.getElementById('analysisCommitteeSet')?.value || 'CORE';
      if (state.period === 'CUSTOM') {
        state.start = document.getElementById('analysisStart')?.value || TERM_START_ISO;
        state.end = document.getElementById('analysisEnd')?.value || '';
      }
      renderAnalysis(model);
    };

    document.getElementById('analysisApply')?.addEventListener('click', apply);
    document.getElementById('analysisSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    document.getElementById('analysisPeriod')?.addEventListener('change', e => {
      state.period = e.target.value;
      renderAnalysis(model);
    });
    document.getElementById('analysisReset')?.addEventListener('click', () => {
      Object.assign(state, { dataset:'BUSINESS', period:'TERM', start:TERM_START_ISO, end:'', category:'ALL', committee:'ALL', committeeSet:'CORE', mep:'ALL', search:'', sort:'DATE_DESC', limit:30 });
      renderAnalysis(model);
    });
    document.getElementById('analysisExportVotes')?.addEventListener('click', () => exportVotesCsv(model));
    document.getElementById('analysisExportCommittees')?.addEventListener('click', () => exportCommitteesCsv(model));
  }

  function matrixCommittees(model) {
    if (state.committee !== 'ALL') {
      const name = model.committeeDirectory.get(state.committee) || state.committee;
      return [[state.committee,name]];
    }

    if (state.committeeSet === 'CORE') return Object.entries(CORE_COMMITTEES);

    return [...model.committeeDirectory.entries()].sort((a,b) => {
      const ai = Object.keys(CORE_COMMITTEES).indexOf(a[0]);
      const bi = Object.keys(CORE_COMMITTEES).indexOf(b[0]);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a[0].localeCompare(b[0]);
    });
  }

  function committeeMembership(mep, code) {
    return (Array.isArray(mep.committees) ? mep.committees : []).find(c => String(c.code || '').toUpperCase() === code);
  }

  function renderCommitteeCoverage(model, compact = false) {
    const meps = selectedMeps(model).slice().sort((a,b) => a.name.localeCompare(b.name));
    const committees = matrixCommittees(model);
    let full = 0, substitutes = 0, chairs = 0, vice = 0, gaps = 0;

    for (const [code] of committees) {
      const roles = meps.map(m => committeeMembership(m, code)).filter(Boolean).map(c => roleCode(c.role));
      if (!roles.length) gaps += 1;
      roles.forEach(r => {
        if (r.code === 'S') substitutes += 1;
        else full += 1;
        if (r.code === 'C') chairs += 1;
        if (r.code === 'VC') vice += 1;
      });
    }

    return `
      <div class="card">
        <div class="analysis-section-title"><div><h3>${compact ? 'Relevant committee coverage' : 'Irish MEP committee coverage'}</h3><div class="small-meta">Current committee memberships from European Parliament open data. This is independent of the vote-date filters.</div></div></div>
        <div class="coverage-summary">
          <div class="coverage-card"><strong>${full}</strong><span>Member / chair roles</span></div>
          <div class="coverage-card"><strong>${substitutes}</strong><span>Substitute roles</span></div>
          <div class="coverage-card"><strong>${chairs}</strong><span>Chair roles</span></div>
          <div class="coverage-card"><strong>${vice}</strong><span>Vice-chair roles</span></div>
          <div class="coverage-card"><strong>${gaps}</strong><span>Committees with no selected MEP coverage</span></div>
        </div>
        <div class="analysis-legend"><span><i class="legend-dot role-member"></i>M = Member</span><span><i class="legend-dot role-substitute"></i>S = Substitute</span><span><i class="legend-dot role-vice"></i>VC = Vice-Chair</span><span><i class="legend-dot role-chair"></i>C = Chair</span></div>
        <div class="coverage-wrap"><table class="coverage-table"><thead><tr><th>Irish MEP</th>${committees.map(([code,name])=>`<th title="${esc(name)}">${esc(code)}<span class="committee-name">${compact ? '' : esc(name)}</span></th>`).join('')}</tr></thead><tbody>
          ${meps.map(mep => `<tr><td><strong>${esc(mep.name)}</strong><div class="small-meta">${esc(mep.group || '')}</div></td>${committees.map(([code]) => {
            const membership = committeeMembership(mep, code);
            if (!membership) return '<td><span class="coverage-empty">—</span></td>';
            const role = roleCode(membership.role);
            return `<td><span class="coverage-cell ${role.cls}" title="${esc(role.label)}">${role.code}</span></td>`;
          }).join('')}</tr>`).join('')}
        </tbody></table></div>
      </div>
    `;
  }

  function renderParticipation(model, votes) {
    const stats = statsForVotes(model, votes);
    return `
      <div class="card">
        <div class="analysis-section-title"><div><h3>Participation</h3><div class="small-meta">For + Against + Abstention as a share of recorded positions in the selected vote set. “Did not vote” remains separate.</div></div></div>
        <div class="filter-summary">${esc(filterSummary(votes))}</div>
        <div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>MEP</th><th>Participation</th><th>Rate</th><th>Abstain</th><th>Did not vote</th><th>Positions in set</th></tr></thead><tbody>
          ${stats.map(r => `<tr><td><strong>${esc(r.mep.name)}</strong></td><td><div class="participation-track"><div class="participation-fill" style="width:${Math.min(100,r.participation)}%"></div></div></td><td>${r.participation}%</td><td>${r.abstentionRate}%</td><td>${r.didNotVoteRate}%</td><td>${r.total}</td></tr>`).join('') || '<tr><td colspan="6">No positions match the current filters.</td></tr>'}
        </tbody></table></div>
      </div>
    `;
  }

  function renderBehaviour(model, votes) {
    const stats = statsForVotes(model, votes);
    return `
      <div class="card">
        <div class="analysis-section-title"><div><h3>Voting behaviour</h3><div class="small-meta">Raw For / Against / Abstain / Did not vote distribution for the selected vote set.</div></div></div>
        <div class="filter-summary">${esc(filterSummary(votes))}</div>
        <div class="analysis-legend"><span><i class="legend-dot stack-for"></i>For</span><span><i class="legend-dot stack-against"></i>Against</span><span><i class="legend-dot stack-abstain"></i>Abstained</span><span><i class="legend-dot stack-dnv"></i>Did not vote</span></div>
        <div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>MEP</th><th>Distribution</th><th>For</th><th>Against</th><th>Abstain</th><th>Did not vote</th></tr></thead><tbody>
          ${stats.map(r => { const c=r.counts,t=r.total||1; return `<tr><td><strong>${esc(r.mep.name)}</strong></td><td><div class="position-stack"><span class="stack-for" style="width:${pct(c.FOR,t)}%"></span><span class="stack-against" style="width:${pct(c.AGAINST,t)}%"></span><span class="stack-abstain" style="width:${pct(c.ABSTENTION,t)}%"></span><span class="stack-dnv" style="width:${pct(c.DID_NOT_VOTE,t)}%"></span></div></td><td>${c.FOR}</td><td>${c.AGAINST}</td><td>${c.ABSTENTION}</td><td>${c.DID_NOT_VOTE}</td></tr>`; }).join('') || '<tr><td colspan="6">No positions match the current filters.</td></tr>'}
        </tbody></table></div>
      </div>
    `;
  }

  function renderCategorySummary(votes) {
    const counts = Object.fromEntries(CATEGORY_RULES.map(r => [r.name,0]));
    votes.forEach(v => (v.categories || []).forEach(cat => { if (Object.prototype.hasOwnProperty.call(counts,cat)) counts[cat] += 1; }));
    return `
      <div class="card"><h3>Business-policy areas in the selected data</h3><div class="small-meta">Topic matching identifies potentially relevant votes. It does not determine a Chambers or Eurochambres position.</div><div class="category-grid">${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="category-card"><strong>${esc(name)}</strong><span>${count} matching vote${count===1?'':'s'}</span></div>`).join('')}</div></div>
    `;
  }

  function renderMepComparison(vote, model) {
    return model.meps.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(mep => {
      const p = positionInfo(vote.positions[mep.numericId]);
      return `<div class="comparison-row"><strong>${esc(mep.name)}</strong><span class="position-pill ${p.cls}">${p.label}</span><span class="meta">${esc(mep.group || '')}</span></div>`;
    }).join('');
  }

  function renderVote(vote, model) {
    const date = vote.timestamp ? new Date(vote.timestamp).toLocaleDateString('en-IE') : 'Date unavailable';
    const title = vote.display_title || vote.description || 'European Parliament vote';
    const c = vote.irishSplit || splitForVote(vote);
    const committee = committeeText(vote);
    const compareId = `analysis-compare-${String(vote.id).replace(/[^a-zA-Z0-9_-]/g,'')}`;
    return `
      <div class="analysis-vote">
        <div class="meta">${esc(date)}${committee ? ' · ' + esc(committee) : ''}</div>
        <div class="analysis-vote-title">${esc(title)}</div>
        <div class="analysis-tags">${(vote.categories || []).map(cat=>`<span class="analysis-tag">${esc(cat)}</span>`).join('')}</div>
        <div class="vote-split"><span><strong>${c.FOR}</strong> For</span><span><strong>${c.AGAINST}</strong> Against</span><span><strong>${c.ABSTENTION}</strong> Abstained</span><span><strong>${c.DID_NOT_VOTE}</strong> Did not vote</span>${vote.isDivided?'<span class="split-badge">Irish delegation split</span>':'<span class="consensus-badge">No For/Against split</span>'}</div>
        <div><button class="secondary analysis-compare-btn" data-target="${compareId}">Compare Irish MEPs</button><a style="margin-left:10px" href="https://howtheyvote.eu/votes/${encodeURIComponent(vote.id)}" target="_blank" rel="noopener">Full vote →</a></div>
        <div class="comparison-box" id="${compareId}" hidden>${renderMepComparison(vote,model)}</div>
      </div>
    `;
  }

  function renderVoteExplorer(model, votes, compact = false) {
    const shown = votes.slice(0, compact ? 8 : state.limit);
    return `
      <div class="card">
        <div class="analysis-section-title"><div><h3>${compact ? 'Most useful votes to inspect' : 'Vote explorer'}</h3><div class="small-meta">Open any vote to compare all Irish MEPs side by side.</div></div>${compact ? '' : `<div class="small-meta">Showing ${shown.length} of ${votes.length}</div>`}</div>
        <div class="filter-summary">${esc(filterSummary(votes))}</div>
        <div>${shown.length ? shown.map(v=>renderVote(v,model)).join('') : '<div class="empty-state">No votes match the current filters.</div>'}</div>
        ${!compact && votes.length > state.limit ? `<div style="margin-top:12px"><button class="secondary" id="analysisShowMore">Show more</button></div>` : ''}
      </div>
    `;
  }

  function bindVoteButtons(model) {
    document.querySelectorAll('.analysis-compare-btn').forEach(btn => btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.hidden = !target.hidden;
      btn.textContent = target.hidden ? 'Compare Irish MEPs' : 'Hide comparison';
    }));
    document.getElementById('analysisShowMore')?.addEventListener('click', () => {
      state.limit += 30;
      renderAnalysis(model);
    });
  }

  function renderOverview(model, votes) {
    const stats = statsForVotes(model, votes);
    const avg = stats.length ? Math.round(stats.reduce((s,r)=>s+r.participation,0)/stats.length*10)/10 : 0;
    const divided = votes.filter(v=>v.isDivided).length;
    return `
      <div class="analysis-note"><strong>Interactive analysis</strong><div>Use the filters above to change the vote set, year, policy area, committee or individual MEP. The committee matrix shows current roles; the voting sections recalculate from the filtered roll-call data.</div></div>
      <div class="analysis-grid"><div class="analysis-stat"><strong>${selectedMeps(model).length}</strong><span>Irish MEPs selected</span></div><div class="analysis-stat"><strong>${votes.length}</strong><span>Votes in current set</span></div><div class="analysis-stat"><strong>${avg}%</strong><span>Average participation in set</span></div><div class="analysis-stat"><strong>${divided}</strong><span>Votes with an Irish For/Against split</span></div></div>
      ${renderCommitteeCoverage(model,true)}
      ${renderParticipation(model,votes)}
      ${renderCategorySummary(votes.filter(v=>v.categories.length))}
      ${renderVoteExplorer(model,votes.filter(v=>v.isDivided).length ? votes.filter(v=>v.isDivided) : votes,true)}
    `;
  }

  function renderAnalysis(model) {
    cachedModel = model;
    const results = document.getElementById('analysisResults');
    const votes = filteredVotes(model);
    let body = '';

    if (state.view === 'committees') body = renderCommitteeCoverage(model,false);
    else if (state.view === 'participation') body = renderParticipation(model,votes);
    else if (state.view === 'behaviour') body = renderBehaviour(model,votes);
    else if (state.view === 'votes') body = renderCategorySummary(votes.filter(v=>v.categories.length)) + renderVoteExplorer(model,votes,false);
    else body = renderOverview(model,votes);

    results.innerHTML = renderControls(model) + body + `<div class="small-meta" style="margin-top:12px">Voting data: HowTheyVote · committee memberships: European Parliament Open Data · parliamentary term starts ${TERM_START_LABEL}.</div>`;
    bindControls(model);
    bindVoteButtons(model);
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportVotesCsv(model) {
    const votes = filteredVotes(model);
    const meps = model.meps.slice().sort((a,b)=>a.name.localeCompare(b.name));
    const rows = [['Date','Vote ID','Title','Policy areas','Responsible committees','For','Against','Abstained','Did not vote',...meps.map(m=>m.name)]];
    votes.forEach(v => {
      const c = v.irishSplit;
      rows.push([
        v.timestamp ? new Date(v.timestamp).toISOString().slice(0,10) : '',
        v.id,
        v.display_title || v.description || '',
        (v.categories || []).join(' | '),
        (v.committeeCodes || []).join(' | '),
        c.FOR,c.AGAINST,c.ABSTENTION,c.DID_NOT_VOTE,
        ...meps.map(m => v.positions?.[m.numericId] || '')
      ]);
    });
    downloadCsv('irish-mep-votes-filtered.csv', rows);
  }

  function exportCommitteesCsv(model) {
    const rows = [['MEP','Political group','Committee code','Committee name','Role']];
    selectedMeps(model).slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(mep => {
      (Array.isArray(mep.committees) ? mep.committees : []).forEach(c => rows.push([mep.name,mep.group || '',c.code || '',c.name || '',c.role || '']));
    });
    downloadCsv('irish-mep-committee-coverage.csv', rows);
  }

  async function loadAnalysis(force = false) {
    if (analysisLoading) return;
    if (analysisLoaded && !force && cachedModel) {
      renderAnalysis(cachedModel);
      return;
    }

    analysisLoading = true;
    const results = document.getElementById('analysisResults');
    results.innerHTML = '<div class="loader">Loading Irish MEPs, committee memberships and current-term voting histories...</div>';

    try {
      const rosterData = await fetchJson('/api/irish-meps');
      const meps = (Array.isArray(rosterData.meps) ? rosterData.meps : [])
        .map(m => ({ ...m, numericId:String(m.id || '').replace(/\D/g,'') }))
        .filter(m => m.numericId);

      const histories = await mapWithConcurrency(meps, 4, async mep => {
        const data = await fetchJson('/api/member-votes?id=' + encodeURIComponent(mep.numericId));
        const votes = Array.isArray(data.results) ? data.results : [];
        return { mep, votes, counts:countPositions(votes) };
      });

      if (!histories.length) throw new Error('No MEP voting histories could be loaded.');

      cachedModel = buildModel(meps, histories);
      analysisLoaded = true;
      renderAnalysis(cachedModel);
    } catch (error) {
      console.error(error);
      results.innerHTML = '<div class="card error"><strong>Unable to build MEP analysis.</strong><p>Please try Refresh source data again shortly.</p></div>';
    } finally {
      analysisLoading = false;
    }
  }

  addStyles();
  installTab();
})();
