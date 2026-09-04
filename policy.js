(() => {
  const TERM_START = '16 July 2024';
  let analysisLoaded = false;
  let analysisLoading = false;
  let cachedModel = null;

  const CATEGORY_RULES = [
    { name:'Competitiveness & SMEs', words:['competitiveness','small business','small and medium','sme','single market','simplification','administrative burden','late payment'] },
    { name:'Trade', words:['trade','customs','export','import','tariff','mercosur','free trade','trade agreement'] },
    { name:'Energy', words:['energy','electricity','gas market','renewable','power market','energy market'] },
    { name:'Digital', words:['digital','artificial intelligence','cyber','data act','platform','semiconductor'] },
    { name:'Employment & Skills', words:['employment','labour','worker','skills','apprenticeship','training','minimum wage'] },
    { name:'Transport', words:['transport','aviation','rail','road freight','shipping','mobility'] },
    { name:'Climate & Environment', words:['climate','emissions','carbon','environment','circular economy','nature restoration','packaging'] },
    { name:'Tax & Finance', words:['tax','taxation','vat','banking','capital markets','finance','investment','financial'] }
  ];

  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const pct = (n,d) => d ? Math.round((n/d)*1000)/10 : 0;

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .analysis-note{background:#f8fafc;border:1px solid #e4e7ec;border-radius:10px;padding:18px;margin:16px 0}
      .analysis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}
      .analysis-stat{background:white;border:1px solid #e4e7ec;border-radius:10px;padding:16px}.analysis-stat strong{display:block;font-size:24px;color:#003399;margin-bottom:4px}
      .analysis-table{width:100%;border-collapse:collapse;margin-top:14px;background:white}.analysis-table th,.analysis-table td{border-bottom:1px solid #e4e7ec;padding:10px 8px;text-align:left;font-size:13px;vertical-align:middle}.analysis-table th{color:#475467;font-size:12px}
      .participation-track{width:150px;max-width:100%;height:10px;background:#eaecf0;border-radius:20px;overflow:hidden}.participation-fill{height:100%;background:#039855;border-radius:20px}
      .position-stack{display:flex;width:210px;max-width:100%;height:12px;background:#eaecf0;border-radius:20px;overflow:hidden}.stack-for{background:#039855}.stack-against{background:#d92d20}.stack-abstain{background:#f79009}.stack-dnv{background:#98a2b3}
      .analysis-legend{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 16px;font-size:12px;color:#475467}.legend-dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
      .category-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.category-card{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px}.category-card strong{color:#003399}
      .analysis-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;align-items:center}.analysis-toolbar select{padding:9px 10px;border:1px solid #d0d5dd;border-radius:7px;background:white}
      .analysis-vote{border-top:1px solid #e4e7ec;padding:15px 0}.analysis-vote:first-child{border-top:0}.analysis-vote-title{font-weight:700;margin:4px 0 6px;line-height:1.35}
      .analysis-tags{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}.analysis-tag{display:inline-block;background:#eef4ff;color:#003399;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700}
      .vote-split{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;font-size:12px;color:#475467}.split-badge,.consensus-badge{display:inline-block;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700}.split-badge{background:#fff4e5;color:#b54708}.consensus-badge{background:#ecfdf3;color:#027a48}
      .comparison-box{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:12px;margin-top:10px}.comparison-row{display:grid;grid-template-columns:minmax(170px,1.6fr) 110px 1fr;gap:8px;padding:7px 0;border-top:1px solid #e4e7ec;align-items:center;font-size:13px}.comparison-row:first-child{border-top:0}
      .position-pill{display:inline-block;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:700;width:max-content}.p-for{background:#ecfdf3;color:#027a48}.p-against{background:#fee4e2;color:#b42318}.p-abstention{background:#fef0c7;color:#b54708}.p-dnv{background:#f2f4f7;color:#475467}.p-other{background:#eef2ff;color:#3730a3}
      @media(max-width:900px){.analysis-grid,.category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.analysis-grid,.category-grid{grid-template-columns:1fr}.analysis-table{display:block;overflow-x:auto}.comparison-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installTab(){
    const tabs=document.querySelector('.tabs'), main=document.querySelector('main');
    if(!tabs||!main||document.getElementById('mep-analysis')) return;
    const button=document.createElement('button');
    button.className='tab'; button.textContent='MEP Analysis'; button.addEventListener('click',()=>showAnalysisTab(button)); tabs.appendChild(button);
    const section=document.createElement('section');
    section.id='mep-analysis'; section.className='section';
    section.innerHTML=`<h2>Irish MEP analysis</h2><p>Automatic analysis of participation, voting behaviour, business-related topics and how Irish MEPs split on individual votes.</p><button class="primary" id="analysisRefresh">Refresh analysis</button><div id="analysisResults"><div class="loader">Open this tab to calculate the current-term analysis.</div></div>`;
    main.appendChild(section); document.getElementById('analysisRefresh').addEventListener('click',()=>loadAnalysis(true));
  }

  function showAnalysisTab(button){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active')); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('mep-analysis').classList.add('active'); button.classList.add('active'); if(!analysisLoaded) loadAnalysis();
  }

  async function fetchJson(url){ const r=await fetch(url); if(!r.ok) throw new Error(`${url} returned ${r.status}`); return r.json(); }
  async function mapWithConcurrency(items,limit,fn){ const output=new Array(items.length); let index=0; async function worker(){ while(index<items.length){ const current=index++; output[current]=await fn(items[current],current); } } await Promise.all(Array.from({length:Math.min(limit,items.length)},worker)); return output; }

  function countPositions(votes){ const c={FOR:0,AGAINST:0,ABSTENTION:0,DID_NOT_VOTE:0}; for(const v of votes){ const p=String(v?.position||'').toUpperCase(); if(Object.prototype.hasOwnProperty.call(c,p)) c[p]++; } return c; }
  function classifyVote(vote){ const fields=[vote?.display_title,vote?.description,vote?.reference]; if(Array.isArray(vote?.topics)) fields.push(...vote.topics.map(t=>t?.label||t?.code)); if(Array.isArray(vote?.oeil_subjects)) fields.push(...vote.oeil_subjects.map(t=>t?.label||t?.code)); if(Array.isArray(vote?.responsible_committees)) fields.push(...vote.responsible_committees.map(c=>c?.label||c?.code||c?.abbreviation)); const text=fields.filter(Boolean).join(' ').toLowerCase(); return CATEGORY_RULES.filter(r=>r.words.some(w=>text.includes(w))).map(r=>r.name); }
  function committeeText(vote){ return Array.isArray(vote?.responsible_committees)?vote.responsible_committees.map(c=>c?.abbreviation||c?.code||c?.label||'').filter(Boolean).join(', '):''; }
  function splitForVote(vote){ const c={FOR:0,AGAINST:0,ABSTENTION:0,DID_NOT_VOTE:0}; Object.values(vote.positions||{}).forEach(p=>{if(Object.prototype.hasOwnProperty.call(c,p)) c[p]++;}); return c; }

  function buildModel(meps,histories){
    const rows=histories.map(item=>{ const c=item.counts,total=c.FOR+c.AGAINST+c.ABSTENTION+c.DID_NOT_VOTE,participated=c.FOR+c.AGAINST+c.ABSTENTION; return {...item,total,participation:pct(participated,total),abstentionRate:pct(c.ABSTENTION,total),didNotVoteRate:pct(c.DID_NOT_VOTE,total)}; }).sort((a,b)=>b.participation-a.participation||a.mep.name.localeCompare(b.mep.name));
    const voteMap=new Map();
    for(const row of rows){ for(const vote of row.votes){ if(vote?.id==null) continue; const id=String(vote.id); if(!voteMap.has(id)) voteMap.set(id,{...vote,positions:{},categories:classifyVote(vote)}); voteMap.get(id).positions[row.mep.numericId]=String(vote.position||'UNKNOWN').toUpperCase(); } }
    const uniqueVotes=[...voteMap.values()].sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));
    const relevantVotes=uniqueVotes.filter(v=>v.categories.length); const categoryCounts=Object.fromEntries(CATEGORY_RULES.map(r=>[r.name,0]));
    relevantVotes.forEach(v=>{v.categories.forEach(cat=>categoryCounts[cat]++); v.irishSplit=splitForVote(v); v.isDivided=v.irishSplit.FOR>0&&v.irishSplit.AGAINST>0;});
    const dividedVotes=relevantVotes.filter(v=>v.isDivided).sort((a,b)=>Math.abs(a.irishSplit.FOR-a.irishSplit.AGAINST)-Math.abs(b.irishSplit.FOR-b.irishSplit.AGAINST)||new Date(b.timestamp||0)-new Date(a.timestamp||0));
    return {meps,rows,uniqueVotes,relevantVotes,categoryCounts,dividedVotes};
  }

  function positionInfo(position){ const p=String(position||'').toUpperCase(); if(p==='FOR') return {label:'FOR',cls:'p-for'}; if(p==='AGAINST') return {label:'AGAINST',cls:'p-against'}; if(p==='ABSTENTION') return {label:'ABSTAINED',cls:'p-abstention'}; if(p==='DID_NOT_VOTE') return {label:'DID NOT VOTE',cls:'p-dnv'}; return {label:p.replaceAll('_',' ')||'NO DATA',cls:'p-other'}; }
  function renderMepComparison(vote,model){ return model.meps.map(mep=>{const p=positionInfo(vote.positions[mep.numericId]); return `<div class="comparison-row"><strong>${esc(mep.name)}</strong><span class="position-pill ${p.cls}">${p.label}</span><span class="meta">${esc(mep.group||'')}</span></div>`;}).join(''); }
  function renderVote(vote,model){ const date=vote.timestamp?new Date(vote.timestamp).toLocaleDateString('en-IE'):'Date unavailable',title=vote.display_title||vote.description||'European Parliament vote',c=vote.irishSplit||splitForVote(vote),committee=committeeText(vote),compareId=`compare-${String(vote.id).replace(/[^a-zA-Z0-9_-]/g,'')}`; return `<div class="analysis-vote"><div class="meta">${esc(date)}${committee?' · '+esc(committee):''}</div><div class="analysis-vote-title">${esc(title)}</div><div class="analysis-tags">${vote.categories.map(cat=>`<span class="analysis-tag">${esc(cat)}</span>`).join('')}</div><div class="vote-split"><span><strong>${c.FOR}</strong> For</span><span><strong>${c.AGAINST}</strong> Against</span><span><strong>${c.ABSTENTION}</strong> Abstained</span><span><strong>${c.DID_NOT_VOTE}</strong> Did not vote</span>${vote.isDivided?'<span class="split-badge">Irish delegation split</span>':'<span class="consensus-badge">No For/Against split</span>'}</div><div><button class="secondary" onclick="window.toggleMepVoteComparison('${compareId}')">Compare Irish MEPs</button><a style="margin-left:10px" href="https://howtheyvote.eu/votes/${encodeURIComponent(vote.id)}" target="_blank" rel="noopener">Full vote →</a></div><div class="comparison-box" id="${compareId}" hidden>${renderMepComparison(vote,model)}</div></div>`; }
  window.toggleMepVoteComparison=id=>{const el=document.getElementById(id); if(el) el.hidden=!el.hidden;};

  function renderAnalysis(model,selectedCategory='ALL'){
    const results=document.getElementById('analysisResults'); const avg=model.rows.length?Math.round(model.rows.reduce((s,r)=>s+r.participation,0)/model.rows.length*10)/10:0; const filtered=selectedCategory==='ALL'?model.relevantVotes:model.relevantVotes.filter(v=>v.categories.includes(selectedCategory));
    results.innerHTML=`
      <div class="analysis-note"><strong>What this tab is doing</strong><p style="margin-bottom:0">Everything below is pulled automatically. There is no manual scoring and no assumption that voting For or Against is “business-friendly”. It shows the voting data, highlights business-related subjects and lets you compare Irish MEPs vote by vote.</p></div>
      <div class="analysis-grid"><div class="analysis-stat"><strong>${model.rows.length}</strong><span>Current Irish MEPs</span></div><div class="analysis-stat"><strong>${avg}%</strong><span>Average participation</span></div><div class="analysis-stat"><strong>${model.uniqueVotes.length}</strong><span>Unique roll-call votes</span></div><div class="analysis-stat"><strong>${model.relevantVotes.length}</strong><span>Business-related votes identified</span></div></div>
      <div class="card"><h3>1. Participation since ${TERM_START}</h3><p class="meta">Participation = For + Against + Abstention as a share of all recorded positions. “Did not vote” is shown separately.</p><table class="analysis-table"><thead><tr><th>MEP</th><th>Participation</th><th>Rate</th><th>Abstain</th><th>Did not vote</th><th>Recorded positions</th></tr></thead><tbody>${model.rows.map(r=>`<tr><td><strong>${esc(r.mep.name)}</strong></td><td><div class="participation-track"><div class="participation-fill" style="width:${Math.min(100,r.participation)}%"></div></div></td><td>${r.participation}%</td><td>${r.abstentionRate}%</td><td>${r.didNotVoteRate}%</td><td>${r.total}</td></tr>`).join('')}</tbody></table></div>
      <div class="card"><h3>2. Voting behaviour</h3><p class="meta">Raw distribution of each MEP's recorded roll-call positions.</p><div class="analysis-legend"><span><i class="legend-dot stack-for"></i>For</span><span><i class="legend-dot stack-against"></i>Against</span><span><i class="legend-dot stack-abstain"></i>Abstained</span><span><i class="legend-dot stack-dnv"></i>Did not vote</span></div><table class="analysis-table"><thead><tr><th>MEP</th><th>Distribution</th><th>For</th><th>Against</th><th>Abstain</th><th>Did not vote</th></tr></thead><tbody>${model.rows.map(r=>{const c=r.counts,t=r.total||1;return `<tr><td><strong>${esc(r.mep.name)}</strong></td><td><div class="position-stack"><span class="stack-for" style="width:${pct(c.FOR,t)}%"></span><span class="stack-against" style="width:${pct(c.AGAINST,t)}%"></span><span class="stack-abstain" style="width:${pct(c.ABSTENTION,t)}%"></span><span class="stack-dnv" style="width:${pct(c.DID_NOT_VOTE,t)}%"></span></div></td><td>${c.FOR}</td><td>${c.AGAINST}</td><td>${c.ABSTENTION}</td><td>${c.DID_NOT_VOTE}</td></tr>`;}).join('')}</tbody></table></div>
      <div class="card"><h3>3. Business-related subject areas</h3><p class="meta">Automatic topic matching identifies potentially relevant votes. This is classification only, not a judgement on which side is preferable.</p><div class="category-grid">${Object.entries(model.categoryCounts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="category-card"><strong>${esc(name)}</strong><div class="meta" style="margin-top:4px">${count} votes identified</div></div>`).join('')}</div></div>
      <div class="card"><h3>4. Most divided business-related votes</h3><p class="meta">Votes where at least one Irish MEP voted For and at least one voted Against.</p>${model.dividedVotes.length?model.dividedVotes.slice(0,10).map(v=>renderVote(v,model)).join(''):'<div class="meta">No split votes identified in the current dataset.</div>'}</div>
      <div class="card"><h3>5. Browse business-related votes</h3><div class="analysis-toolbar"><label for="analysisCategory"><strong>Policy area:</strong></label><select id="analysisCategory" onchange="window.changeMepAnalysisCategory(this.value)"><option value="ALL" ${selectedCategory==='ALL'?'selected':''}>All business-related votes</option>${CATEGORY_RULES.map(r=>`<option value="${esc(r.name)}" ${selectedCategory===r.name?'selected':''}>${esc(r.name)}</option>`).join('')}</select><span class="meta">${filtered.length} votes</span></div><div>${filtered.slice(0,30).map(v=>renderVote(v,model)).join('')||'<div class="meta">No matching votes found.</div>'}</div>${filtered.length>30?'<div class="meta" style="margin-top:12px">Showing the 30 most recent matching votes.</div>':''}</div>
      <div class="analysis-note"><strong>Data note</strong><p style="margin-bottom:0">This uses recorded European Parliament roll-call votes available through HowTheyVote and the current Irish MEP roster from European Parliament open data. It is not a complete record of every parliamentary action or attendance event.</p></div>`;
  }

  window.changeMepAnalysisCategory=value=>{if(cachedModel) renderAnalysis(cachedModel,value);};

  async function loadAnalysis(force=false){
    if(analysisLoading||analysisLoaded&&!force) return; analysisLoading=true; const results=document.getElementById('analysisResults'); results.innerHTML='<div class="loader">Pulling current-term Irish MEP voting data and building the analysis...</div>';
    try{ const rosterData=await fetchJson('/api/irish-meps'); const meps=(Array.isArray(rosterData.meps)?rosterData.meps:[]).map(m=>({...m,numericId:String(m.id||'').replace(/\D/g,'')})).filter(m=>m.numericId); const histories=await mapWithConcurrency(meps,4,async mep=>{const data=await fetchJson('/api/member-votes?id='+encodeURIComponent(mep.numericId)); const votes=Array.isArray(data.results)?data.results:[]; return {mep,votes,counts:countPositions(votes)};}); cachedModel=buildModel(meps,histories); renderAnalysis(cachedModel); analysisLoaded=true; }
    catch(error){console.error(error);results.innerHTML='<div class="card error"><strong>Unable to calculate MEP analysis.</strong><p>Please try the refresh button again shortly.</p></div>';}
    finally{analysisLoading=false;}
  }

  addStyles(); installTab();
})();
