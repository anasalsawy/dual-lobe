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
    if (wrap.classList.contains('empty-state')) { wrap.classList.remove('empty-state'); wrap.textCo