import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchHemisStudents, normalizeHikvisionEvent } from '../lib/integrations.js';

test('normalizes Hikvision access event and keeps no biometric payload', () => {
  const event = normalizeHikvisionEvent({ AcsEvent: { serialNo: 81, employeeNo: 'HEMIS-42', time: '2026-09-22T08:30:00+05:00', direction: 'exit', faceImage: 'must-not-be-copied' } }, { id: 'gate-a', name: 'Корпус А' });
  assert.deepEqual(event, { id: '81', occurredAt: '2026-09-22T08:30:00+05:00', employeeId: 'HEMIS-42', direction: 'out', deviceId: 'gate-a', deviceName: 'Корпус А', vendor: 'hikvision', rawCode: '0:0' });
});

test('maps only active HEMIS students using configured fields', async () => {
  const mockFetch = async () => new Response(JSON.stringify({ students: [{ student_id: 7, fio: 'Алия Алиева', cohort: 'ИТ-21', enabled: true }, { student_id: 8, fio: 'Неактивный', cohort: 'ИТ-22', enabled: false }] }), { status: 200 });
  const students = await fetchHemisStudents({ studentsUrl: 'https://hemis.example/students', token: 'test', authHeader: 'Authorization', authPrefix: 'Bearer', fieldMap: { id: 'student_id', name: 'fio', group: 'cohort', active: 'enabled' } }, mockFetch);
  assert.deepEqual(students, [{ id: '7', name: 'Алия Алиева', group: 'ИТ-21', active: true }]);
});
