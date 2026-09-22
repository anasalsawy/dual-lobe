(() => {
  'use strict';

  const cfg = window.PLAYGROUND_CONFIG || {};
  const state = {
    apiBase: sessionStorage.getItem('dl_api_base') || cfg.apiBase || '/api',
    token: sessionStorage.getItem('dl_token') || cfg.bearerToken || '',
    architectures: [],
    runAbort: null,
    compareAbort: null,
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

  function architectureDescription(id) {
    return state.architectures.find(a => a.id === id)?.description || id;
  }

  function renderArchitectureControls() {
    const select = $('runArchitecture');
    const current = select.value;
    select.innerHTML = state.architectures.map(a => `<option value="${esc(a.id)}">${esc(a.id)}</option>`).join('');
    if (current && state.architectures.some(a => a.id === current)) select.value = current;
    else if (state.architectures.some(a => a.id === 'adaptive_brain')) select.value = 'adaptive_brain';
    else if (state.architectures[0]) select.value = state.architectures[0].id;
    for (const target of ['compareArchitectureChecks','benchmarkArchitectureChecks']) {
      $(target).innerHTML = state.architectures.map(a => `<label class="check-chip" title="${esc(a.description)}"><input type="checkbox" value="${esc(a.id)}" checked> ${esc(a.id)}</label>`).join('');
    }
  }

  async function loadArchitectures() {
    const data = await fetchJson('/v1/dual-lobe/playground/architectures');
    state.architectures = data.architectures || [];
    renderArchitectureControls();
    setConnection(true, `${state.architectures.length} architectures`);
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
    const entries = [['A', `${prefix}ModelA`],['B',`${prefix}ModelB`],['ACC',`${prefix}ModelACC`],['EVIDENCE',`${prefix}ModelEvidence`],['JUDGE',`${prefix}ModelJudge`]];
    for (const [role,id] of entries) if ($(id)?.value.trim()) mapping[role] = $(id).value.trim();
    return mapping;
  }

  function resetBrain() {
    document.querySelectorAll('#brainMap .region').forEach(el => { el.classList.remove('active','recruited'); el.querySelector('.region-state').textContent = el.classList.contains('persistent') ? 'idle' : 'asleep'; });
  }
  function activateRole(role, stateText='active') {
    document.querySelectorAll('#brainMap .region').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`#brainMap .region[data-role="${CSS.escape(role || '')}"]`);
    if (el) { el.classList.add('active'); el.querySelector('.region-state').textContent = stateText; if (role==='ACC'||role==='EVIDENCE') el.classList.add('recruited'); }
  }

  function actorClass(actor) { return ['A','B','ACC','EVIDENCE'].includes(actor) ? `actor-${actor}` : 'system'; }
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
    else if (e.type === 'final') { $('runFinal').classList.remove('empty-state'); $('runFinal').textContent = e.content || ''; addRunEvent({type:'final',actor:'A',content:'Final answer produced.'}); }
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
    for (const role of r.recruited || []) { const el=document.querySelector(`#brainMap .region[data-role="${CSS.escape(role)}"]`); if(el) el.classList.add('recruited'); }
    document.querySelectorAll('#brainMap .region').forEach(el => { el.classList.remove('active'); el.querySelector('.region-state').textContent = el.classList.contains('recruited') ? 'recruited' : (el.classList.contains('persistent') ? 'complete':'asleep'); });
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
    const body = {task, messages, architecture:$('runArchitecture').value, role_models:roleModels(), judge:$('runJudge').value==='true', fuse_max_calls:num($('runFuseCalls').value,40), fuse_wall_seconds:num($('runFuseSeconds').value,300), stream:true};
    try { await postSSE('/v1/dual-lobe/playground/run', body, state.runAbort.signal, applyRunEvent); }
    catch(e) { if (e.name !== 'AbortError') showError('runError', e); }
    finally { $('runBtn').disabled=false; $('stopRunBtn').disabled=true; state.runAbort=null; stopTimer(); }
  }

  function selectedChecks(containerId) { return [...$(containerId).querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value); }
  function laneFor(name) {
    let lane = document.querySelector(`#compareLanes .lane[data-variant="${CSS.escape(name)}"]`);
    if (!lane) {
      if ($('compareLanes').classList.contains('empty-state')) { $('compareLanes').classList.remove('empty-state'); $('compareLanes').textContent=''; }
      lane=document.createElement('div'); lane.className='lane'; lane.dataset.variant=name; lane.innerHTML=`<div class="section-head"><h3>${esc(name)}</h3><span class="pill neutral">running</span></div><div class="lane-events"></div><div class="lane-final"></div>`; $('compareLanes').appendChild(lane);
    }
    return lane;
  }
  function applyCompareEvent(e) {
    if (e.type === 'comparison_result') return renderComparison(e.result);
    if (!e.variant) return;
    const lane=laneFor(e.variant); const events=lane.querySelector('.lane-events');
    if (['participant_move','completion_proposed','completion_confirmed','completion_reopened','final','circuit_breaker'].includes(e.type)) {
      const row=document.createElement('div'); row.className='lane-event'; row.innerHTML=`<strong>${esc(e.actor || e.type)}</strong> <span class="muted">${esc(e.type)}</span><br>${esc(eventMessage(e)).slice(0,900)}`; events.appendChild(row); events.scrollTop=events.scrollHeight;
    }
  }
  function renderComparison(r) {
    const results=r?.results || {};
    for (const [name,item] of Object.en