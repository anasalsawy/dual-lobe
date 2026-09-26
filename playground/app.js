(() => {
  'use strict';

  const cfg = window.PLAYGROUND_CONFIG || {};
  const state = {
    apiBase: sessionStorage.getItem('dl_api_base') || cfg.apiBase || '/api',
    token: sessionStorage.getItem('dl_token') || cfg.bearerToken || '',
    architectures: [],
    runAbort: null,
    benchmarkAbort: null,
    runStartedAt: null,
    timerHandle: null,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const fmtMs = (v) => v == null ? '—' : `${(Number(v)/1000).toFixed(Number(v) < 10000 ? 2 : 1)}s`;
  const fmtNum = (v) => v == null ? '—' : Intl.NumberFormat().format(Math.round(Number(v)));

  function headers(json = true) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (state.token) h.Authorization = `Bearer ${state.token}`;
    return h;
  }

  function api(path) { return state.apiBase.replace(/\/$/, '') + path; }

  async function fetchJson(path, options = {}) {
    const res = await fetch(api(path), {...options, headers: {...headers(Boolean(options.body)), ...(options.headers || {})}});
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = {raw:text}; }
    if (!res.ok) throw new Error(data?.detail || data?.error || `${res.status} ${res.statusText}`);
    return data;
  }

  async function postSSE(path, body, signal, onEvent) {
    const res = await fetch(api(path), {method:'POST', headers:headers(true), body:JSON.stringify(body), signal});
    if (!res.ok) {
      const t = await res.text();
      let d; try { d = JSON.parse(t); } catch { d = null; }
      throw new Error(d?.detail || d?.error || `${res.status} ${res.statusText}`);
    }
    if (!res.body) throw new Error('Streaming response body unavailable in this browser.');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream:true});
      let cut;
      while ((cut = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);
        const dataLines = block.split(/\r?\n/).filter(x => x.startsWith('data:')).map(x => x.slice(5).trim());
        if (!dataLines.length) continue;
        const raw = dataLines.join('\n');
        try { onEvent(JSON.parse(raw)); } catch (err) { console.warn('Bad SSE payload', raw, err); }
      }
    }
  }

  function showError(id, err) {
    const el = $(id); el.textContent = err?.message || String(err); el.classList.remove('hidden');
  }
  function clearError(id) { const el=$(id); el.textContent=''; el.classList.add('hidden'); }

  function setConnection(ok, text) {
    const pill = $('connectionPill');
    pill.textContent = text;
    pill.className = `pill ${ok ? 'good' : 'bad'}`;
  }

  function activeArchitectureId() {
    const preferred = ['split', 'self_split', 'self-split', 'dual_lobe', 'dual-lobe'];
    for (const id of preferred) {
      if (state.architectures.some(a => a.id === id)) return id;
    }
    return state.architectures[0]?.id || 'split';
  }

  function renderArchitectureControls() {
    const target = $('benchmarkArchitectureChecks');
    if (target) {
      const id = activeArchitectureId();
      target.innerHTML = `<label class="check-chip"><input type="checkbox" value="${esc(id)}" checked> Dual-Lobe</label>`;
    }
  }

  async function loadArchitectures() {
    const data = await fetchJson('/v1/dual-lobe/playground/architectures');
    state.architectures = data.architectures || [];
    renderArchitectureControls();
    setConnection(true, state.architectures.length ? 'Dual-Lobe connected' : 'Connected');
  }

  function parseMessages(id) {
    const raw = $(id).value.trim();
    if (!raw) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Source messages must be a JSON array.');
    return value;
  }

  function roleModels(prefix='run') {
    const mapping = {};
    const entries = [['A', `${prefix}ModelA`],['B',`${prefix}ModelB`],['JUDGE',`${prefix}ModelJudge`]];
    for (const [role,id] of entries) if ($(id)?.value.trim()) mapping[role] = $(id).value.trim();
    return mapping;
  }

  function resetBrain() {
    document.querySelectorAll('#brainMap .region').forEach(el => { el.classList.remove('active','recruited'); el.querySelector('.region-state').textContent = el.classList.contains('persistent') ? 'idle' : 'asleep'; });
  }
  function activateRole(role, stateText='active') {
    document.querySelectorAll('#brainMap .region').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`#brainMap .region[data-role="${CSS.escape(role || '')}"]`);
    if (el) { el.classList.add('active'); el.querySelector('.region-state').textContent = stateText; }
  }

  function actorClass(actor) { return ['A','B'].includes(actor) ? `actor-${actor}` : 'system'; }
  function eventMessage(e) {
    return e.message || e.content || e.basis || e.reason || (e.result ? JSON.stringify(e.result, null, 2) : '');
  }
  function addRunEvent(e) {
    const wrap = $('runEvents');
    if (wrap.classList.contains('empty-state')) { wrap.classList.remove('empty-state'); wrap.textContent=''; }
    const actor = e.actor || 'SYSTEM';
    const card = document.createElement('div');
    card.className = `event-card ${actorClass(actor)}`;
    card.innerHTML = `<div class="event-top"><span class="actor">${esc(actor)}</span><span class="event-kind">${esc(e.type || 'event')}</span></div><div class="message">${esc(eventMessage(e))}</div>`;
    wrap.appendChild(card); wrap.scrollTop = wrap.scrollHeight;
    $('eventCount').textContent = `${wrap.children.length} events`;
  }

  function renderJudge(j) {
    const card = $('judgeCard');
    if (!j || j.available === false) { card.classList.add('hidden'); return; }
    const dims = ['overall','task_success','instruction_coverage','evidence_discipline','efficiency'];
    card.innerHTML = `<div class="section-head"><strong>Independent judge</strong><span class="pill neutral">${esc(j.overall ?? '—')}</span></div><div class="judge-grid">${dims.map(k => `<div><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(j[k] ?? '—')}</strong></div>`).join('')}</div>${j.rationale ? `<p class="hint">${esc(j.rationale)}</p>`:''}`;
    card.classList.remove('hidden');
  }

  function applyRunEvent(e) {
    if (e.actor) activateRole(e.actor, e.type === 'participant_move' ? 'working' : 'active');
    if (e.type === 'run_start') resetBrain();
    if (e.type === 'participant_move') addRunEvent(e);
    else if (e.type === 'completion_proposed' || e.type === 'completion_confirmed' || e.type === 'completion_reopened' || e.type === 'circuit_breaker') addRunEvent(e);
    else if (e.type === 'final') { $('runFinal').classList.remove('empty-state'); $('runFinal').textContent = e.content || ''; addRunEvent({type:'final',actor:'B',content:'Canonical answer emitted after reconvergence and verification.'}); }
    else if (e.type === 'judge') renderJudge(e.result);
    else if (e.type === 'result') renderRunResult(e.result);
  }

  function renderRunResult(r) {
    if (!r) return;
    $('runFinal').classList.remove('empty-state'); $('runFinal').textContent = r.final_answer || '';
    renderJudge(r.judge);
    const t = r.telemetry || {};
    const boxes = $('runTelemetry').children;
    boxes[0].querySelector('strong').textContent = fmtNum(t.calls);
    boxes[1].querySelector('strong').textContent = fmtNum(t.total_tokens ?? (num(t.prompt_tokens)+num(t.completion_tokens)));
    boxes[2].querySelector('strong').textContent = fmtMs(t.elapsed_ms);
    boxes[3].querySelector('strong').textContent = r.judge?.overall ?? '—';
    document.querySelectorAll('#brainMap .region').forEach(el => { el.classList.remove('active'); el.querySelector('.region-state').textContent = 'complete'; });
  }

  function startTimer() {
    state.runStartedAt = performance.now(); clearInterval(state.timerHandle);
    state.timerHandle = setInterval(() => { $('runTimer').textContent = `${((performance.now()-state.runStartedAt)/1000).toFixed(1)}s`; }, 100);
  }
  function stopTimer() { clearInterval(state.timerHandle); state.timerHandle=null; }

  async function runOne() {
    clearError('runError');
    const task = $('runTask').value.trim(); if (!task) return showError('runError', new Error('Enter a task first.'));
    let messages; try { messages = parseMessages('runMessages'); } catch(e) { return showError('runError', e); }
    $('runEvents').className='event-stream empty-state'; $('runEvents').textContent='Connecting…'; $('eventCount').textContent='0 events';
    $('runFinal').className='final-answer empty-state'; $('runFinal').textContent='Waiting for convergence…'; $('judgeCard').classList.add('hidden'); resetBrain();
    $('runBtn').disabled=true; $('stopRunBtn').disabled=false; state.runAbort = new AbortController(); startTimer();
    const body = {task, messages, architecture:activeArchitectureId(), role_models:roleModels(), judge:$('runJudge').value==='true', fuse_max_calls:num($('runFuseCalls').value,40), fuse_wall_seconds:num($('runFuseSeconds').value,300), stream:true};
    try { await postSSE('/v1/dual-lobe/playground/run', body, state.runAbort.signal, applyRunEvent); }
    catch(e) { if (e.name !== 'AbortError') showError('runError', e); }
    finally { $('runBtn').disabled=false; $('stopRunBtn').disabled=true; state.runAbort=null; stopTimer(); }
  }

  function benchmarkDefault() {
    return JSON.stringify([
      {id:'debug-1',task:'Diagnose a malformed tool-call history without guessing. Identify what evidence would distinguish producer corruption from proxy corruption.',messages:[]},
      {id:'evidence-1',task:'An agent says it deployed successfully. Decide whether that claim is actually proven from the supplied evidence and state what remains missing.',messages:[{role:'tool',content:'Build completed successfully.'}]},
      {id:'ambiguity-1',task:'Plan a safe implementation for an underspecified feature. Do not invent missing product constraints; surface the uncertainty and still make useful progress.',messages:[]},
      {id:'easy-1',task:'Explain what an HTTP 422 response means in two concise paragraphs.',messages:[]}
    ], null, 2);
  }
  function applyBenchmarkEvent(e) {
    if (e.type==='benchmark_result') return renderBenchmark(e.result);
    const wrap=$('benchmarkLive'); if(wrap.classList.contains('empty-state')){wrap.classList.remove('empty-state');wrap.textContent='';}
    if(['participant_move','completion_proposed','completion_confirmed','run_end','circuit_breaker'].includes(e.type)){
      const row=document.createElement('div'); row.className=`event-card ${actorClass(e.actor)}`; row.innerHTML=`<div class="event-top"><span class="actor">${esc(e.case_id||'case')} · ${esc(e.variant||'')}</span><span class="event-kind">${esc(e.type)}</span></div><div class="message">${esc(eventMessage(e)).slice(0,900)}</div>`; wrap.appendChild(row);wrap.scrollTop=wrap.scrollHeight;
      $('benchmarkProgress').textContent=`${esc(e.case_id||'running')} · ${esc(e.variant||'')}`;
    }
  }
  function renderBenchmark(r) {
    const aggregate=r?.aggregate||{}; const ranking=r?.leaderboard||Object.keys(aggregate);
    $('benchmarkProgress').textContent='complete'; $('benchmarkProgress').className='pill good'; $('benchmarkLeaderboard').classList.remove('empty-state');
    $('benchmarkLeaderboard').innerHTML=`<table class="leader-table"><thead><tr><th>Rank</th><th>Model</th><th>Judge mean</th><th>Error</th><th>Calls</th><th>Latency</th><th>Tokens</th><th>Evidence</th></tr></thead><tbody>${ranking.map((name,i)=>{const x=aggregate[name]||{};return `<tr><td class="rank">#${i+1}</td><td>${esc(name)}</td><td>${x.judge_overall_mean==null?'—':Number(x.judge_overall_mean).toFixed(2)}</td><td>${x.error_rate==null?'—':(100*x.error_rate).toFixed(1)+'%'}</td><td>${x.mean_calls==null?'—':Number(x.mean_calls).toFixed(1)}</td><td>${fmtMs(x.mean_latency_ms)}</td><td>${x.mean_total_tokens==null?'—':fmtNum(x.mean_total_tokens)}</td><td>${x.dimensions?.evidence_discipline==null?'—':Number(x.dimensions.evidence_discipline).toFixed(2)}</td></tr>`}).join('')}</tbody></table><p class="hint">${esc(r.warning||'')}</p>`;
  }
  async function runBenchmark() {
    clearError('benchmarkError'); let cases; try { cases=JSON.parse($('benchmarkCases').value); if(!Array.isArray(cases)||!cases.length)throw new Error('Cases must be a non-empty JSON array.'); } catch(e){return showError('benchmarkError',e)}
    const architectures=[activeArchitectureId()];
    $('benchmarkLive').className='event-stream empty-state';$('benchmarkLive').textContent='Starting benchmark…';$('benchmarkLeaderboard').className='empty-state';$('benchmarkLeaderboard').textContent='Waiting for aggregate results…';$('benchmarkProgress').textContent='running';$('benchmarkProgress').className='pill neutral';
    $('benchmarkBtn').disabled=true;$('stopBenchmarkBtn').disabled=false;state.benchmarkAbort=new AbortController();
    const body={cases,architectures,repeat:num($('benchmarkRepeat').value,1),judge:$('benchmarkJudge').value==='true',role_models:{},fuse_max_calls:40,fuse_wall_seconds:300,stream:true};
    try{await postSSE('/v1/dual-lobe/playground/benchmark',body,state.benchmarkAbort.signal,applyBenchmarkEvent)}catch(e){if(e.name!=='AbortError')showError('benchmarkError',e)}finally{$('benchmarkBtn').disabled=false;$('stopBenchmarkBtn').disabled=true;state.benchmarkAbort=null}
  }

  function bindTabs(){document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${btn.dataset.tab}`));}));}
  function bindSettings(){const d=$('settingsDialog');$('settingsBtn').addEventListener('click',()=>{$('apiBaseInput').value=state.apiBase;$('tokenInput').value=state.token;clearError('settingsError');d.showModal();});$('saveSettingsBtn').addEventListener('click',()=>{state.apiBase=$('apiBaseInput').value.trim()||'/api';state.token=$('tokenInput').value.trim();sessionStorage.setItem('dl_api_base',state.apiBase);sessionStorage.setItem('dl_token',state.token);d.close();loadArchitectures().catch(e=>setConnection(false,e.message));});$('testConnectionBtn').addEventListener('click',async()=>{const oldBase=state.apiBase,oldToken=state.token;state.apiBase=$('apiBaseInput').value.trim()||'/api';state.token=$('tokenInput').value.trim();try{await loadArchitectures();clearError('settingsError')}catch(e){showError('settingsError',e)}finally{state.apiBase=oldBase;state.token=oldToken}});}

  function init() {
    $('appTitle').textContent = cfg.title || 'One model. Two lobes. One verified answer.';
    $('benchmarkCases').value = benchmarkDefault();
    bindTabs(); bindSettings();
    $('runBtn').addEventListener('click',runOne); $('stopRunBtn').addEventListener('click',()=>state.runAbort?.abort()); $('clearRunBtn').addEventListener('click',()=>{$('runEvents').className='event-stream empty-state';$('runEvents').textContent='Start a run to watch A split work with B, then reconverge through verification.';$('runFinal').className='final-answer empty-state';$('runFinal').textContent='The converged final answer will appear here.';$('judgeCard').classList.add('hidden');resetBrain();});
    $('benchmarkBtn').addEventListener('click',runBenchmark); $('stopBenchmarkBtn').addEventListener('click',()=>state.benchmarkAbort?.abort());
    loadArchitectures().catch(e=>setConnection(false,e.message));
  }
  init();
})();
