import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Teacher, Call, CallStatus } from '../types';

// Read Firebase configurations from Vite environment variables (import.meta.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase credentials are fully configured
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
// LOCAL / DEMO FALLBACK CHANNEL (BroadcastChannel & LocalStorage)
// Allows real-time two-way synchronization across browser tabs
// even before Firebase is configured in .env.local!
// -------------------------------------------------------------
const STORAGE_TEACHERS_KEY = 'smart_qr_teachers';
const STORAGE_CALLS_KEY = 'smart_qr_calls';
const channel = typeof window !== 'undefined' ? new BroadcastChannel('smart_qr_sync_channel') : null;

// Initial default seed teachers for smooth first-time experience
const DEFAULT_TEACHERS: Teacher[] = [
  { id: 'teacher-1', name: '김민준', room: '본관 1교무실', subject: '수학', createdAt: Date.now() - 3600000 },
  { id: 'teacher-2', name: '이서연', room: '본관 1교무실', subject: '국어', createdAt: Date.now() - 3500000 },
  { id: 'teacher-3', name: '박지훈', room: '본관 1교무실', subject: '영어', createdAt: Date.now() - 3400000 },
  { id: 'teacher-4', name: '최유나', room: '2학년 연구실', subject: '과학', createdAt: Date.now() - 3300000 },
  { id: 'teacher-5', name: '정현우', room: '진로진학상담실', subject: '진로상담', createdAt: Date.now() - 3200000 },
];

function getLocalTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEACHERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TEACHERS_KEY, JSON.stringify(DEFAULT_TEACHERS));
      return DEFAULT_TEACHERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TEACHERS;
  }
}

function saveLocalTeachers(teachers: Teacher[]) {
  localStorage.setItem(STORAGE_TEACHERS_KEY, JSON.stringify(teachers));
  channel?.postMessage({ type: 'TEACHERS_UPDATED' });
}

