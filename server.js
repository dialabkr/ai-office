// AI Office — read-only status board for your AI agents and the programs they run.
// Node 18+, no dependencies. Binds to 127.0.0.1 only. There are no control endpoints.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, agentPose, countGroups, parsePm2, demoObservation } from './lib/status.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const CONFIG = process.env.OFFICE_CONFIG || join(ROOT, 'office.json');
const HOST = '127.0.0.1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

let cache = { at: 0, body: null };

async function loadConfig() {
  const cfg = JSON.parse(await readFile(CONFIG, 'utf8'));
  cfg.agents ??= []; cfg.projects ??= [];
  return cfg;
}

function pm2List() {
  return new Promise(resolve => {
    execFile('pm2', ['jlist'], { timeout: 5000, windowsHide: true, shell: process.platform === 'win32' }, (err, stdout) => {
      resolve(err ? null : parsePm2(stdout));
    });
  });
}

function checkHttp(url) {
  return new Promise(resolve => {
    let u;
    try { u = new URL(url); } catch { return resolve(null); }
    const lib = u.protocol === 'https:' ? import('node:https') : Promise.resolve(http);
    lib.then(mod => {
      const req = mod.request(u, { method: 'GET', timeout: 3000 }, res => {
        res.resume();
        resolve(res.statusCode && res.statusCode < 500 ? 'up' : 'down');
      });
      req.on('timeout', () => { req.destroy(); resolve('down'); });
      req.on('error', () => resolve('down'));
      req.end();
    }).catch(() => resolve(null));
  });
}

async function buildState() {
  const cfg = await loadConfig();
  const demo = cfg.demo === true;
  const pm2 = demo ? {} : (cfg.projects.some(p => p.pm2) ? await pm2List() : {});
  const projects = await Promise.all(cfg.projects.map(async (p, i) => {
    let obs;
    if (demo) obs = demoObservation(i, p);
    else obs = {
      pm2: p.pm2 ? (pm2 ? (pm2[p.pm2] ?? null) : null) : null,
      http: p.health_url ? await checkHttp(p.health_url) : null,
    };
    const { group, reason } = classify(p, obs);
    return { id: p.id, name: p.name, kind: p.kind || 'service', owner: p.owner || null, note: p.note || '', url: p.url || null,
      tasks: Array.isArray(p.tasks) ? p.tasks.slice(0, 20) : [], group, reason };
  }));
  const agents = cfg.agents.map(a => {
    const mine = projects.filter(p => p.owner === a.id);
    return { id: a.id, name: a.name, role: a.role || '', color: a.color || '#94a3b8', shape: a.shape || 'antenna',
      pose: agentPose(mine.map(p => p.group)), projects: mine.length };
  });
  return { title: cfg.title || 'AI Office', demo, checked_at: new Date().toISOString(), pm2_available: demo ? null : pm2 !== null,
    counts: countGroups(projects.map(p => p.group)), agents, projects };
}

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // Refuse anything that is not addressed to this machine (blocks DNS-rebinding).
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['127.0.0.1', 'localhost'].includes(host)) return send(res, 403, 'text/plain', 'forbidden');
  if (req.method !== 'GET') return send(res, 405, 'text/plain', 'read-only');
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/office') {
    try {
      if (!cache.body || Date.now() - cache.at > 5000) cache = { at: Date.now(), body: JSON.stringify(await buildState()) };
      return send(res, 200, TYPES['.json'], cache.body);
    } catch (e) {
      return send(res, 500, TYPES['.json'], JSON.stringify({ error: 'office.json을 읽지 못했어요: ' + e.message }));
    }
  }
  const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'text/plain', 'forbidden');
  try { send(res, 200, TYPES[extname(file)] || 'application/octet-stream', await readFile(file)); }
  catch { send(res, 404, 'text/plain', 'not found'); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = await loadConfig().catch(() => ({}));
  const port = Number(process.env.PORT || cfg.port || 4310);
  server.listen(port, HOST, () => console.log(`AI Office: http://${HOST}:${port}/`));
}

export { server, buildState };
