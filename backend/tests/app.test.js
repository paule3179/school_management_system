const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { jwtSecret } = require('../config/secrets');
const { verifyToken, isAdmin, isTeacher, isParent, isStudent, hasRole } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');
const gradeController = require('../controllers/gradeController');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('root endpoint reports API identity and version', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.version, '4.0.0');
  assert.match(body.message, /Student Data System API/);
});

test('protected user profile rejects requests without a token', async () => {
  const response = await fetch(`${baseUrl}/api/users/profile`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.match(body.error, /No token/);
});

test('protected user profile rejects an invalid token', async () => {
  const response = await fetch(`${baseUrl}/api/users/profile`, {
    headers: { authorization: 'Bearer invalid.token.value' },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, 'Invalid token.');
});

test('protected API groups reject unauthenticated requests', async () => {
  const paths = [
    '/api/students', '/api/classes', '/api/admin/classes', '/api/teachers',
    '/api/parents', '/api/grades', '/api/attendance', '/api/timetables',
    '/api/fees', '/api/exams', '/api/messages', '/api/documents',
    '/api/calendar', '/api/library', '/api/transport', '/api/inventory',
    '/api/subjects', '/api/settings', '/api/export', '/api/promotion',
    '/api/admin', '/api/dashboard', '/api/teacher/classes', '/api/parent/children',
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} should require authentication`);
  }
});

test('unknown routes return the API 404 shape', async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Route not found');
});

test('re-verifying a token preserves trusted server-loaded access context', () => {
  const token = jwt.sign({ id: 42, role: 'teacher', email: 'teacher@example.test' }, jwtSecret);
  const req = {
    headers: { authorization: `Bearer ${token}` },
    user: { allowedClassIds: [7, 12], childIds: [81] },
  };
  let nextCalled = false;
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  verifyToken(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 42);
  assert.equal(req.user.role, 'teacher');
  assert.deepEqual(req.user.allowedClassIds, [7, 12]);
  assert.deepEqual(req.user.childIds, [81]);
});

function runMiddleware(middleware, user) {
  const req = { user };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('role guards allow and reject the expected roles', () => {
  for (const [middleware, permittedRole, rejectedRole] of [
    [isAdmin, 'admin', 'teacher'],
    [isTeacher, 'teacher', 'parent'],
    [isParent, 'parent', 'student'],
    [isStudent, 'student', 'teacher'],
    [hasRole('admin', 'teacher'), 'teacher', 'parent'],
  ]) {
    const allowed = runMiddleware(middleware, { role: permittedRole });
    assert.equal(allowed.nextCalled, true, `${permittedRole} should be allowed`);

    const rejected = runMiddleware(middleware, { role: rejectedRole });
    assert.equal(rejected.nextCalled, false, `${rejectedRole} should be rejected`);
    assert.equal(rejected.res.statusCode, 403);
  }
});

function responseStub() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('attendance rejects malformed records before database access', async () => {
  const res = responseStub();
  await attendanceController.markClassAttendance({
    user: { role: 'teacher', allowedClassIds: [5] },
    body: {
      class_id: 5,
      date: '2099-12-30',
      term: 2,
      academic_year: '2099-2100',
      attendance_list: [{ student_id: 10, status: 'unknown' }],
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /invalid status/);
});

test('attendance rejects teachers outside the assigned class before database access', async () => {
  const res = responseStub();
  await attendanceController.markClassAttendance({
    user: { role: 'teacher', allowedClassIds: [4] },
    body: {
      class_id: 5,
      date: '2099-12-30',
      term: 2,
      academic_year: '2099-2100',
      attendance_list: [{ student_id: 10, status: 'present' }],
    },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /Access denied/);
});

test('grade creation rejects component scores outside 0 to 100 before database access', async () => {
  const res = responseStub();
  await gradeController.createGrade({
    user: { id: 42 },
    body: {
      student_id: 10,
      class_id: 5,
      subject: 'Mathematics',
      term: 2,
      continuous_assessment: 40,
      project_score: 20,
      exam_score: 101,
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Exam score must be a number between 0 and 100/);
});

test('grade creation rejects combined scores above 100 before database access', async () => {
  const res = responseStub();
  await gradeController.createGrade({
    user: { id: 42 },
    body: {
      student_id: 10,
      class_id: 5,
      subject: 'Mathematics',
      term: 2,
      continuous_assessment: 45,
      project_score: 20,
      exam_score: 40,
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Combined grade score cannot exceed 100/);
});
