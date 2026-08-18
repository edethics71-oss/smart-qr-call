import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  Teacher,
  Call,
  CallStatus,
  TeacherCallToStudent,
  SchoolNotice,
  StudentAttendance,
  TeacherWorkNote,
  WorkNoteResponse,
  StudentRecord,
} from '../types';

// Read Firebase configurations from Vite environment variables (if provided)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestore = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

// -------------------------------------------------------------
// LOCALSTORAGE FALLBACK KEYS
// -------------------------------------------------------------
const STORAGE_TEACHERS_KEY = 'smart_qr_teachers';
const STORAGE_CALLS_KEY = 'smart_qr_calls';
const STORAGE_TEACHER_CALLS_KEY = 'smart_qr_teacher_to_student_calls';
const STORAGE_NOTICES_KEY = 'smart_qr_school_notices';
const STORAGE_ATTENDANCE_KEY = 'smart_qr_attendance';
const STORAGE_WORK_NOTES_KEY = 'smart_qr_work_notes';
const STORAGE_STUDENTS_KEY = 'smart_qr_student_roster';

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function saveLocal<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Failed to save ${key} in localStorage:`, err);
  }
}

// -------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER
// Connects phone browsers & desktop teacher clients in real-time
// -------------------------------------------------------------
type EventCallback = (data?: any) => void;
const eventListeners: { [eventType: string]: EventCallback[] } = {};

function onServerEvent(eventType: string, cb: EventCallback) {
  if (!eventListeners[eventType]) {
    eventListeners[eventType] = [];
  }
  eventListeners[eventType].push(cb);
  return () => {
    eventListeners[eventType] = eventListeners[eventType].filter((fn) => fn !== cb);
  };
}

let eventSource: EventSource | null = null;
function initSSE() {
  if (typeof window === 'undefined' || eventSource) return;
  try {
    eventSource = new EventSource('/api/events');
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload && payload.type) {
          const cbs = eventListeners[payload.type];
          if (cbs) {
            cbs.forEach((fn) => fn(payload.data));
          }
          if (payload.type === 'SYSTEM_RESET') {
            Object.keys(eventListeners).forEach((type) => {
              eventListeners[type].forEach((fn) => fn());
            });
          }
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };
    eventSource.onerror = () => {
      // Reconnection will automatically be handled by browser EventSource
    };
  } catch (err) {
    console.error('Failed to initialize SSE connection:', err);
  }
}

if (typeof window !== 'undefined') {
  initSSE();
}

// -------------------------------------------------------------
// UNIFIED DATA SERVICE (Express API Backend + Realtime SSE)
// -------------------------------------------------------------
export const dbService = {
  // ==========================================
  // 1. TEACHERS ROSTER & TAGS
  // ==========================================
  subscribeTeachers(callback: (teachers: Teacher[]) => void, roomFilter?: string): Unsubscribe {
    const fetchTeachers = async () => {
      try {
        const url = roomFilter ? `/api/teachers?room=${encodeURIComponent(roomFilter)}` : '/api/teachers';
        const res = await fetch(url);
        if (res.ok) {
          const list: Teacher[] = await res.json();
          saveLocal(STORAGE_TEACHERS_KEY, list);
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      const local = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, []);
      callback(roomFilter ? local.filter((t) => t.room === roomFilter) : local);
    };

    fetchTeachers();
    const unsubSSE = onServerEvent('TEACHERS_UPDATED', () => fetchTeachers());
    const interval = setInterval(fetchTeachers, 8000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  async addTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<string> {
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacher),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error adding teacher:', err);
    }
    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, []);
    const newId = 'teacher-' + Date.now();
    const newTeacher: Teacher = { ...teacher, id: newId, createdAt: Date.now() };
    saveLocal(STORAGE_TEACHERS_KEY, [...current, newTeacher]);
    return newId;
  },

  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<void> {
    try {
      await fetch(`/api/teachers/${encodeURIComponent(teacherId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating teacher:', err);
    }
    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, []);
    saveLocal(
      STORAGE_TEACHERS_KEY,
      current.map((t) => (t.id === teacherId ? { ...t, ...updates } : t))
    );
  },

  async deleteTeacher(teacherId: string): Promise<void> {
    try {
      await fetch(`/api/teachers/${encodeURIComponent(teacherId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting teacher:', err);
    }
    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, []);
    saveLocal(
      STORAGE_TEACHERS_KEY,
      current.filter((t) => t.id !== teacherId)
    );
  },

  async addTeachersBatch(teachers: Omit<Teacher, 'id' | 'createdAt'>[]): Promise<number> {
    try {
      const res = await fetch('/api/teachers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.count;
      }
    } catch (err) {
      console.error('Error adding teachers batch:', err);
    }
    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, []);
    const added = teachers.map((t) => ({ ...t, id: 'teacher-' + Math.random(), createdAt: Date.now() }));
    saveLocal(STORAGE_TEACHERS_KEY, [...current, ...added]);
    return added.length;
  },

  async replaceTeachersBatch(teachers: Omit<Teacher, 'id' | 'createdAt'>[]): Promise<number> {
    try {
      const res = await fetch('/api/teachers/replace-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.count;
      }
    } catch (err) {
      console.error('Error replacing teachers batch:', err);
    }
    const replaced = teachers.map((t) => ({ ...t, id: 'teacher-' + Math.random(), createdAt: Date.now() }));
    saveLocal(STORAGE_TEACHERS_KEY, replaced);
    return replaced.length;
  },

  async resetTeachersToDefault(): Promise<void> {
    try {
      await fetch('/api/teachers/reset-default', { method: 'POST' });
    } catch (err) {
      console.error('Error resetting teachers to default:', err);
    }
  },

  async clearAllTeachers(): Promise<void> {
    try {
      await fetch('/api/teachers/all', { method: 'DELETE' });
    } catch (err) {
      console.error('Error clearing all teachers:', err);
    }
    saveLocal(STORAGE_TEACHERS_KEY, []);
  },

  // ==========================================
  // 2. STUDENT VISITOR CALLS (교무실 방문 학생 호출)
  // ==========================================
  subscribeCalls(callback: (calls: Call[]) => void, roomFilter?: string): Unsubscribe {
    const fetchCalls = async () => {
      try {
        const url = roomFilter ? `/api/calls?room=${encodeURIComponent(roomFilter)}` : '/api/calls';
        const res = await fetch(url);
        if (res.ok) {
          const list: Call[] = await res.json();
          saveLocal(STORAGE_CALLS_KEY, list);
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      const local = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
      callback(roomFilter ? local.filter((c) => c.room === roomFilter) : local);
    };

    fetchCalls();
    const unsubSSE = onServerEvent('CALLS_UPDATED', () => fetchCalls());
    const interval = setInterval(fetchCalls, 3000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  subscribeCall(callId: string, callback: (call: Call | null) => void): Unsubscribe {
    const fetchSingleCall = async () => {
      try {
        const res = await fetch('/api/calls');
        if (res.ok) {
          const list: Call[] = await res.json();
          saveLocal(STORAGE_CALLS_KEY, list);
          const found = list.find((c) => c.id === callId) || null;
          callback(found);
          return;
        }
      } catch (err) {
        // fallback
      }
      const local = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
      const found = local.find((c) => c.id === callId) || null;
      callback(found);
    };

    fetchSingleCall();
    const unsubSSE = onServerEvent('CALLS_UPDATED', () => fetchSingleCall());
    const interval = setInterval(fetchSingleCall, 2500);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  async sendCall(call: Omit<Call, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(call),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error sending call:', err);
    }
    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    const newId = 'call-' + Date.now();
    const newCall: Call = {
      ...call,
      id: newId,
      createdAt: Date.now(),
      status: 'pending',
    };
    saveLocal(STORAGE_CALLS_KEY, [newCall, ...current]);
    return newId;
  },

  async createCall(call: Omit<Call, 'id' | 'createdAt' | 'status'>): Promise<string> {
    return this.sendCall(call);
  },

  async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    try {
      await fetch(`/api/calls/${encodeURIComponent(callId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Error updating call status:', err);
    }
    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.map((c) => (c.id === callId ? { ...c, status } : c))
    );
  },

  async updateCallMemo(callId: string, studentOrMemo: string, reason?: string): Promise<void> {
    const memo = reason ? `${studentOrMemo}: ${reason}` : studentOrMemo;
    try {
      await fetch(`/api/calls/${encodeURIComponent(callId)}/memo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo, hasMemo: true }),
      });
    } catch (err) {
      console.error('Error updating call memo:', err);
    }
    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.map((c) => (c.id === callId ? { ...c, hasMemo: true, memoContent: memo } : c))
    );
  },

  async deleteCall(callId: string): Promise<void> {
    try {
      await fetch(`/api/calls/${encodeURIComponent(callId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting call:', err);
    }
    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.filter((c) => c.id !== callId)
    );
  },

  // ==========================================
  // 3. TEACHER-TO-STUDENT CALLS & DISPATCH
  // ==========================================
  subscribeTeacherCalls(callback: (calls: TeacherCallToStudent[]) => void): Unsubscribe {
    const fetchTeacherCalls = async () => {
      try {
        const res = await fetch('/api/teacher-calls');
        if (res.ok) {
          const list: TeacherCallToStudent[] = await res.json();
          saveLocal(STORAGE_TEACHER_CALLS_KEY, list);
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      callback(getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []));
    };

    fetchTeacherCalls();
    const unsubSSE = onServerEvent('TEACHER_CALLS_UPDATED', () => fetchTeacherCalls());
    const interval = setInterval(fetchTeacherCalls, 4000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  subscribeTeacherCallsToStudent(callback: (calls: TeacherCallToStudent[]) => void): Unsubscribe {
    return this.subscribeTeacherCalls(callback);
  },

  async sendTeacherCall(call: Omit<TeacherCallToStudent, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const res = await fetch('/api/teacher-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(call),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error sending teacher call:', err);
    }
    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    const newId = 'tcall-' + Date.now();
    const newRecord: TeacherCallToStudent = {
      ...call,
      id: newId,
      createdAt: Date.now(),
      status: 'sent',
    };
    saveLocal(STORAGE_TEACHER_CALLS_KEY, [newRecord, ...current]);
    return newId;
  },

  async addTeacherCallToStudent(call: Omit<TeacherCallToStudent, 'id' | 'createdAt' | 'status'>): Promise<string> {
    return this.sendTeacherCall(call);
  },

  async confirmTeacherCall(callId: string): Promise<void> {
    try {
      await fetch(`/api/teacher-calls/${encodeURIComponent(callId)}/confirm`, {
        method: 'PUT',
      });
    } catch (err) {
      console.error('Error confirming teacher call:', err);
    }
    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    saveLocal(
      STORAGE_TEACHER_CALLS_KEY,
      current.map((c) => (c.id === callId ? { ...c, status: 'acknowledged', ackAt: Date.now() } : c))
    );
  },

  async acknowledgeTeacherCall(callId: string): Promise<void> {
    return this.confirmTeacherCall(callId);
  },

  async deleteTeacherCall(callId: string): Promise<void> {
    try {
      await fetch(`/api/teacher-calls/${encodeURIComponent(callId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting teacher call:', err);
    }
    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    saveLocal(
      STORAGE_TEACHER_CALLS_KEY,
      current.filter((c) => c.id !== callId)
    );
  },

  // ==========================================
  // 4. SCHOOL NOTICES
  // ==========================================
  subscribeNotices(
    callback: (notices: SchoolNotice[]) => void,
    grade?: number,
    classNum?: number,
    isStudent?: boolean
  ): Unsubscribe {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/notices');
        if (res.ok) {
          const list: SchoolNotice[] = await res.json();
          saveLocal(STORAGE_NOTICES_KEY, list);
          let filtered = list;
          if (grade !== undefined && grade !== 0) {
            filtered = filtered.filter(
              (n) =>
                n.targetGrade === 0 ||
                n.targetGrade === grade ||
                (n.targetGrades && (n.targetGrades.length === 0 || n.targetGrades.includes(grade)))
            );
          }
          if (classNum !== undefined && classNum !== 0) {
            filtered = filtered.filter((n) => n.targetClass === 0 || n.targetClass === classNum);
          }
          callback(filtered);
          return;
        }
      } catch (err) {
        // fallback
      }
      let local = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, []);
      if (grade !== undefined && grade !== 0) {
        local = local.filter(
          (n) =>
            n.targetGrade === 0 ||
            n.targetGrade === grade ||
            (n.targetGrades && (n.targetGrades.length === 0 || n.targetGrades.includes(grade)))
        );
      }
      if (classNum !== undefined && classNum !== 0) {
        local = local.filter((n) => n.targetClass === 0 || n.targetClass === classNum);
      }
      callback(local);
    };

    fetchNotices();
    const unsubSSE = onServerEvent('NOTICES_UPDATED', () => fetchNotices());
    const interval = setInterval(fetchNotices, 6000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  subscribeSchoolNotices(
    callback: (notices: SchoolNotice[]) => void,
    grade?: number,
    classNum?: number,
    isStudent?: boolean
  ): Unsubscribe {
    return this.subscribeNotices(callback, grade, classNum, isStudent);
  },

  async publishNotice(notice: Omit<SchoolNotice, 'id' | 'createdAt' | 'confirmedStudentIds'>): Promise<string> {
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notice),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error publishing notice:', err);
    }
    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, []);
    const newId = 'notice-' + Date.now();
    const newNotice: SchoolNotice = {
      ...notice,
      id: newId,
      confirmedStudentIds: [],
      createdAt: Date.now(),
    };
    saveLocal(STORAGE_NOTICES_KEY, [newNotice, ...current]);
    return newId;
  },

  async addSchoolNotice(notice: Omit<SchoolNotice, 'id' | 'createdAt' | 'confirmedStudentIds'>): Promise<string> {
    return this.publishNotice(notice);
  },

  async confirmNoticeRead(noticeId: string, studentId: string): Promise<void> {
    try {
      await fetch(`/api/notices/${encodeURIComponent(noticeId)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
    } catch (err) {
      console.error('Error confirming notice:', err);
    }
    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, []);
    saveLocal(
      STORAGE_NOTICES_KEY,
      current.map((n) => {
        if (n.id === noticeId) {
          const set = new Set(n.confirmedStudentIds || []);
          set.add(studentId);
          return { ...n, confirmedStudentIds: Array.from(set) };
        }
        return n;
      })
    );
  },

  async confirmSchoolNotice(noticeId: string, studentId: string): Promise<void> {
    return this.confirmNoticeRead(noticeId, studentId);
  },

  async deleteNotice(noticeId: string): Promise<void> {
    try {
      await fetch(`/api/notices/${encodeURIComponent(noticeId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting notice:', err);
    }
    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, []);
    saveLocal(
      STORAGE_NOTICES_KEY,
      current.filter((n) => n.id !== noticeId)
    );
  },

  async deleteSchoolNotice(noticeId: string): Promise<void> {
    return this.deleteNotice(noticeId);
  },

  // ==========================================
  // 5. ATTENDANCE MANAGEMENT
  // ==========================================
  subscribeAttendance(
    callback: (attendance: StudentAttendance[]) => void,
    dateFilter?: string,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    const fetchAttendance = async () => {
      try {
        const url = dateFilter ? `/api/attendance?date=${encodeURIComponent(dateFilter)}` : '/api/attendance';
        const res = await fetch(url);
        if (res.ok) {
          let list: StudentAttendance[] = await res.json();
          saveLocal(STORAGE_ATTENDANCE_KEY, list);
          if (gradeFilter) list = list.filter((a) => a.grade === gradeFilter);
          if (classFilter) list = list.filter((a) => a.classNum === classFilter);
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      let local = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
      if (dateFilter) local = local.filter((a) => a.date === dateFilter);
      if (gradeFilter) local = local.filter((a) => a.grade === gradeFilter);
      if (classFilter) local = local.filter((a) => a.classNum === classFilter);
      callback(local);
    };

    fetchAttendance();
    const unsubSSE = onServerEvent('ATTENDANCE_UPDATED', () => fetchAttendance());
    const interval = setInterval(fetchAttendance, 5000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  async recordAttendance(data: Omit<StudentAttendance, 'id'>): Promise<string> {
    const payload = {
      ...data,
      createdAt: data.createdAt || Date.now(),
    };
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        return result.id;
      }
    } catch (err) {
      console.error('Error recording attendance:', err);
    }
    const current = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
    const existingIdx = current.findIndex(
      (a) => a.grade === payload.grade && a.classNum === payload.classNum && a.studentNumber === payload.studentNumber && a.date === payload.date
    );
    if (existingIdx !== -1) {
      current[existingIdx] = { ...current[existingIdx], ...payload };
      saveLocal(STORAGE_ATTENDANCE_KEY, current);
      return current[existingIdx].id;
    }
    const newId = 'att-' + Date.now();
    const newRecord: StudentAttendance = { ...payload, id: newId };
    saveLocal(STORAGE_ATTENDANCE_KEY, [...current, newRecord]);
    return newId;
  },

  async bulkRecordAttendance(records: Omit<StudentAttendance, 'id'>[]): Promise<number> {
    for (const r of records) {
      await this.recordAttendance(r);
    }
    return records.length;
  },

  async updateAttendanceStatus(recordId: string, status: StudentAttendance['status'], note?: string): Promise<void> {
    try {
      await fetch(`/api/attendance/${encodeURIComponent(recordId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
    } catch (err) {
      console.error('Error updating attendance status:', err);
    }
    const current = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
    saveLocal(
      STORAGE_ATTENDANCE_KEY,
      current.map((a) => (a.id === recordId ? { ...a, status, ...(note !== undefined ? { note } : {}) } : a))
    );
  },

  // ==========================================
  // 6. TEACHER WORK NOTES (교원 업무 수합 & 투표)
  // ==========================================
  subscribeWorkNotes(callback: (notes: TeacherWorkNote[]) => void): Unsubscribe {
    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/work-notes');
        if (res.ok) {
          const list: TeacherWorkNote[] = await res.json();
          saveLocal(STORAGE_WORK_NOTES_KEY, list);
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      callback(getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, []));
    };

    fetchNotes();
    const unsubSSE = onServerEvent('WORK_NOTES_UPDATED', () => fetchNotes());
    const interval = setInterval(fetchNotes, 8000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  async createWorkNote(note: Omit<TeacherWorkNote, 'id' | 'createdAt'>): Promise<string> {
    try {
      const res = await fetch('/api/work-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error creating work note:', err);
    }
    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, []);
    const newId = 'note-' + Date.now();
    const newNote: TeacherWorkNote = { ...note, id: newId, createdAt: Date.now() };
    saveLocal(STORAGE_WORK_NOTES_KEY, [newNote, ...current]);
    return newId;
  },

  async addWorkNote(note: Omit<TeacherWorkNote, 'id' | 'createdAt'>): Promise<string> {
    return this.createWorkNote(note);
  },

  async submitWorkNoteResponse(noteId: string, respondentKey: string, response: WorkNoteResponse): Promise<void> {
    try {
      await fetch(`/api/work-notes/${encodeURIComponent(noteId)}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: respondentKey, response }),
      });
    } catch (err) {
      console.error('Error submitting response:', err);
    }
    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, []);
    saveLocal(
      STORAGE_WORK_NOTES_KEY,
      current.map((n) => {
        if (n.id === noteId) {
          const responses = { ...(n.responses || {}) };
          responses[respondentKey] = { ...response, updatedAt: Date.now() };
          return { ...n, responses };
        }
        return n;
      })
    );
  },

  async respondWorkNote(noteId: string, respondentKey: string, response: WorkNoteResponse): Promise<void> {
    return this.submitWorkNoteResponse(noteId, respondentKey, response);
  },

  async deleteWorkNote(noteId: string): Promise<void> {
    try {
      await fetch(`/api/work-notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting work note:', err);
    }
    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, []);
    saveLocal(
      STORAGE_WORK_NOTES_KEY,
      current.filter((n) => n.id !== noteId)
    );
  },

  // ==========================================
  // 7. STUDENT ROSTER MANAGEMENT
  // ==========================================
  subscribeStudents(
    callback: (students: StudentRecord[]) => void,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/students');
        if (res.ok) {
          let list: StudentRecord[] = await res.json();
          saveLocal(STORAGE_STUDENTS_KEY, list);
          if (gradeFilter && gradeFilter > 0) {
            list = list.filter((s) => s.grade === gradeFilter);
          }
          if (classFilter && classFilter > 0) {
            list = list.filter((s) => s.classNum === classFilter);
          }
          callback(list);
          return;
        }
      } catch (err) {
        // fallback
      }
      let local = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
      if (gradeFilter && gradeFilter > 0) {
        local = local.filter((s) => s.grade === gradeFilter);
      }
      if (classFilter && classFilter > 0) {
        local = local.filter((s) => s.classNum === classFilter);
      }
      callback(local);
    };

    fetchStudents();
    const unsubSSE = onServerEvent('STUDENTS_UPDATED', () => fetchStudents());
    const interval = setInterval(fetchStudents, 5000);

    return () => {
      unsubSSE();
      clearInterval(interval);
    };
  },

  async addStudent(student: Omit<StudentRecord, 'id' | 'createdAt'>): Promise<string> {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (err) {
      console.error('Error adding student:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    const newId = 'std-' + Date.now();
    const newStudent: StudentRecord = { ...student, id: newId, createdAt: Date.now() };
    saveLocal(STORAGE_STUDENTS_KEY, [...current, newStudent]);
    return newId;
  },

  async updateStudent(studentId: string, updates: Partial<StudentRecord>): Promise<void> {
    try {
      await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating student:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.map((s) => (s.id === studentId ? { ...s, ...updates } : s))
    );
  },

  async deleteStudent(studentId: string): Promise<void> {
    try {
      await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting student:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.filter((s) => s.id !== studentId)
    );
  },

  async bulkImportStudents(
    students: Omit<StudentRecord, 'id' | 'createdAt'>[],
    options?: { overwriteExisting?: boolean; clearTargetClassesFirst?: boolean }
  ): Promise<number> {
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, options }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.count;
      }
    } catch (err) {
      console.error('Error bulk importing students:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    const added = students.map((s) => ({ ...s, id: 'std-' + Math.random(), createdAt: Date.now() }));
    saveLocal(STORAGE_STUDENTS_KEY, [...current, ...added]);
    return added.length;
  },

  async clearGradeStudents(grade: number): Promise<void> {
    try {
      await fetch(`/api/students/grade/${grade}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error clearing grade:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.filter((s) => s.grade !== grade)
    );
  },

  async clearClassStudents(grade: number, classNum: number): Promise<void> {
    try {
      await fetch(`/api/students/class/${grade}/${classNum}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error clearing class:', err);
    }
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, []);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.filter((s) => !(s.grade === grade && s.classNum === classNum))
    );
  },

  async clearAllStudents(): Promise<void> {
    try {
      await fetch('/api/students/grade/0', { method: 'DELETE' });
    } catch (err) {
      // fallback
    }
    saveLocal(STORAGE_STUDENTS_KEY, []);
  },

  async resetDefaultStudents(): Promise<void> {
    saveLocal(STORAGE_STUDENTS_KEY, []);
  },

  // ==========================================
  // 8. SYSTEM RESET TO CLEAN SLATE (원점에서 전체 초기화)
  // ==========================================
  async resetCleanSlate(keepTeachers: boolean = false): Promise<void> {
    try {
      await fetch('/api/system/reset-clean-slate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepTeachers }),
      });
    } catch (err) {
      console.error('Error resetting system to clean slate:', err);
    }

    if (!keepTeachers) {
      saveLocal(STORAGE_TEACHERS_KEY, []);
    }
    saveLocal(STORAGE_STUDENTS_KEY, []);
    saveLocal(STORAGE_CALLS_KEY, []);
    saveLocal(STORAGE_TEACHER_CALLS_KEY, []);
    saveLocal(STORAGE_NOTICES_KEY, []);
    saveLocal(STORAGE_ATTENDANCE_KEY, []);
    saveLocal(STORAGE_WORK_NOTES_KEY, []);
    try {
      localStorage.removeItem('edu_student_profile_v1');
    } catch {}
  },
};
