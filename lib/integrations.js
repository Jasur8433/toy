/** Normalize vendor payloads without retaining a face image or biometric template. */
export function normalizeHikvisionEvent(payload, device) {
  const event = payload?.AcsEvent ?? payload?.event ?? payload;
  const employeeId = String(event.employeeNo ?? event.cardNo ?? event.personId ?? '').trim();
  const major = Number(event.major ?? event.eventType ?? 0);
  const minor = Number(event.minor ?? event.subType ?? 0);
  const direction = event.direction === 'out' || event.direction === 'exit' || minor === 2 ? 'out' : 'in';
  return {
    id: String(event.serialNo ?? event.eventId ?? `${device.id}-${event.time ?? Date.now()}-${employeeId}`),
    occurredAt: event.time ?? event.dateTime ?? new Date().toISOString(),
    employeeId,
    direction,
    deviceId: device.id,
    deviceName: device.name,
    vendor: 'hikvision',
    rawCode: `${major}:${minor}`
  };
}

export function normalizeHemisStudent(student, fieldMap) {
  const pick = (key) => student[fieldMap[key]];
  return {
    id: String(pick('id') ?? '').trim(),
    name: String(pick('name') ?? '').trim(),
    group: String(pick('group') ?? '').trim(),
    active: pick('active') !== false
  };
}

export async function fetchHemisStudents(config, fetchImpl = fetch) {
  if (!config.studentsUrl || !config.token) throw new Error('HEMIS is not configured');
  const headers = { Accept: 'application/json' };
  headers[config.authHeader] = `${config.authPrefix} ${config.token}`.trim();
  const response = await fetchImpl(config.studentsUrl, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HEMIS responded with HTTP ${response.status}`);
  const body = await response.json();
  const items = Array.isArray(body) ? body : body.students;
  if (!Array.isArray(items)) throw new Error('HEMIS response must contain a students array');
  return items.map((student) => normalizeHemisStudent(student, config.fieldMap)).filter((student) => student.id && student.name && student.active);
}

export async function fetchHikvisionEvents(device, fetchImpl = fetch) {
  const url = new URL(device.pollPath, device.host).toString();
  const authorization = `Basic ${Buffer.from(`${device.username}:${device.password}`).toString('base64')}`;
  const response = await fetchImpl(url, { headers: { Accept: 'application/json', Authorization: authorization }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${device.name}: HTTP ${response.status}`);
  const body = await response.json();
  const events = body.AcsEventInfoList ?? body.events ?? (Array.isArray(body) ? body : [body]);
  return events.map((event) => normalizeHikvisionEvent(event, device)).filter((event) => event.employeeId);
}
