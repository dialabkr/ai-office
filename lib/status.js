// Status rules. Pure functions so they are easy to test.
// Golden rule: "unknown" (we could not observe it) is never shown as "stopped".

export const GROUPS = ['running', 'stopped', 'attention', 'unknown', 'planning'];

/**
 * @param {object} project  entry from office.json
 * @param {object} obs      { pm2: 'online'|'stopped'|'errored'|'launching'|null, http: 'up'|'down'|null }
 * @returns {{group: string, reason: string}}
 */
export function classify(project, obs = {}) {
  if (project.kind === 'planned') return { group: 'planning', reason: '계획 단계' };
  const pm2 = obs.pm2 ?? null;
  const http = obs.http ?? null;
  if (pm2 === 'errored') return { group: 'attention', reason: 'PM2: 오류로 멈춤' };
  if (pm2 === 'launching') return { group: 'attention', reason: 'PM2: 시작 중' };
  if (pm2 === 'online' && http === 'down') return { group: 'attention', reason: '실행 중인데 응답 없음' };
  if (pm2 === 'online') return { group: 'running', reason: http === 'up' ? '실행 중 · 응답 정상' : '실행 중' };
  if (pm2 === 'stopped') return http === 'up'
    ? { group: 'attention', reason: 'PM2는 중지인데 다른 곳에서 응답 중' }
    : { group: 'stopped', reason: 'PM2: 중지' };
  if (http === 'up') return { group: 'running', reason: '응답 정상' };
  if (http === 'down') return { group: 'attention', reason: '응답 없음' };
  return { group: 'unknown', reason: project.pm2 || project.health_url ? '상태를 확인하지 못함' : '자동 확인 설정 없음' };
}

/** One robot per agent. Pose comes from the projects it owns. */
export function agentPose(groups) {
  if (!groups.length) return 'unknown';
  if (groups.includes('attention')) return 'attention';
  if (groups.includes('running')) return 'running';
  if (groups.every(g => g === 'planning')) return 'planning';
  if (groups.every(g => g === 'stopped' || g === 'planning')) return 'stopped';
  return 'unknown';
}

export function countGroups(groups) {
  const c = Object.fromEntries(GROUPS.map(g => [g, 0]));
  for (const g of groups) if (g in c) c[g]++;
  return c;
}

/** Map `pm2 jlist` output to { name: status }. */
export function parsePm2(jsonText) {
  const out = {};
  let list;
  try { list = JSON.parse(jsonText); } catch { return out; }
  if (!Array.isArray(list)) return out;
  for (const p of list) if (p && p.name) out[p.name] = p.pm2_env?.status ?? null;
  return out;
}

const DEMO = { 0: { pm2: 'online', http: 'up' }, 1: { pm2: 'errored' }, 2: { pm2: 'stopped' }, 3: {} };
/** Demo mode: show every pose without real services. */
export function demoObservation(index, project) {
  if (project.kind === 'website') return index % 2 ? { http: 'up' } : {};
  return DEMO[index % 4];
}
