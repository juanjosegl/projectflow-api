// End-to-end smoke test for the API. Run against a LOCAL seeded database only:
//   npm run db:seed && npm start, then in another shell: npm run test:smoke
// It creates throwaway users and teams.
const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failures++; };

async function call(method, path, { token, body, cookie } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
      ...(cookie && { cookie }),
    },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data, json, setCookie: res.headers.get('set-cookie') };
}
const login = async (email) => {
  const r = await call('POST', '/auth/login', { body: { email, password: 'Password123!' } });
  return { token: r.data.accessToken, cookie: r.setCookie.split(';')[0], user: r.data.user };
};

const health = await call('GET', '/health');
check('health endpoint is public', health.status === 200 && health.data.status === 'ok');

const alice = await login('alice@projectflow.dev');
const carlos = await login('carlos@projectflow.dev');
check('demo login works', !!alice.token);

// Outsider: fresh user with no teams
const email = `outsider${Date.now()}@test.dev`;
const reg = await call('POST', '/auth/register', { body: { name: 'Out Sider', email, password: 'Password123!' } });
const outsider = { token: reg.data.accessToken, cookie: reg.setCookie.split(';')[0], id: reg.data.user.id };

const teams = await call('GET', '/teams', { token: alice.token });
const teamId = teams.data[0].id;

const stats = await call('GET', `/dashboard/teams/${teamId}`, { token: alice.token });
check('team stats for member', stats.status === 200 && stats.data.totalTasks > 0, `(total ${stats.data?.totalTasks})`);
const leak = await call('GET', `/dashboard/teams/${teamId}`, { token: outsider.token });
check('team stats blocked for non-member (IDOR fix)', leak.status === 403, `(got ${leak.status})`);

// Refresh token rotation: old cookie must stop working after a refresh.
const r1 = await call('POST', '/auth/refresh', { cookie: alice.cookie });
check('refresh with current cookie', r1.status === 200 && !!r1.data.accessToken);
const r2 = await call('POST', '/auth/refresh', { cookie: alice.cookie });
check('reused (rotated) refresh token rejected', r2.status === 401, `(got ${r2.status})`);
const logoutTok = r1.data.accessToken;
const newCookie = r1.setCookie.split(';')[0];
await call('POST', '/auth/logout', { token: logoutTok });
const r3 = await call('POST', '/auth/refresh', { cookie: newCookie });
check('refresh rejected after logout', r3.status === 401, `(got ${r3.status})`);
const aliceTok = (await login('alice@projectflow.dev')).token;

// Tasks: date-only due date, assignee validation, notifications
const projectId = 'demo-project-1';
const created = await call('POST', `/projects/${projectId}/tasks`, {
  token: aliceTok, body: { title: 'Smoke test task', dueDate: '2026-12-01', assigneeId: carlos.user.id },
});
check('create task with date-only dueDate', created.status === 201, `(got ${created.status} ${JSON.stringify(created.json.message ?? '')})`);
const badAssignee = await call('POST', `/projects/${projectId}/tasks`, {
  token: aliceTok, body: { title: 'Bad assignee', assigneeId: outsider.id },
});
check('assignee outside team rejected', badAssignee.status === 400, `(got ${badAssignee.status})`);

const moved = await call('PATCH', `/tasks/${created.data.id}`, { token: aliceTok, body: { status: 'IN_REVIEW', position: 99, dueDate: null } });
check('move task + clear due date', moved.status === 200 && moved.data.status === 'IN_REVIEW' && moved.data.dueDate === null);

const notifs = await call('GET', '/notifications', { token: carlos.token });
const types = notifs.data.filter((n) => n.task?.id === created.data.id).map((n) => n.type).sort();
check('assignee notified (assigned + status changed)', types.join() === 'TASK_ASSIGNED,TASK_STATUS_CHANGED', `(${types.join()})`);
check('notification carries projectId for linking', notifs.data[0]?.task?.projectId === projectId);

const del = await call('DELETE', `/tasks/${created.data.id}`, { token: aliceTok });
check('creator can delete task', del.status === 200);

// Teams: last admin protection, decline invitation, leave
const t2 = await call('POST', '/teams', { token: outsider.token, body: { name: 'Solo Team' } });
const leaveLast = await call('DELETE', `/teams/${t2.data.id}/leave`, { token: outsider.token });
check('last admin cannot leave', leaveLast.status === 409, `(got ${leaveLast.status})`);
const inv = await call('POST', `/teams/${t2.data.id}/invite`, { token: outsider.token, body: { email: 'carlos@projectflow.dev', role: 'DEVELOPER' } });
check('invite sent', inv.status === 201, `(got ${inv.status})`);
const pub = await call('GET', `/teams/invitations/${inv.data.token}`);
check('public invitation lookup', pub.status === 200 && pub.data.team.name === 'Solo Team');
const dec = await call('POST', `/teams/invitations/${inv.data.token}/decline`, { token: carlos.token });
check('invitee can decline', dec.status === 201, `(got ${dec.status})`);
const dup = await call('POST', `/teams/${teamId}/invite`, { token: aliceTok, body: { email: 'bob@projectflow.dev', role: 'DEVELOPER' } });
check('inviting an existing member rejected', dup.status === 409, `(got ${dup.status})`);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