function getLocalCalls(): Call[] {
  try {
    const raw = localStorage.getItem(STORAGE_CALLS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalCalls(calls: Call[]) {
  localStorage.setItem(STORAGE_CALLS_KEY, JSON.stringify(calls));
  channel?.postMessage({ type: 'CALLS_UPDATED' });
}

// -------------------------------------------------------------
// UNIFIED DATA SERVICE (Firestore with Automatic Fallback)
// -------------------------------------------------------------

export const dbService = {
  // Subscribe to teachers list
  subscribeTeachers(callback: (teachers: Teacher[]) => void, roomFilter?: string): Unsubscribe {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const q = roomFilter
          ? query(teachersRef, where('room', '==', roomFilter))
          : query(teachersRef);

        return onSnapshot(
          q,
          (snapshot) => {
            const list: Teacher[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Teacher, 'id'>),
            }));
            callback(list);
          },
          (error) => {
            console.error('Firestore teachers subscription error:', error);
            // Fallback to local
            callback(
              getLocalTeachers().filter((t) => !roomFilter || t.room === roomFilter)
            );
          }
        );
      } catch (err) {
        console.error('Failed to query firestore:', err);
      }
    }

    // Local / Demo Mode Handler
    const emit = () => {
      const all = getLocalTeachers();
      callback(roomFilter ? all.filter((t) => t.room === roomFilter) : all);
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TEACHERS_UPDATED') {
        emit();
      }
    };
    channel?.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_TEACHERS_KEY) {
        emit();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  },

  // Add teacher
  async addTeacher(teacher: Omit<Teacher, 'id'>): Promise<string> {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const docRef = await addDoc(teachersRef, {
          ...teacher,
          createdAt: Date.now(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error adding teacher to Firestore:', error);
      }
    }

    const current = getLocalTeachers();
    const newId = 'teacher-' + Date.now();
    const newTeacher: Teacher = {
      ...teacher,
      id: newId,
      createdAt: Date.now(),
    };
    saveLocalTeachers([...current, newTeacher]);
    return newId;
  },

  // Delete teacher
  async deleteTeacher(id: string): Promise<void> {
    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'teachers', id));
        return;
      } catch (error) {
        console.error('Error deleting teacher in Firestore:', error);
      }
    }

    const current = getLocalTeachers();
    saveLocalTeachers(current.filter((t) => t.id !== id));
  },

  // Create student call
  async createCall(callData: Omit<Call, 'id'>): Promise<string> {
    const payload = {
      ...callData,
      status: 'pending' as CallStatus,
      studentName: '',
      reason: '',
      hasMemo: false,
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const callsRef = collection(firestore, 'calls');
        const docRef = await addDoc(callsRef, payload);
        return docRef.id;
      } catch (error) {
        console.error('Error creating call in Firestore:', error);
      }
    }

    const current = getLocalCalls();
    const newId = 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newCall: Call = {
      ...payload,
      id: newId,
    };
    saveLocalCalls([newCall, ...current]);
    return newId;
  },

  // Subscribe to single call (for student mobile screen)
  subscribeCall(callId: string, callback: (call: Call | null) => void): Unsubscribe {
    if (firestore) {
      try {
        const callDocRef = doc(firestore, 'calls', callId);
        return onSnapshot(
          callDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              callback({
                id: docSnap.id,
                ...(docSnap.data() as Omit<Call, 'id'>),
              });
            } else {
              callback(null);
            }
          },
          (error) => {
            console.error('Firestore single call subscription error:', error);
          }
        );
      } catch (err) {
        console.error('Failed to subscribe to firestore call doc:', err);
      }
    }

    // Local / Demo Mode Handler
    const emit = () => {
      const calls = getLocalCalls();
      const match = calls.find((c) => c.id === callId);
      callback(match || null);
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CALLS_UPDATED') {
        emit();
      }
    };
    channel?.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_CALLS_KEY) {
        emit();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  },

  // Update call status (e.g. accepted, ignored, auto-away)
  async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    if (firestore) {
      try {
        const callDocRef = doc(firestore, 'calls', callId);
        await updateDoc(callDocRef, {
          status,
          updatedAt: Date.now(),
        });
        return;
      } catch (error) {
        console.error('Error updating call status in Firestore:', error);
      }
    }

    const current = getLocalCalls();
    const updated = current.map((c) =>
      c.id === callId ? { ...c, status, updatedAt: Date.now() } : c
    );
    saveLocalCalls(updated);
  },

  // Update call memo (student name, reason, hasMemo: true)
  async updateCallMemo(callId: string, studentName: string, reason: string): Promise<void> {
    if (firestore) {
      try {
        const callDocRef = doc(firestore, 'calls', callId);
        await updateDoc(callDocRef, {
          studentName,
          reason,
          hasMemo: true,
          updatedAt: Date.now(),
        });
        return;
      } catch (error) {
        console.error('Error updating call memo in Firestore:', error);
      }
    }

    const current = getLocalCalls();
    const updated = current.map((c) =>
      c.id === callId
        ? { ...c, studentName, reason, hasMemo: true, updatedAt: Date.now() }
        : c
    );
    saveLocalCalls(updated);
  },

  // Subscribe to all active calls / memos for teacher screen
  subscribeCalls(
    callback: (calls: Call[]) => void,
    roomFilter?: string,
    teacherFilter?: string
  ): Unsubscribe {
    if (firestore) {
      try {
        const callsRef = collection(firestore, 'calls');
        let q = query(callsRef, orderBy('createdAt', 'desc'));
        if (roomFilter && roomFilter !== 'ALL') {
          q = query(callsRef, where('room', '==', roomFilter), orderBy('createdAt', 'desc'));
        }

        return onSnapshot(
          q,
          (snapshot) => {
            let list: Call[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Call, 'id'>),
            }));
            if (teacherFilter && teacherFilter !== 'ALL') {
              list = list.filter((c) => c.teacherName === teacherFilter);
            }
            callback(list);
          },
          (error) => {
            console.error('Firestore calls subscription error:', error);
            // Fallback to local
            const all = getLocalCalls();
            let filtered = all;
            if (roomFilter && roomFilter !== 'ALL') {
              filtered = filtered.filter((c) => c.room === roomFilter);
            }
            if (teacherFilter && teacherFilter !== 'ALL') {
              filtered = filtered.filter((c) => c.teacherName === teacherFilter);
            }
            callback(filtered);
          }
        );
      } catch (err) {
        console.error('Failed to subscribe calls:', err);
      }
    }

    // Local / Demo Mode Handler
    const emit = () => {
      const all = getLocalCalls();
      let filtered = all;
      if (roomFilter && roomFilter !== 'ALL') {
        filtered = filtered.filter((c) => c.room === roomFilter);
      }
      if (teacherFilter && teacherFilter !== 'ALL') {
        filtered = filtered.filter((c) => c.teacherName === teacherFilter);
      }
      callback(filtered);
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CALLS_UPDATED') {
        emit();
      }
    };
    channel?.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_CALLS_KEY) {
        emit();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  },

  // Clear call history (optional utility for teacher)
  async clearAllLocalCalls(): Promise<void> {
    saveLocalCalls([]);
  }
};
