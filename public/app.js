import { robotSVG } from './robot.js';

const LABEL = { running: '실행 중', stopped: '중지', attention: '확인 필요', unknown: '미확인', planning: '계획' };
const POSE_TEXT = { running: '일하는 중', stopped: '쉬는 중', attention: '도움 필요', unknown: '상태 모름', planning: '구상 중' };
const KIND = { service: '로컬 프로그램', website: '웹사이트', planned: '계획' };
const ORDER = ['ALL', 'attention', 'running', 'stopped', 'unknown', 'planning'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let state = null, filter = 'ALL', timer = null;

// "Reduce motion" preference (per browser).
try { $('calm').checked = localStorage.getItem('office-calm') === '1'; } catch {}
const applyCalm = () => document.documentElement.dataset.calm = $('calm').checked ? '1' : '0';
$('calm').addEventListener('change', () => { applyCalm(); try { localStorage.setItem('office-calm', $('calm').checked ? '1' : '0'); } catch {} });
applyCalm();

function agentOf(id) { return state?.agents.find(a => a.id === id); }

function renderAgents() {
  $('agents').innerHTML = state.agents.length ? state.agents.map(a => `
    <div class="agent" data-pose="${a.pose}">
      ${robotSVG({ color: a.color, shape: a.shape, pose: a.pose, size: 84 })}
      <strong>${esc(a.name)}</strong>
      <span class="muted">${esc(a.role)}</span>
      <span class="pill" data-g="${a.pose}">${POSE_TEXT[a.pose]} · ${a.projects}건</span>
    </div>`).join('') : '<p class="muted">office.json에 agents를 추가해 보세요.</p>';
}

function renderFilters() {
  $('filters').innerHTML = ORDER.map(g => {
    const n = g === 'ALL' ? state.projects.length : state.counts[g];
    return `<button type="button" data-f="${g}" aria-pressed="${filter === g}"${g !== 'ALL' ? ` data-g="${g}"` : ''}>${g === 'ALL' ? '전체' : LABEL[g]} <b>${n}</b></button>`;
  }).join('');
}

function renderProjects() {
  const list = state.projects.filter(p => filter === 'ALL' || p.group === filter);
  $('empty').hidden = list.length > 0;
  $('projects').innerHTML = list.map(p => {
    const a = agentOf(p.owner);
    return `<button type="button" class="card" data-id="${esc(p.id)}" data-g="${p.group}">
      <span class="card-top"><span class="status">${LABEL[p.group]}</span><span class="kind">${KIND[p.kind] || esc(p.kind)}</span></span>
      <span class="name">${esc(p.name)}</span>
      <span class="reason">${esc(p.reason)}</span>
      ${p.note ? `<span class="note">${esc(p.note)}</span>` : ''}
      <span class="owner">${a ? robotSVG({ color: a.color, shape: a.shape, pose: p.group, size: 28 }) + esc(a.name) : '담당 없음'}</span>
    </button>`;
  }).join('');
}

function openDetail(id) {
  const p = state.projects.find(x => x.id === id);
  if (!p) return;
  const a = agentOf(p.owner);
  const link = p.url && /^https?:\/\//.test(p.url) ? `<p><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">열기 ↗</a></p>` : '';
  $('d-body').innerHTML = `
    <div class="d-head">${a ? robotSVG({ color: a.color, shape: a.shape, pose: p.group, size: 72 }) : ''}
      <div><h3 id="d-name">${esc(p.name)}</h3><span class="pill" data-g="${p.group}">${LABEL[p.group]}</span> <span class="muted">${esc(p.reason)}</span></div></div>
    <p>${esc(p.note) || '<span class="muted">메모 없음</span>'}</p>
    <dl><dt>종류</dt><dd>${KIND[p.kind] || esc(p.kind)}</dd><dt>담당</dt><dd>${a ? esc(a.name) + ' · ' + esc(a.role) : '없음'}</dd></dl>
    ${p.tasks.length ? `<h4>할 일</h4><ul>${p.tasks.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${link}`;
  $('detail').showModal();
}

function render() {
  document.title = state.title;
  $('title').textContent = state.title;
  $('demo').hidden = !state.demo;
  renderAgents(); renderFilters(); renderProjects();
  const t = new Date(state.checked_at);
  $('checked').textContent = '마지막 확인 ' + t.toLocaleTimeString('ko-KR') + (state.pm2_available === false ? ' · PM2를 찾지 못해 PM2 항목은 미확인' : '');
}

async function load() {
  try {
    const r = await fetch('/api/office', { cache: 'no-store' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    state = data; render();
  } catch (e) {
    $('checked').textContent = '상태를 불러오지 못했어요: ' + e.message;
  }
}

$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-f]');
  if (!b || !state) return;
  filter = b.dataset.f; renderFilters(); renderProjects();
});
$('projects').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openDetail(c.dataset.id); });

// Poll only while the tab is visible; pause animations when hidden.
function sync() {
  clearInterval(timer);
  document.documentElement.dataset.hidden = document.hidden ? '1' : '0';
  if (!document.hidden) { load(); timer = setInterval(load, 5000); }
}
document.addEventListener('visibilitychange', sync);
sync();
