(() => {
  const TERM_START = new Date('2024-07-16T00:00:00');
  const rosterCache = { value: null, promise: null };
  const historyCache = new Map();
  const voteSearchCache = new Map();

  const COMMITTEE_NAMES = {
    ECON: 'Economic and Monetary Affairs', FISC: 'Tax Matters', IMCO: 'Internal Market and Consumer Protection',
    ITRE: 'Industry, Research and Energy', INTA: 'International Trade', TRAN: 'Transport and Tourism',
    HOUS: 'Housing Crisis in the European Union', REGI: 'Regional Development', EMPL: 'Employment and Social Affairs',
    ENVI: 'Environment, Climate and Food Safety', AGRI: 'Agriculture and Rural Development', SANT: 'Public Health',
    AFET: 'Foreign Affairs', SEDE: 'Security and Defence', DROI: 'Human Rights', BUDG: 'Budgets',
    CONT: 'Budgetary Control', LIBE: 'Civil Liberties, Justice and Home Affairs', JURI: 'Legal Affairs'
  };

  const AREAS = [
    {
      name: 'Competitiveness & SMEs', relevance: 3, committees: ['IMCO','ITRE','ECON'],
      words: ['competitiveness','small business','small and medium','sme','single market','simplification','administrative burden','late payment','business'],
      why: 'Potential implications for business costs, the Single Market, SME conditions or the regulatory burden.'
    },
    {
      name: 'Trade', relevance: 3, committees: ['INTA'],
      words: ['trade','customs','export','import','tariff','mercosur','free trade','trade agreement','market access'],
      why: 'Potential implications for market access, tariffs, exports, imports and supply chains.'
    },
    {
      name: 'Energy', relevance: 3, committees: ['ITRE','ENVI'],
      words: ['energy','electricity','gas','renewable','power market','energy market','grid','electricity market'],
      why: 'Potential implications for energy costs, security of supply, investment and business competitiveness.'
    },
    {
      name: 'Digital', relevance: 3, committees: ['ITRE','IMCO','LIBE'],
      words: ['digital','artificial intelligence',' ai ','cyber','data act','platform','semiconductor','online'],
      why: 'Potential implications for digital regulation, data, AI, cybersecurity and technology investment.'
    },
    {
      name: 'Employment & Skills', relevance: 3, committees: ['EMPL'],
      words: ['employment','labour','worker','workers','skills','apprenticeship','training','minimum wage','workplace'],
      why: 'Potential implications for labour rules, workforce costs, skills and access to talent.'
    },
    {
      name: 'Transport', relevance: 3, committees: ['TRAN'],
      words: ['transport','aviation','rail','road freight','shipping','mobility','logistics'],
      why: 'Potential implications for connectivity, logistics, freight, mobility and transport costs.'
    },
    {
      name: 'Tax & Finance', relevance: 3, committees: ['ECON','FISC'],
      words: ['tax','taxation','vat','banking','capital markets','finance','investment','financial','credit'],
      why: 'Potential implications for taxation, access to finance, investment and capital markets.'
    },
    {
      name: 'Climate & Environment', relevance: 2, committees: ['ENVI','ITRE'],
      words: ['climate','emissions','carbon','environment','circular economy','nature restoration','packaging','waste'],
      why: 'Potential implications for environmental obligations, transition costs, investment and competitiveness.'
    },
    {
      name: 'Agriculture & Food', relevance: 2, committees: ['AGRI','ENVI'],
      words: ['agriculture','agricultural','farmer','farming','food','livestock','rural'],
      why: 'Potential implications for the agri-food economy, rural business and supply chains.'
    },
    {
      name: 'Regional Development & Housing', relevance: 2, committees: ['REGI','HOUS'],
      words: ['regional development','cohesion','housing','affordable housing','rural development'],
      why: 'Potential implications for regional investment, infrastructure, housing supply and local economic development.'
    },
    {
      name: 'Health', relevance: 2, committees: ['SANT','ENVI'],
      words: ['health','public health','medicine','medicinal','pharmaceutical','disease','cancer'],
      why: 'Potential implications for employers, life sciences, healthcare markets and regulation.'
    },
    {
      name: 'Foreign Affairs & Security', relevance: 1, committees: ['AFET','SEDE','INTA'],
      words: ['foreign policy','defence','defense','security','ukraine','russia','sanctions','middle east'],
      why: 'May have indirect implications for trade, supply chains, sanctions exposure and economic security.'
    }
  ];

  const STOPWORDS = new Set(['the','and','for','with','from','into','over','under','of','to','in','on','a','an','eu','european','parliament','commission','statement','report','debate','vote','voting','resolution','procedure','discussion','decision','oral','question']);

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

  function addStyles() {
    if (document.getElementById('upcomingBriefingStyles')) return;
    const style = document.createElement('style');
    style.id = 'upcomingBriefingStyles';
    style.textContent = `
      .upcoming-briefing-action{margin-top:14px;display:flex;align-items:center;gap:10px;border-top:1px solid #e3e8ee;padding-top:14px}
      .upcoming-briefing-button{background:#0D3E76!important;color:#fff!important;border:1px solid #0D3E76!important;border-radius:5px!important;padding:9px 13px!important;font-weight:700!important;box-shadow:none!important;transform:none!important}
      .upcoming-briefing-button:hover{background:#092f5a!important;box-shadow:none!important;transform:none!important}
      .upcoming-briefing-hint{font-size:12px;color:#6b7280}
      #upcomingBriefingDialog{width:min(1040px,calc(100vw - 32px));max-height:90vh;border:0;padding:0;background:#fff;color:#1f2937;box-shadow:0 18px 55px rgba(13,62,118,.22)}
      #upcomingBriefingDialog::backdrop{background:rgba(18,32,51,.48)}
      .briefing-head{background:#0D3E76;color:#fff;padding:23px 26px;border-bottom:4px solid #D8A20B;display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
      .briefing-head h2{margin:3px 0 6px;font-size:27px;line-height:1.2;color:#fff}.briefing-head .briefing-date{font-size:12px;color:#dbe6f3}
      .briefing-close{background:transparent!important;color:#fff!important;border:1px solid rgba(255,255,255,.45)!important;border-radius:4px!important;padding:6px 9px!important;font-size:18px!important;line-height:1!important;box-shadow:none!important;transform:none!important}
      .briefing-body{padding:24px 26px 30px;overflow:auto;max-height:calc(90vh - 100px)}
      .briefing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}
      .briefing-summary{border:1px solid #dfe4ea;border-top:3px solid #0D3E76;padding:13px 14px;background:#fff}.briefing-summary.gold{border-top-color:#D8A20B}.briefing-summary.teal{border-top-color:#00A69C}
      .briefing-summary span{display:block;font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}.briefing-summary strong{font-size:17px;color:#0D3E76}
      .briefing-section{margin-top:24px}.briefing-section h3{font-size:19px;color:#0D3E76;margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #dce2e8}.briefing-section p{line-height:1.55;color:#475467}
      .briefing-tags{display:flex;gap:6px;flex-wrap:wrap}.briefing-tag{display:inline-block;border:1px solid #d8dee6;background:#f7f9fb;border-radius:4px;padding:5px 8px;font-size:11px;font-weight:700;color:#344054}
      .briefing-committee-list{display:flex;flex-wrap:wrap;gap:8px}.briefing-committee{border-left:4px solid #1B75BB;background:#f7f9fb;padding:9px 11px;min-width:180px}.briefing-committee strong{color:#0D3E76}.briefing-committee small{display:block;color:#667085;margin-top:3px}
      .briefing-mep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.briefing-mep{border:1px solid #dfe4ea;padding:13px;display:grid;grid-template-columns:48px 1fr;gap:11px;background:#fff}.briefing-mep img{width:48px;height:48px;border-radius:50%;object-fit:cover;background:#eef2f6}.briefing-mep h4{margin:0 0 3px;color:#0D3E76;font-size:15px}.briefing-mep .mep-meta{font-size:11px;color:#667085;line-height:1.45}.briefing-mep-stats{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #e5e7eb;padding-top:9px;margin-top:2px;gap:5px}.briefing-mep-stats div{font-size:10px;color:#667085}.briefing-mep-stats strong{display:block;color:#1f2937;font-size:13px;margin-bottom:1px}
      .briefing-vote{border-bottom:1px solid #e5e7eb;padding:12px 0}.briefing-vote:last-child{border-bottom:0}.briefing-vote-title{font-weight:700;color:#1f3550;margin:4px 0;line-height:1.4}.briefing-vote-meta{font-size:11px;color:#667085}.briefing-vote-positions{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0}.brief-pos{font-size:10px;font-weight:800;padding:4px 6px;border-radius:3px}.brief-pos.for{background:#e7f5ed;color:#166534}.brief-pos.against{background:#fdecec;color:#991b1b}.brief-pos.abstain{background:#fff3dc;color:#92400e}.brief-pos.dnv{background:#eef0f2;color:#4b5563}
      .briefing-source-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}.briefing-source-row a{font-size:12px}.briefing-method{border-left:4px solid #D8A20B;background:#fffaf0;padding:11px 13px;font-size:11px;line-height:1.5;color:#65531f;margin-top:20px}
      .briefing-loading{padding:36px 10px;text-align:center;color:#667085}.briefing-empty{padding:12px 0;color:#667085;font-size:13px}
      @media(max-width:760px){.briefing-grid{grid-template-columns:1fr}.briefing-mep-grid{grid-template-columns:1fr}.briefing-head{padding:18px}.briefing-body{padding:18px}.briefing-mep-stats{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    let dialog = document.getElementById('upcomingBriefingDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'upcomingBriefingDialog';
    dialog.innerHTML = '<div id="upcomingBriefingContent"></div>';
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  function classify(title) {
    const text = ` ${String(title || '').toLowerCase()} `;
    const matched = AREAS.map(area => {
      const hitWords = area.words.filter(word => text.includes(word));
      return hitWords.length ? { ...area, hitWords } : null;
    }).filter(Boolean);
    const maxRelevance = matched.reduce((m, x) => Math.max(m, x.relevance), 0);
    return {
      areas: matched,
      relevance: maxRelevance >= 3 ? 'High' : maxRelevance === 2 ? 'Medium' : maxRelevance === 1 ? 'Low' : 'Unclear'
    };
  }

  function queryCandidates(title, classification) {
    const candidates = [];
    classification.areas.forEach(area => area.hitWords.forEach(word => {
      const cleaned = word.trim();
      if (cleaned.length >= 4) candidates.push(cleaned);
    }));
    const tokens = String(title || '').toLowerCase().replace(/[^a-z0-9áéíóúàèìòùäëïöüñ\- ]/gi,' ')
      .split(/\s+/).filter(t => t.length >= 5 && !STOPWORDS.has(t));
    tokens.sort((a,b) => b.length - a.length);
    candidates.push(...tokens.slice(0,4));
    classification.areas.forEach(area => candidates.push(area.name.split('&')[0].trim()));
    return [...new Set(candidates.map(x => x.trim()).filter(Boolean))].slice(0,6);
  }

  async function getRoster() {
    if (rosterCache.value) return rosterCache.value;
    if (rosterCache.promise) return rosterCache.promise;
    rosterCache.promise = fetch('/api/irish-meps').then(r => {
      if (!r.ok) throw new Error('Could not load Irish MEPs');
      return r.json();
    }).then(data => {
      rosterCache.value = (Array.isArray(data.meps) ? data.meps : []).map(m => ({ ...m, numericId: String(m.id || '').replace(/\D/g,'') }));
      return rosterCache.value;
    }).finally(() => { rosterCache.promise = null; });
    return rosterCache.promise;
  }

  async function searchVotes(query) {
    const key = String(query || '').toLowerCase();
    if (voteSearchCache.has(key)) return voteSearchCache.get(key);
    const promise = fetch('/api/data?type=votes&q=' + encodeURIComponent(query)).then(r => {
      if (!r.ok) throw new Error('Vote search failed');
      return r.json();
    }).then(data => (Array.isArray(data.results) ? data.results : []));
    voteSearchCache.set(key, promise);
    return promise;
  }

  function voteText(vote) {
    const parts = [vote?.display_title, vote?.description, vote?.reference];
    if (Array.isArray(vote?.topics)) parts.push(...vote.topics.map(t => t?.label || t?.code));
    if (Array.isArray(vote?.oeil_subjects)) parts.push(...vote.oeil_subjects.map(t => t?.label || t?.code));
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  async function findRelatedVotes(title, classification) {
    const candidates = queryCandidates(title, classification);
    const titleTokens = String(title || '').toLowerCase().replace(/[^a-z0-9áéíóúàèìòùäëïöüñ\- ]/gi,' ').split(/\s+/).filter(t => t.length >= 5 && !STOPWORDS.has(t));
    const found = new Map();

    for (const query of candidates.slice(0,3)) {
      let results = [];
      try { results = await searchVotes(query); } catch (_) { continue; }
      results.forEach(vote => {
        const d = new Date(vote.timestamp || 0);
        if (d < TERM_START || vote?.id == null) return;
        const text = voteText(vote);
        const overlap = titleTokens.filter(t => text.includes(t)).length;
        const areaMatch = classification.areas.some(area => area.words.some(w => text.includes(w.trim())));
        const score = overlap * 3 + (areaMatch ? 2 : 0) + (vote.is_main ? 1 : 0);
        if (!found.has(String(vote.id)) || found.get(String(vote.id)).score < score) found.set(String(vote.id), { vote, score });
      });
      if (found.size >= 8) break;
    }

    return [...found.values()]
      .sort((a,b) => b.score - a.score || new Date(b.vote.timestamp || 0) - new Date(a.vote.timestamp || 0))
      .slice(0,8).map(x => x.vote);
  }

  function committeeCode(c) {
    return String(c?.abbreviation || c?.code || c?.label || '').toUpperCase().trim();
  }

  function likelyCommittees(classification, relatedVotes) {
    const scores = new Map();
    classification.areas.forEach(area => area.committees.forEach((code, i) => scores.set(code, (scores.get(code) || 0) + (4 - Math.min(i,2)))));
    relatedVotes.forEach(vote => (Array.isArray(vote.responsible_committees) ? vote.responsible_committees : []).forEach(c => {
      const code = committeeCode(c);
      if (code) scores.set(code, (scores.get(code) || 0) + 4);
    }));
    return [...scores.entries()].sort((a,b) => b[1] - a[1]).slice(0,4).map(([code,score]) => ({ code, score, name: COMMITTEE_NAMES[code] || code }));
  }

  function roleWeight(role) {
    const r = String(role || '').toLowerCase();
    if (r.includes('chair') && !r.includes('vice')) return 5;
    if (r.includes('vice')) return 4;
    if (r.includes('member')) return 3;
    if (r.includes('substitute')) return 2;
    return 1;
  }

  function relevantMeps(roster, committees) {
    const codes = new Set(committees.map(c => c.code));
    return roster.map(mep => {
      const matched = (Array.isArray(mep.committees) ? mep.committees : []).filter(c => codes.has(String(c.code || '').toUpperCase()));
      const score = matched.reduce((sum,c) => sum + roleWeight(c.role),0);
      return matched.length ? { ...mep, matchedCommittees: matched, relevanceScore: score } : null;
    }).filter(Boolean).sort((a,b) => b.relevanceScore - a.relevanceScore || a.name.localeCompare(b.name)).slice(0,8);
  }

  async function getHistory(mepId) {
    if (historyCache.has(mepId)) return historyCache.get(mepId);
    const promise = fetch('/api/member-votes?id=' + encodeURIComponent(mepId)).then(r => {
      if (!r.ok) throw new Error('Member history failed');
      return r.json();
    }).then(data => Array.isArray(data.results) ? data.results : []);
    historyCache.set(mepId, promise);
    return promise;
  }

  async function enrichMeps(meps, relatedVotes) {
    const voteIds = new Set(relatedVotes.map(v => String(v.id)));
    return Promise.all(meps.map(async mep => {
      let history = [];
      try { history = await getHistory(mep.numericId); } catch (_) {}
      const positions = new Map();
      const counts = { FOR:0, AGAINST:0, ABSTENTION:0, DID_NOT_VOTE:0 };
      history.forEach(v => {
        if (!voteIds.has(String(v.id))) return;
        const p = String(v.position || '').toUpperCase();
        positions.set(String(v.id), p);
        if (Object.prototype.hasOwnProperty.call(counts,p)) counts[p]++;
      });
      const total = Object.values(counts).reduce((a,b) => a+b,0);
      const participation = pct(counts.FOR + counts.AGAINST + counts.ABSTENTION, total);
      return { ...mep, positions, counts, total, participation };
    }));
  }

  function positionClass(position) {
    if (position === 'FOR') return 'for';
    if (position === 'AGAINST') return 'against';
    if (position === 'ABSTENTION') return 'abstain';
    return 'dnv';
  }

  function positionLabel(position) {
    if (position === 'ABSTENTION') return 'ABSTAINED';
    if (position === 'DID_NOT_VOTE') return 'DID NOT VOTE';
    return position || 'NO RECORD';
  }

  function renderMep(mep) {
    const clear = mep.counts.FOR + mep.counts.AGAINST;
    const clearFor = pct(mep.counts.FOR, clear);
    const committees = mep.matchedCommittees.map(c => `${c.code} · ${c.role || 'Member'}`).join(' | ');
    const photo = mep.photo ? `<img src="${esc(mep.photo)}" alt="">` : '<div style="width:48px;height:48px;background:#eef2f6;border-radius:50%"></div>';
    return `<div class="briefing-mep">
      ${photo}
      <div><h4>${esc(mep.name)}</h4><div class="mep-meta">${esc(mep.group || '')}${mep.partyName ? ' · ' + esc(mep.partyName) : ''}</div><div class="mep-meta">${esc(committees)}</div></div>
      <div class="briefing-mep-stats">
        <div><strong>${mep.total || 0}</strong>related records</div>
        <div><strong>${mep.total ? mep.participation + '%' : '—'}</strong>participation</div>
        <div><strong>${clear ? clearFor + '%' : '—'}</strong>For when clear</div>
        <div><strong>${mep.counts.DID_NOT_VOTE || 0}</strong>did not vote</div>
      </div>
    </div>`;
  }

  function renderVote(vote, meps) {
    const date = vote.timestamp ? new Date(vote.timestamp).toLocaleDateString('en-IE') : '';
    const committees = (Array.isArray(vote.responsible_committees) ? vote.responsible_committees : []).map(c => c.abbreviation || c.code || '').filter(Boolean).join(', ');
    const title = vote.display_title || vote.description || 'European Parliament vote';
    const positions = meps.map(mep => ({ name: mep.name, p: mep.positions.get(String(vote.id)) })).filter(x => x.p).slice(0,6);
    return `<div class="briefing-vote">
      <div class="briefing-vote-meta">${esc(date)}${committees ? ' · ' + esc(committees) : ''}${vote.result ? ' · ' + esc(vote.result) : ''}</div>
      <div class="briefing-vote-title">${esc(title)}</div>
      ${positions.length ? `<div class="briefing-vote-positions">${positions.map(x => `<span class="brief-pos ${positionClass(x.p)}">${esc(x.name.split(' ').slice(-1)[0])}: ${positionLabel(x.p)}</span>`).join('')}</div>` : ''}
      <a href="https://howtheyvote.eu/votes/${encodeURIComponent(vote.id)}" target="_blank" rel="noopener">View full vote →</a>
    </div>`;
  }

  function renderBriefing(model) {
    const { title, date, likelihood, classification, committees, meps, relatedVotes } = model;
    const why = classification.areas.length
      ? classification.areas.slice(0,2).map(a => a.why).join(' ')
      : 'No strong business-policy topic match was identified from the published activity title alone. Review the source material before drawing conclusions.';
    const content = document.getElementById('upcomingBriefingContent');
    if (!content) return;
    content.innerHTML = `
      <div class="briefing-head">
        <div><div class="briefing-date">${esc(date || 'Upcoming European Parliament activity')}</div><h2>${esc(title)}</h2><div class="briefing-date">Early-warning briefing based on published Parliament activity and recorded roll-call history.</div></div>
        <button class="briefing-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="briefing-body">
        <div class="briefing-grid">
          <div class="briefing-summary gold"><span>Business relevance</span><strong>${esc(classification.relevance)}</strong></div>
          <div class="briefing-summary"><span>Vote likelihood</span><strong>${esc((likelihood || 'Unclear').replace(' VOTE LIKELIHOOD',''))}</strong></div>
          <div class="briefing-summary teal"><span>Related historic votes</span><strong>${relatedVotes.length}</strong></div>
        </div>

        <div class="briefing-section"><h3>Why this may matter for business</h3><p>${esc(why)}</p><div class="briefing-tags">${classification.areas.length ? classification.areas.map(a => `<span class="briefing-tag">${esc(a.name)}</span>`).join('') : '<span class="briefing-tag">No strong topic match</span>'}</div></div>

        <div class="briefing-section"><h3>Likely committee relevance</h3>
          ${committees.length ? `<div class="briefing-committee-list">${committees.map(c => `<div class="briefing-committee"><strong>${esc(c.code)}</strong><small>${esc(c.name)}</small></div>`).join('')}</div>` : '<div class="briefing-empty">No committee signal could be established from the title or related historic votes.</div>'}
        </div>

        <div class="briefing-section"><h3>Irish MEPs to watch</h3>
          ${meps.length ? `<div class="briefing-mep-grid">${meps.map(renderMep).join('')}</div>` : '<div class="briefing-empty">No current Irish MEP was identified on the likely committees. This does not mean no Irish MEP will engage with the issue.</div>'}
        </div>

        <div class="briefing-section"><h3>Related historic votes</h3>
          ${relatedVotes.length ? relatedVotes.map(v => renderVote(v, meps)).join('') : '<div class="briefing-empty">No sufficiently related current-term roll-call votes were found through the available search data.</div>'}
        </div>

        <div class="briefing-section"><h3>Sources</h3><div class="briefing-source-row">
          <a href="https://data.europarl.europa.eu/en" target="_blank" rel="noopener">European Parliament Open Data →</a>
          <a href="https://howtheyvote.eu" target="_blank" rel="noopener">HowTheyVote.eu →</a>
        </div></div>

        <div class="briefing-method"><strong>How this briefing is built:</strong> business relevance and policy areas are matched from the published activity title. Committee relevance combines those topic rules with responsible committees seen on related historic roll-call votes. MEP relevance is based on current committee membership. Voting history is descriptive only: a non-vote is not treated as opposition and this tool does not infer a Chambers Ireland or Eurochambres policy position.</div>
      </div>`;
    content.querySelector('.briefing-close')?.addEventListener('click', () => document.getElementById('upcomingBriefingDialog')?.close());
  }

  async function buildBriefing(card) {
    const title = card.querySelector('h3')?.textContent?.trim() || 'European Parliament activity';
    const date = card.querySelector('.meta')?.textContent?.trim() || '';
    const likelihood = card.querySelector('.tag')?.textContent?.trim() || '';
    const classification = classify(title);
    const dialog = ensureDialog();
    const content = document.getElementById('upcomingBriefingContent');
    content.innerHTML = `<div class="briefing-head"><div><div class="briefing-date">${esc(date)}</div><h2>${esc(title)}</h2></div><button class="briefing-close" type="button" aria-label="Close">×</button></div><div class="briefing-loading">Building briefing from committee and voting data…</div>`;
    content.querySelector('.briefing-close')?.addEventListener('click', () => dialog.close());
    if (!dialog.open) dialog.showModal();

    try {
      const [roster, relatedVotes] = await Promise.all([getRoster(), findRelatedVotes(title, classification)]);
      const committees = likelyCommittees(classification, relatedVotes);
      const relevant = relevantMeps(roster, committees);
      const meps = await enrichMeps(relevant, relatedVotes);
      renderBriefing({ title, date, likelihood, classification, committees, meps, relatedVotes });
    } catch (error) {
      console.error('Unable to build upcoming briefing', error);
      content.innerHTML = `<div class="briefing-head"><div><div class="briefing-date">${esc(date)}</div><h2>${esc(title)}</h2></div><button class="briefing-close" type="button" aria-label="Close">×</button></div><div class="briefing-body"><div class="briefing-empty"><strong>Unable to build this briefing right now.</strong><br>Please try again shortly.</div></div>`;
      content.querySelector('.briefing-close')?.addEventListener('click', () => dialog.close());
    }
  }

  function decorateUpcoming() {
    const root = document.getElementById('upcomingResults');
    if (!root) return;
    root.querySelectorAll('.card').forEach(card => {
      if (card.dataset.briefingReady || !card.querySelector('h3')) return;
      card.dataset.briefingReady = 'true';
      const action = document.createElement('div');
      action.className = 'upcoming-briefing-action';
      action.innerHTML = '<button type="button" class="upcoming-briefing-button">Open business briefing</button><span class="upcoming-briefing-hint">Committee relevance, Irish MEPs and related votes</span>';
      action.querySelector('button').addEventListener('click', () => buildBriefing(card));
      card.appendChild(action);
    });
  }

  addStyles();
  ensureDialog();
  const observer = new MutationObserver(decorateUpcoming);
  observer.observe(document.body, { childList:true, subtree:true });
  decorateUpcoming();
})();