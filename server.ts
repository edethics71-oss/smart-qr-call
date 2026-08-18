import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------------------------------------------------
// PERSISTENT FILE-BASED DATA STORE
// Keeps data across server restarts & synchronizes across all devices
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'school_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface SchoolDatabase {
  teachers: any[];
  students: any[];
  calls: any[];
  teacherCalls: any[];
  notices: any[];
  attendance: any[];
  workNotes: any[];
}

// Initial clean seed: starts completely empty (0 teachers, 0 students, 0 calls)
const initialDatabase: SchoolDatabase = {
  teachers: [],
  students: [],
  calls: [],
  teacherCalls: [],
  notices: [],
  attendance: [],
  workNotes: [],
};

function loadDatabase(): SchoolDatabase {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : initialDatabase.teachers,
        students: Array.isArray(parsed.students) ? parsed.students : initialDatabase.students,
        calls: Array.isArray(parsed.calls) ? parsed.calls : initialDatabase.calls,
        teacherCalls: Array.isArray(parsed.teacherCalls) ? parsed.teacherCalls : initialDatabase.teacherCalls,
        notices: Array.isArray(parsed.notices) ? parsed.notices : initialDatabase.notices,
        attendance: Array.isArray(parsed.attendance) ? parsed.attendance : initialDatabase.attendance,
        workNotes: Array.isArray(parsed.workNotes) ? parsed.workNotes : initialDatabase.workNotes,
      };
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  saveDatabase(initialDatabase);
  return initialDatabase;
}

function saveDatabase(db: SchoolDatabase) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

let db = loadDatabase();

// -------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE)
// Instant live synchronization across mobile smartphones & teacher PCs
// -------------------------------------------------------------
const sseClients: express.Response[] = [];

function broadcastEvent(type: string, data?: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// -------------------------------------------------------------
// 1. TEACHERS API
// -------------------------------------------------------------
app.get('/api/teachers', (req, res) => {
  const { room } = req.query;
  let result = db.teachers;
  if (room && typeof room === 'string') {
    result = result.filter((t) => t.room === room);
  }
  res.json(result);
});

app.post('/api/teachers', (req, res) => {
  const newTeacher = {
    id: `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    createdAt: Date.now(),
  };
  db.teachers.push(newTeacher);
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json(newTeacher);
});

app.post('/api/teachers/batch', (req, res) => {
  const { teachers } = req.body;
  if (!Array.isArray(teachers)) {
    return res.status(400).json({ error: 'Invalid teachers data' });
  }
  const added = teachers.map((t: any) => ({
    id: t.id || `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...t,
    createdAt: t.createdAt || Date.now(),
  }));
  db.teachers = [...db.teachers, ...added];
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json({ count: added.length, teachers: db.teachers });
});

