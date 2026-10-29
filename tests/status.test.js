import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, agentPose, countGroups, parsePm2 } from '../lib/status.js';

const svc = { kind: 'service', pm2: 'app', health_url: 'http://127.0.0.1:1/' };

test('unknown is never shown as stopped', () => {
  assert.equal(classify(svc, {}).group, 'unknown');
  assert.equal(classify({ kind: 'service' }, {}).reason, '자동 확인 설정 없음');
});

test('pm2 and http combinations', () => {
  assert.equal(classify(svc, { pm2: 'online', http: 'up' }).group, 'running');
  assert.equal(classify(svc, { pm2: 'online', http: 'down' }).group, 'attention');
  assert.equal(classify(svc, { pm2: 'errored' }).group, 'attention');
  assert.equal(classify(svc, { pm2: 'stopped' }).group, 'stopped');
  assert.equal(classify(svc, { pm2: 'stopped', http: 'up' }).group, 'attention');
  assert.equal(classify({ kind: 'website', health_url: 'https://x' }, { http: 'up' }).group, 'running');
  assert.equal(classify({ kind: 'website', health_url: 'https://x' }, { http: 'down' }).group, 'attention');
  assert.equal(classify({ kind: 'planned' }, { pm2: 'errored' }).group, 'planning');
});

test('agent pose priority', () => {
  assert.equal(agentPose(['running', 'attention']), 'attention');
  assert.equal(agentPose(['running', 'stopped']), 'running');
  assert.equal(agentPose(['planning', 'planning']), 'planning');
  assert.equal(agentPose(['stopped', 'planning']), 'stopped');
  assert.equal(agentPose(['stopped', 'unknown']), 'unknown');
  assert.equal(agentPose([]), 'unknown');
});

test('pm2 jlist parsing tolerates junk', () => {
  assert.deepEqual(parsePm2('[{"name":"a","pm2_env":{"status":"online"}},{"name":"b"}]'), { a: 'online', b: null });
  assert.deepEqual(parsePm2('not json'), {});
  assert.deepEqual(countGroups(['running', 'running', 'unknown']).running, 2);
});
