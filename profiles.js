(() => {
  const TERM_START = new Date('2024-07-16T00:00:00');
  let cache = null;
  let loading = null;

  const profileState = {
    mep: '',
    area: 'ALL',
    period: 'TERM'
  };

  const POLICY_AREAS = [
    { name:'Competitiveness & SMEs', words:['competitiveness','small business','small and medium','sme','single market','simplification','administrative burden','late payment'], committees:['IMCO','ITRE','REGI','ECON'] },
    { name:'Trade', words:['trade','customs','export','import','tariff','mercosur','free trade','trade agreement'], committees:['INTA'] },
    { name:'Energy', words:['energy','electricity','gas market','renewable','power market','energy market'], committees:['ITRE','ENVI'] },
    { name:'Digital', words:['digital','artificial intelligence','cyber','data act','platform','semiconductor'], committees:['ITRE','IMCO'] },
    { name:'Employment & Skills', words:['employment','labour','worker','skills','apprenticeship','training','minimum wage'], committees:['EMPL'] },
    { name:'Transport', words:['transport','aviation','rail','road freight','shipping','mobility'], committees:['TRAN'] },
    { name:'Climate & Environment', words:['climate','emissions','carbon','environment','circular economy','nature restoration','packaging'], committees:['ENVI'] },
    { name:'Tax & Finance', words:['tax','taxation','vat','banking','capital markets','finance','investment','financial'], committees:['ECON','FISC'] },
    { name:'Agriculture & Food', words:['agriculture','agricultural','farmer','farming','food','cereal','livestock','rural'], committees:['AGRI'] },
    { name:'Health', words:['health','public health','medicine','medicinal','pharmaceutical','disease','cancer'], committees:['SANT','ENVI'] },
    { name:'Foreign Affairs & Security', words:['foreign policy','defence','defense','security','ukraine','russia','middle east','sanctions','human rights'], committees:['AFET','SEDE','DROI'] },
    { name:'Regional Development & Housing', words:['regional development','cohesion','housing','affordable housing','rural development'], committees:['REGI','HOUS'] }
  ];

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const pct = (n,d) => d ? Math.round((n / d) * 1000) / 10 : 0;

  function addStyles() {
    if (document.getElementById('mepProfileStyles')) return;
    const style = document.createElement('style');
    style.id = 'mepProfileStyles';
    style.textContent = `
      .profile-shell{margin-top:14px}.profile-controls{background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:16px;margin-bottom:16px}
      .profile-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}.profile-stat{background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:15px}.profile-stat strong{display:block;font-size:22px;color:#003399}.profile-stat span{font-size:12px;color:#667085}
      .profile-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.profile-card{background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:18px}.profile-card h3{margin-top:0}.profile-card h4{margin:16px 0 8px}
      .profile-area-row{display:grid;grid-template-columns:minmax(170px,1.4fr) 90px 90px 90px 110px 90px;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #eaecf0;font-size:12px}.profile-area-row:first-child{border-top:0}.profile-area-row.header{font-weight:700;color:#667085;font-size:11px}
      .profile-strength{display:inline-block;border-radius:5px;padding:4px 7px;font-size:10px;font-weight:800}.strength-high{background:#ecfdf3;color:#027a48}.strength-medium{background:#fff4e5;color:#b54708}.strength-low{background:#f2f4f7;color:#475467}
      .profile-interest{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.profile-chip{background:#eef4ff;color:#003399;border-radius:5px;padding:5px 8px;font-size:11px;font-weight:700}.profile-chip.committee{background:#f4f3ff;color:#6941c6}
      .profile-pattern{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px;margin:10px 0;font-size:13px;line-height:1.45}.profile-warning{background:#fffaeb;border:1px solid #fedf89;border-radius:8px;padding:12px;font-size:12px;line-height:1.45;color:#7a2e0e}
      .profile-vote{padding:10px 0;border-top:1px solid #eaecf0}.profile-vote:first-child{border-top:0}.profile-vote-title{font-weight:700;font-size:13px;margin:3px 0}.profile-meta{font-size:11px;color:#667085}.profile-pill{display:inline-block;border-radius:5px;padding:4px 7px;font-size:10px;font-weight:800}.profile-for{background:#ecfdf3;color:#027a48}.profile-against{background:#fee4e2;color:#b42318}.profile-abstain{background:#fef0c7;color:#b54708}.profile-dnv{background:#f2f4f7;color:#475467}
      .profile-area-button{border:0;background:transparent;color:#003399;padding:0;font-weight:700;text-align:left;cursor:pointer}.profile-area-button:hover{text-decoration:underline}.profile-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
      @media(max-width:900px){.profile-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.profile-grid,.profile-two-col{grid-template-columns:1fr}.profile-area-row{grid-template-columns:minmax(150px,1fr) 70px 70px 80px}.profile-area-row>*:nth-child(5),.profile-area-row>*:nth-child(6){display:none}}
      @media(max-width:650px){.profile-summary{grid-template-columns:1fr}.profile-area-row{grid-template-columns:1fr 65px 65px}.profile-area-row>*:nth-child(4){display:none}}
    `;
    document.head.appendChild(style);
  }

  function classifyVote(vote) {
    const committees = Array.isArray(vote?.responsible_committees)
      ? vote.responsible_committees.map(c => String(c?.abbreviation || c?.code || c?.label || '').toUpperCase())
      : [];
    const fields = [vote?.display_title, vote?.description, vote?.reference];
    if (Array.isArray(vote?.topics)) fields.push(...vote.topics.map(t => t?.label || t?.code));
    if (Array.isArray(vote?.oeil_subjects)) fields.push(...vote.oeil_subjects.map(t => t?.label || t?.code));
    const text = fields.filter(Boolean).join(' ').toLowerCase();
    return POLICY_AREAS
      .filter(area => area.words.some(w => text.includes(w)) || area.committees.some(c => committees.includes(c)))
      .map(area => area.name);
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  async function mapWithConcurrency(items, limit, fn) {
    const output = new Array(items.length);
    let index = 0;
    async function worker() {
      while (index < items.length) {
        const current = index++;
        try { output[current] = await fn(items[current]); }
        catch (error) { console.warn('Profile data item failed', error); output[current] = null; }
      }
    }
    await Promise.all(Array.from({length:Math.min(limit,items.length)}, worker));
    return output.filter(Boolean);
  }

  async function loadProfileData() {
    if (cache) return cache;
    if (loading) return loading;
    loading = (async () => {
      const roster = await fetchJson('/api/irish-meps');
      const meps = (Array.isArray(roster.meps) ? roster.meps : [])
        .map(m => ({...m, numericId:String(m.id || '').replace(/\D/g,'')}))
        .filter(m => m.numericId);
      const histories = await mapWithConcurrency(meps, 4, async mep => {
        const data = await fetchJson('/api/member-votes?id=' + encodeURIComponent(mep.numericId));
        return {mep, votes:Array.isArray(data.results) ? data.results : []};
      });

      const voteMap = new Map();
      histories.forEach(({mep,votes}) => votes.forEach(vote => {
        if (vote?.id == null) return;
        const id = String(vote.id);
        if (!voteMap.has(id)) voteMap.set(id, {...vote, positions:{}, areas:classifyVote(vote)});
        voteMap.get(id).positions[mep.numericId] = String(vote.position || 'UNKNOWN').toUpperCase();
      }));
      cache = {meps, votes:[...voteMap.values()].sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0))};
      if (!profileState.mep && meps.length) profileState.mep = meps.slice().sort((a,b)=>a.name.localeCompare(b.name))[0].numericId;
      return cache;
    })();
    try { return await loading; } finally { loading = null; }
  }

  function periodRange() {
    const now = new Date();
    if (profileState.period === '2026') return [new Date('2026-01-01T00:00:00'), now];
    if (profileState.period === '2025') return [new Date('2025-01-01T00:00:00'), new Date('2025-12-31T23:59:59')];
    if (profileState.period === '12M') { const d=new Date(now); d.setFullYear(d.getFullYear()-1); return [d,now]; }
    return [TERM_START, now];
  }

  function votesInPeriod(data) {
    const [start,end] = periodRange();
    return data.votes.filter(v => { const d=new Date(v.timestamp||0); return d>=start && d<=end; });
  }

  function countsFor(votes, mepId) {
    const c={FOR:0,AGAINST:0,ABSTENTION:0,DID_NOT_VOTE:0};
    votes.forEach(v=>{const p=v.positions?.[mepId]; if(Object.prototype.hasOwnProperty.call(c,p)) c[p]++;});
    return c;
  }

  function evidenceStrength(c, committeeLinked) {
    const directional = c.FOR + c.AGAINST;
    const total = directional + c.ABSTENTION + c.DID_NOT_VOTE;
    const noVote = pct(c.DID_NOT_VOTE,total);
    if ((directional >= 12 && noVote < 35) || (committeeLinked && directional >= 8)) return ['Strong','strength-high'];
    if (directional >= 5 || (committeeLinked && directional >= 3)) return ['Moderate','strength-medium'];
    return ['Limited','strength-low'];
  }

  function patternText(c) {
    const directional = c.FOR + c.AGAINST;
    const total = directional + c.ABSTENTION + c.DID_NOT_VOTE;
    if (!total) return 'No recorded votes in this area for the selected period.';
    const noVote = pct(c.DID_NOT_VOTE,total);
    if (noVote >= 50) return `Often did not vote (${noVote}%). That means the record gives limited evidence of a settled view.`;
    if (directional < 5) return 'There are too few clear For/Against positions to infer a consistent voting tendency.';
    const forShare = pct(c.FOR,directional);
    if (forShare >= 75) return `When taking a clear position, this MEP usually voted FOR measures in this area (${forShare}% of clear positions). This describes voting direction, not whether the measures themselves were pro- or anti-business.`;
    if (forShare <= 25) return `When taking a clear position, this MEP usually voted AGAINST measures in this area (${100-forShare}% of clear positions). This describes voting direction, not the underlying ideology of the measures.`;
    return `Mixed voting pattern: ${forShare}% For and ${100-forShare}% Against among clear positions. The record does not point to one simple directional tendency.`;
  }

  function committeeAreas(mep) {
    const result = new Set();
    (Array.isArray(mep.committees)?mep.committees:[]).forEach(c => {
      const code=String(c.code||'').toUpperCase();
      POLICY_AREAS.forEach(a=>{if(a.committees.includes(code)) result.add(a.name);});
    });
    return result;
  }

  function areaRows(data, mep, votes) {
    const committeeFocus = committeeAreas(mep);
    return POLICY_AREAS.map(area => {
      const areaVotes=votes.filter(v=>v.areas.includes(area.name));
      const c=countsFor(areaVotes,mep.numericId);
      const total=c.FOR+c.AGAINST+c.ABSTENTION+c.DID_NOT_VOTE;
      const directional=c.FOR+c.AGAINST;
      const participation=pct(c.FOR+c.AGAINST+c.ABSTENTION,total);
      const noVote=pct(c.DID_NOT_VOTE,total);
      const linked=committeeFocus.has(area.name);
      const [strength,strengthClass]=evidenceStrength(c,linked);
      const score=directional + (linked?10:0) + participation/20;
      return {area:area.name,c,total,directional,participation,noVote,linked,strength,strengthClass,score};
    }).filter(r=>r.total>0 || r.linked).sort((a,b)=>b.score-a.score || b.total-a.total);
  }

  function majorityPosition(vote, selectedId) {
    let forCount=0, againstCount=0;
    Object.entries(vote.positions||{}).forEach(([id,p])=>{
      if(id===selectedId) return;
      if(p==='FOR') forCount++;
      if(p==='AGAINST') againstCount++;
    });
    if (forCount+againstCount < 4 || forCount===againstCount) return null;
    return {position:forCount>againstCount?'FOR':'AGAINST',forCount,againstCount,margin:Math.abs(forCount-againstCount)};
  }

  function distinctiveVotes(votes,mepId,area) {
    return votes.filter(v => area==='ALL' || v.areas.includes(area)).map(v=>{
      const actual=v.positions?.[mepId];
      if(actual!=='FOR' && actual!=='AGAINST') return null;
      const majority=majorityPosition(v,mepId);
      if(!majority || majority.position===actual) return null;
      return {v,actual,majority};
    }).filter(Boolean).sort((a,b)=>b.majority.margin-a.majority.margin || new Date(b.v.timestamp||0)-new Date(a.v.timestamp||0)).slice(0,8);
  }

  function recentClearVotes(votes,mepId,area) {
    return votes.filter(v => (area==='ALL' || v.areas.includes(area)) && ['FOR','AGAINST'].includes(v.positions?.[mepId])).slice(0,10);
  }

  function pill(position) {
    if(position==='FOR') return '<span class="profile-pill profile-for">FOR</span>';
    if(position==='AGAINST') return '<span class="profile-pill profile-against">AGAINST</span>';
    if(position==='ABSTENTION') return '<span class="profile-pill profile-abstain">ABSTAINED</span>';
    return '<span class="profile-pill profile-dnv">DID NOT VOTE</span>';
  }

  function renderVote(v,mepId,extra='') {
    const title=v.display_title||v.description||'European Parliament vote';
    const date=v.timestamp?new Date(v.timestamp).toLocaleDateString('en-IE'):'';
    return `<div class="profile-vote"><div>${pill(v.positions?.[mepId])}</div><div class="profile-vote-title">${esc(title)}</div><div class="profile-meta">${esc(date)}${extra?' · '+esc(extra):''}</div><div class="profile-meta" style="margin-top:4px"><a href="https://howtheyvote.eu/votes/${encodeURIComponent(v.id)}" target="_blank" rel="noopener">View full vote →</a></div></div>`;
  }

  function renderProfiles(data) {
    const panel=document.getElementById('mepProfilePanel');
    if(!panel) return;
    const mep=data.meps.find(m=>m.numericId===profileState.mep) || data.meps[0];
    if(!mep) { panel.innerHTML='<div class="card error">No MEP profile data available.</div>'; return; }
    profileState.mep=mep.numericId;
    const periodVotes=votesInPeriod(data);
    const allCounts=countsFor(periodVotes,mep.numericId);
    const allTotal=allCounts.FOR+allCounts.AGAINST+allCounts.ABSTENTION+allCounts.DID_NOT_VOTE;
    const participation=pct(allCounts.FOR+allCounts.AGAINST+allCounts.ABSTENTION,allTotal);
    const noVote=pct(allCounts.DID_NOT_VOTE,allTotal);
    const clear=allCounts.FOR+allCounts.AGAINST;
    const rows=areaRows(data,mep,periodVotes);
    const selectedArea=profileState.area;
    const selectedRow=selectedArea==='ALL'?null:rows.find(r=>r.area===selectedArea);
    const committeeList=(Array.isArray(mep.committees)?mep.committees:[]);
    const distinctive=distinctiveVotes(periodVotes,mep.numericId,selectedArea);
    const recent=recentClearVotes(periodVotes,mep.numericId,selectedArea);
    const noVoteAreas=rows.filter(r=>r.total>=5).sort((a,b)=>b.noVote-a.noVote).slice(0,4);

    panel.innerHTML=`
      <div class="profile-shell">
        <div class="profile-controls">
          <div class="control-grid">
            <div class="control-field"><label>Irish MEP</label><select id="profileMep">${data.meps.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`<option value="${esc(m.numericId)}" ${m.numericId===mep.numericId?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
            <div class="control-field"><label>Period</label><select id="profilePeriod"><option value="TERM" ${profileState.period==='TERM'?'selected':''}>Current term</option><option value="2026" ${profileState.period==='2026'?'selected':''}>2026</option><option value="2025" ${profileState.period==='2025'?'selected':''}>2025</option><option value="12M" ${profileState.period==='12M'?'selected':''}>Last 12 months</option></select></div>
            <div class="control-field"><label>Policy area detail</label><select id="profileArea"><option value="ALL">All policy areas</option>${POLICY_AREAS.map(a=>`<option value="${esc(a.name)}" ${a.name===selectedArea?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
          </div>
        </div>

        <div class="analysis-note"><strong>How to read this profile</strong><div>A non-vote is treated as missing evidence, not as support or opposition. The profile only describes what the recorded votes show. Where an MEP often does not vote, the app lowers the evidence strength instead of guessing their view.</div></div>

        <div class="analysis-section-title"><div><h3>${esc(mep.name)} — policy profile</h3><div class="small-meta">${esc(mep.group||'')}</div></div></div>
        <div class="profile-interest">${committeeList.map(c=>`<span class="profile-chip committee">${esc(c.code||'')} · ${esc(c.role||'Member')}</span>`).join('') || '<span class="small-meta">No current committee roles returned.</span>'}</div>

        <div class="profile-summary">
          <div class="profile-stat"><strong>${participation}%</strong><span>Recorded participation</span></div>
          <div class="profile-stat"><strong>${clear}</strong><span>Clear For/Against positions</span></div>
          <div class="profile-stat"><strong>${noVote}%</strong><span>Did not vote</span></div>
          <div class="profile-stat"><strong>${committeeList.length}</strong><span>Current committee roles</span></div>
        </div>

        <div class="profile-grid">
          <div class="profile-card">
            <h3>Strongest areas of evidence</h3>
            <div class="small-meta">Ranked using clear voting activity plus current committee responsibilities. This is a signal of where we have the best evidence, not a claim about personal motivation.</div>
            <div class="profile-area-row header"><span>Area</span><span>Clear votes</span><span>Partic.</span><span>No vote</span><span>Pattern</span><span>Evidence</span></div>
            ${rows.slice(0,10).map(r=>`<div class="profile-area-row"><button class="profile-area-button" data-profile-area="${esc(r.area)}">${esc(r.area)}${r.linked?' *':''}</button><span>${r.directional}</span><span>${r.participation}%</span><span>${r.noVote}%</span><span>${r.directional?`${pct(r.c.FOR,r.directional)}% For`:'—'}</span><span><i class="profile-strength ${r.strengthClass}">${r.strength}</i></span></div>`).join('') || '<div class="empty-state">No policy-area evidence found.</div>'}
            <div class="small-meta" style="margin-top:8px">* linked to a current committee role.</div>
          </div>

          <div class="profile-card">
            <h3>${selectedRow?esc(selectedRow.area):'Overall engagement pattern'}</h3>
            <div class="profile-pattern">${selectedRow?esc(patternText(selectedRow.c)):(noVote>=35?`This MEP did not vote on ${noVote}% of recorded roll calls in the selected period, so any attempt to describe their views should be treated cautiously.`:`This MEP participated in ${participation}% of recorded roll calls in the selected period. Use the policy areas on the left to see where the evidence is strongest or weakest.`)}</div>
            ${selectedRow?`<div class="profile-interest"><span class="profile-chip">${selectedRow.c.FOR} For</span><span class="profile-chip">${selectedRow.c.AGAINST} Against</span><span class="profile-chip">${selectedRow.c.ABSTENTION} Abstained</span><span class="profile-chip">${selectedRow.c.DID_NOT_VOTE} Did not vote</span></div>`:''}
            <h4>Areas where non-voting limits the evidence</h4>
            ${noVoteAreas.map(r=>`<div class="profile-vote"><div class="profile-vote-title">${esc(r.area)}</div><div class="profile-meta">Did not vote on ${r.noVote}% of ${r.total} recorded votes · evidence ${r.strength.toLowerCase()}</div></div>`).join('') || '<div class="small-meta">No significant non-voting pattern identified.</div>'}
          </div>
        </div>

        <div class="profile-two-col">
          <div class="profile-card"><h3>Distinctive votes</h3><div class="small-meta">Votes where this MEP took the opposite clear position to the majority of other Irish MEPs. These are often the most useful votes for understanding what differentiates them.</div>${distinctive.length?distinctive.map(x=>renderVote(x.v,mep.numericId,`Other Irish MEPs: ${x.majority.forCount} For / ${x.majority.againstCount} Against`)).join(''):'<div class="empty-state">No distinctive clear votes found for this selection.</div>'}</div>
          <div class="profile-card"><h3>Recent clear positions</h3><div class="small-meta">The latest For/Against votes in the selected policy area. Reading these vote titles gives the safest route to understanding the substance of the MEP's position.</div>${recent.length?recent.map(v=>renderVote(v,mep.numericId,(v.areas||[]).join(' · '))).join(''):'<div class="empty-state">No recent clear positions found.</div>'}</div>
        </div>
      </div>`;

    document.getElementById('profileMep')?.addEventListener('change',e=>{profileState.mep=e.target.value;renderProfiles(data);});
    document.getElementById('profilePeriod')?.addEventListener('change',e=>{profileState.period=e.target.value;renderProfiles(data);});
    document.getElementById('profileArea')?.addEventListener('change',e=>{profileState.area=e.target.value;renderProfiles(data);});
    panel.querySelectorAll('[data-profile-area]').forEach(btn=>btn.addEventListener('click',()=>{profileState.area=btn.dataset.profileArea;renderProfiles(data);}));
  }

  async function showProfiles() {
    const results=document.getElementById('analysisResults');
    const subnav=document.getElementById('analysisSubnav');
    if(!results||!subnav) return;
    const currentMep=document.getElementById('analysisMep')?.value;
    if(currentMep && currentMep!=='ALL') profileState.mep=currentMep;

    [...results.children].forEach(child=>{ if(child!==subnav) child.hidden=true; });
    let panel=document.getElementById('mepProfilePanel');
    if(!panel){ panel=document.createElement('div'); panel.id='mepProfilePanel'; results.appendChild(panel); }
    panel.hidden=false;
    panel.innerHTML='<div class="loader">Building evidence-based MEP profiles from current-term voting histories...</div>';
    try { const data=await loadProfileData(); renderProfiles(data); }
    catch(error){ console.error(error); panel.innerHTML='<div class="card error"><strong>Unable to build MEP profiles.</strong><p>Please try again shortly.</p></div>'; }
  }

  function ensureProfileButton() {
    const nav=document.getElementById('analysisSubnav');
    if(!nav || nav.querySelector('[data-profile-view]')) return;
    const button=document.createElement('button');
    button.dataset.profileView='true';
    button.textContent='MEP profiles';
    button.addEventListener('click',()=>{
      nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      button.classList.add('active');
      showProfiles();
    });
    const votesBtn=nav.querySelector('[data-view="votes"]');
    if(votesBtn) nav.insertBefore(button,votesBtn); else nav.appendChild(button);
  }

  addStyles();
  const observer=new MutationObserver(()=>ensureProfileButton());
  observer.observe(document.body,{childList:true,subtree:true});
  ensureProfileButton();
})();