app.post('/api/teachers/replace-batch', (req, res) => {
  const { teachers } = req.body;
  if (!Array.isArray(teachers)) {
    return res.status(400).json({ error: 'Invalid teachers data' });
  }
  const replaced = teachers.map((t: any) => ({
    id: t.id || `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...t,
    createdAt: t.createdAt || Date.now(),
  }));
  db.teachers = replaced;
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json({ count: replaced.length, teachers: db.teachers });
});

app.post('/api/teachers/reset-default', (req, res) => {
  db.teachers = initialDatabase.teachers;
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json({ success: true, teachers: db.teachers });
});

app.delete('/api/teachers/all', (req, res) => {
  db.teachers = [];
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json({ success: true });
});

app.put('/api/teachers/:id', (req, res) => {
  const { id } = req.params;
  const index = db.teachers.findIndex((t) => t.id === id);
  if (index !== -1) {
    db.teachers[index] = { ...db.teachers[index], ...req.body };
    saveDatabase(db);
    broadcastEvent('TEACHERS_UPDATED', db.teachers);
    res.json(db.teachers[index]);
  } else {
    res.status(404).json({ error: 'Teacher not found' });
  }
});

app.delete('/api/teachers/:id', (req, res) => {
  const { id } = req.params;
  db.teachers = db.teachers.filter((t) => t.id !== id);
  saveDatabase(db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 2. STUDENTS API (Roster, Bulk Import, Dynamic Filters)
// -------------------------------------------------------------
app.get('/api/students', (req, res) => {
  res.json(db.students);
});

app.post('/api/students', (req, res) => {
  const newStudent = {
    id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    createdAt: Date.now(),
  };
  db.students.push(newStudent);
  saveDatabase(db);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  res.json(newStudent);
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const index = db.students.findIndex((s) => s.id === id);
  if (index !== -1) {
    db.students[index] = { ...db.students[index], ...req.body };
    saveDatabase(db);
    broadcastEvent('STUDENTS_UPDATED', db.students);
    res.json(db.students[index]);
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  db.students = db.students.filter((s) => s.id !== id);
  saveDatabase(db);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  res.json({ success: true });
});

app.post('/api/students/bulk', (req, res) => {
  const { students, options } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid students data' });
  }

  let list = db.students;
  if (options?.clearTargetClassesFirst) {
    const targetGradesAndClasses = new Set<string>();
    students.forEach((s: any) => {
      targetGradesAndClasses.add(`${s.grade}-${s.classNum}`);
    });
    list = list.filter((s) => !targetGradesAndClasses.has(`${s.grade}-${s.classNum}`));
  }

  const addedStudents = students.map((s: any) => ({
    id: s.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...s,
    createdAt: s.createdAt || Date.now(),
  }));

  db.students = [...list, ...addedStudents];
  saveDatabase(db);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  res.json({ count: addedStudents.length });
});

app.delete('/api/students/grade/:grade', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  db.students = db.students.filter((s) => s.grade !== grade);
  saveDatabase(db);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  res.json({ success: true });
});

app.delete('/api/students/class/:grade/:classNum', (req, res) => {
  const grade = parseInt(req.params.grade, 10);
  const classNum = parseInt(req.params.classNum, 10);
  db.students = db.students.filter((s) => !(s.grade === grade && s.classNum === classNum));
  saveDatabase(db);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 3. STUDENT CALLS (학생 교무실 방문 호출)
// -------------------------------------------------------------
app.get('/api/calls', (req, res) => {
  const { room, status } = req.query;
  let result = db.calls;
  if (room && typeof room === 'string') {
    result = result.filter((c) => c.room === room);
  }
  if (status && typeof status === 'string') {
    result = result.filter((c) => c.status === status);
  }
  res.json(result);
});

app.post('/api/calls', (req, res) => {
  const newCall = {
    id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    timestamp: Date.now(),
    status: 'calling',
  };
  db.calls.unshift(newCall);
  saveDatabase(db);
  broadcastEvent('CALLS_UPDATED', db.calls);
  res.json(newCall);
});

app.put('/api/calls/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const index = db.calls.findIndex((c) => c.id === id);
  if (index !== -1) {
    db.calls[index].status = status;
    saveDatabase(db);
    broadcastEvent('CALLS_UPDATED', db.calls);
    res.json(db.calls[index]);
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

app.put('/api/calls/:id/memo', (req, res) => {
  const { id } = req.params;
  const { memo } = req.body;
  const index = db.calls.findIndex((c) => c.id === id);
  if (index !== -1) {
    db.calls[index].memo = memo;
    saveDatabase(db);
    broadcastEvent('CALLS_UPDATED', db.calls);
    res.json(db.calls[index]);
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

app.delete('/api/calls/:id', (req, res) => {
  const { id } = req.params;
  db.calls = db.calls.filter((c) => c.id !== id);
  saveDatabase(db);
  broadcastEvent('CALLS_UPDATED', db.calls);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 4. TEACHER TO STUDENT CALLS (선생님 -> 학생 호출 & 전달)
// -------------------------------------------------------------
app.get('/api/teacher-calls', (req, res) => {
  res.json(db.teacherCalls);
});

app.post('/api/teacher-calls', (req, res) => {
  const newCall = {
    id: `tcall-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    createdAt: Date.now(),
    isConfirmed: false,
  };
  db.teacherCalls.unshift(newCall);
  saveDatabase(db);
  broadcastEvent('TEACHER_CALLS_UPDATED', db.teacherCalls);
  res.json(newCall);
});

app.put('/api/teacher-calls/:id/confirm', (req, res) => {
  const { id } = req.params;
  const index = db.teacherCalls.findIndex((c) => c.id === id);
  if (index !== -1) {
    db.teacherCalls[index].isConfirmed = true;
    db.teacherCalls[index].confirmedAt = Date.now();
    saveDatabase(db);
    broadcastEvent('TEACHER_CALLS_UPDATED', db.teacherCalls);
    res.json(db.teacherCalls[index]);
  } else {
    res.status(404).json({ error: 'Call not found' });
  }
});

app.delete('/api/teacher-calls/:id', (req, res) => {
  const { id } = req.params;
  db.teacherCalls = db.teacherCalls.filter((c) => c.id !== id);
  saveDatabase(db);
  broadcastEvent('TEACHER_CALLS_UPDATED', db.teacherCalls);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 5. SCHOOL NOTICES (학교 공지사항)
// -------------------------------------------------------------
app.get('/api/notices', (req, res) => {
  res.json(db.notices);
});

app.post('/api/notices', (req, res) => {
  const newNotice = {
    id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    confirmedStudentIds: req.body.confirmedStudentIds || [],
    createdAt: Date.now(),
  };
  db.notices.unshift(newNotice);
  saveDatabase(db);
  broadcastEvent('NOTICES_UPDATED', db.notices);
  res.json(newNotice);
});

app.post('/api/notices/:id/confirm', (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;
  const notice = db.notices.find((n) => n.id === id);
  if (notice) {
    if (!notice.confirmedStudentIds) notice.confirmedStudentIds = [];
    if (!notice.confirmedStudentIds.includes(studentId)) {
      notice.confirmedStudentIds.push(studentId);
      saveDatabase(db);
      broadcastEvent('NOTICES_UPDATED', db.notices);
    }
    res.json(notice);
  } else {
    res.status(404).json({ error: 'Notice not found' });
  }
});

app.delete('/api/notices/:id', (req, res) => {
  const { id } = req.params;
  db.notices = db.notices.filter((n) => n.id !== id);
  saveDatabase(db);
  broadcastEvent('NOTICES_UPDATED', db.notices);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 6. ATTENDANCE (출결 관리)
// -------------------------------------------------------------
app.get('/api/attendance', (req, res) => {
  const { date } = req.query;
  let result = db.attendance;
  if (date && typeof date === 'string') {
    result = result.filter((a) => a.date === date);
  }
  res.json(result);
});

app.post('/api/attendance', (req, res) => {
  const { grade, classNum, studentNumber, date } = req.body;
  const existingIdx = db.attendance.findIndex(
    (a) => a.grade === grade && a.classNum === classNum && a.studentNumber === studentNumber && a.date === date
  );
  if (existingIdx !== -1) {
    db.attendance[existingIdx] = { ...db.attendance[existingIdx], ...req.body, updatedAt: Date.now() };
    saveDatabase(db);
    broadcastEvent('ATTENDANCE_UPDATED', db.attendance);
    return res.json(db.attendance[existingIdx]);
  }
  const newRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    updatedAt: Date.now(),
  };
  db.attendance.push(newRecord);
  saveDatabase(db);
  broadcastEvent('ATTENDANCE_UPDATED', db.attendance);
  res.json(newRecord);
});

// -------------------------------------------------------------
// 7. WORK NOTES (교원 업무 수합 & 투표)
// -------------------------------------------------------------
app.get('/api/work-notes', (req, res) => {
  res.json(db.workNotes);
});

app.post('/api/work-notes', (req, res) => {
  const newNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...req.body,
    responses: req.body.responses || {},
    createdAt: Date.now(),
  };
  db.workNotes.unshift(newNote);
  saveDatabase(db);
  broadcastEvent('WORK_NOTES_UPDATED', db.workNotes);
  res.json(newNote);
});

app.put('/api/work-notes/:id/response', (req, res) => {
  const { id } = req.params;
  const { key, response } = req.body;
  const note = db.workNotes.find((n) => n.id === id);
  if (note) {
    if (!note.responses) note.responses = {};
    note.responses[key] = { ...response, updatedAt: Date.now() };
    saveDatabase(db);
    broadcastEvent('WORK_NOTES_UPDATED', db.workNotes);
    res.json(note);
  } else {
    res.status(404).json({ error: 'Work note not found' });
  }
});

app.delete('/api/work-notes/:id', (req, res) => {
  const { id } = req.params;
  db.workNotes = db.workNotes.filter((n) => n.id !== id);
  saveDatabase(db);
  broadcastEvent('WORK_NOTES_UPDATED', db.workNotes);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 8. SYSTEM RESET TO CLEAN SLATE (원점에서 전체 초기화)
// -------------------------------------------------------------
app.post('/api/system/reset-clean-slate', (req, res) => {
  const { keepTeachers } = req.body;
  db = {
    teachers: keepTeachers ? db.teachers : [],
    students: [],
    calls: [],
    teacherCalls: [],
    notices: [],
    attendance: [],
    workNotes: [],
  };
  saveDatabase(db);
  broadcastEvent('SYSTEM_RESET', db);
  broadcastEvent('TEACHERS_UPDATED', db.teachers);
  broadcastEvent('STUDENTS_UPDATED', db.students);
  broadcastEvent('CALLS_UPDATED', db.calls);
  broadcastEvent('TEACHER_CALLS_UPDATED', db.teacherCalls);
  broadcastEvent('NOTICES_UPDATED', db.notices);
  broadcastEvent('ATTENDANCE_UPDATED', db.attendance);
  broadcastEvent('WORK_NOTES_UPDATED', db.workNotes);
  res.json({ success: true, message: 'Clean slate initial state ready' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SPA SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduPass Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
