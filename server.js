import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchHemisStudents, fetchHikvisionEvents } from './lib/integrations.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(root, 'data', 'events.json');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const json = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); };
const envJson = (name, fallback) => { try { return process.env[name] ? JSON.parse(process.env[name]) : fallback; } catch { throw new Error(`${name} contains invalid JSON`); } };
const config = {
  port: Number(process.env.PORT || 3000),
  token: process.env.APP_ADMIN_TOKEN || '',
  devices: envJson('HIKVISION_DEVICES', []),
  pollMs: Number(process.env.HIKVISION_POLL_MS || 15000),
  hemis: { studentsUrl: process.env.HEMIS_STUDENTS_URL, token: process.env.HEMIS_TOKEN, authHeader: process.env.HEMIS_AUTH_HEADER || 'Authorization', authPrefix: process.env.HEMIS_AUTH_PREFIX || 'Bearer', fieldMap: envJson('HEMIS_FIELD_MAP', { id: 'id', name: 'name', group: 'group', active: 'active' }) },
  hemisSyncMs: Number(process.env.HEMIS_SYNC_MS || 3600000)
};
let students = new Map();
let events = [];
let statuses = new Map(config.devices.map((device) => [device.id, { id: device.id, name: device.name, online: false, lastCheckedAt: null, error: 'Ожидание проверки' }]));

async function loadEvents() { if (existsSync(dataFile)) events = JSON.parse(await readFile(dataFile, 'utf8')); }
async function saveEvents() { await mkdir(path.dirname(dataFile), { recursive: true }); await writeFile(dataFile, JSON.stringify(events.slice(0, 10000), null, 2), { mode: 0o600 }); }
function enrich(event) { const student = students.get(event.employeeId); return { ...event, student: student ? { id: student.id, name: student.name, group: student.group } : null }; }
async function syncHemis() { const list = await fetchHemisStudents(config.hemis); students = new Map(list.map((student) => [student.id, student])); return { count: students.size, syncedAt: new Date().toISOString() }; }
async function pollHikvision() {
  const outcomes = await Promise.allSettled(config.devices.map((device) => fetchHikvisionEvents(device)));
  let received = 0;
  outcomes.forEach((outcome, index) => {
    const device = config.devices[index]; const checkedAt = new Date().toISOString();
    if (outcome.status === 'fulfilled') {
      const known = new Set(events.map((event) => event.id));
      const newEvents = outcome.value.filter((event) => !known.has(event.id));
      events = [...newEvents, ...events].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 10000);
      received += newEvents.length; statuses.set(device.id, { id: device.id, name: device.name, online: true, lastCheckedAt: checkedAt, error: null });
    } else statuses.set(device.id, { id: device.id, name: device.name, online: false, lastCheckedAt: checkedAt, error: outcome.reason.message });
  });
  await saveEvents(); return { received, devices: [...statuses.values()] };
}
function authorized(request) { return Boolean(config.token) && request.headers.authorization === `Bearer ${config.token}`; }
function serveFile(response, url) { const safePath = url.pathname === '/' ? '/index.html' : url.pathname; const file = path.join(root, safePath); if (!file.startsWith(root) || !mime[path.extname(file)]) return json(response, 404, { error: 'Not found' }); readFile(file).then((body) => { response.writeHead(200, { 'Content-Type': mime[path.extname(file)] }); response.end(body); }).catch(() => json(response, 404, { error: 'Not found' })); }
export function createApp() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (!authorized(request)) return json(response, 401, { error: 'Unauthorized' });
      if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { status: 'ok', hemisStudents: students.size, devices: [...statuses.values()] });
      if (request.method === 'GET' && url.pathname === '/api/events') { const type = url.searchParams.get('type'); return json(response, 200, events.filter((event) => !type || event.direction === type).slice(0, 100).map(enrich)); }
      try {
        if (request.method === 'POST' && url.pathname === '/api/sync/hemis') return json(response, 200, await syncHemis());
        if (request.method === 'POST' && url.pathname === '/api/poll/hikvision') return json(response, 200, await pollHikvision());
      } catch (error) { return json(response, 502, { error: error.message }); }
      return json(response, 404, { error: 'Not found' });
    }
    serveFile(response, url);
  });
}
await loadEvents();
const server = createApp();
server.listen(config.port, () => console.log(`Campus Pass is running on port ${config.port}`));
if (config.hemis.studentsUrl && config.hemis.token) { syncHemis().catch((error) => console.error(`HEMIS initial sync failed: ${error.message}`)); setInterval(() => syncHemis().catch((error) => console.error(`HEMIS sync failed: ${error.message}`)), config.hemisSyncMs).unref(); }
if (config.devices.length) { pollHikvision().catch((error) => console.error(`Hikvision initial poll failed: ${error.message}`)); setInterval(() => pollHikvision().catch((error) => console.error(`Hikvision polling failed: ${error.message}`)), config.pollMs).unref(); }
