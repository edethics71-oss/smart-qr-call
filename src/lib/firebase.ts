import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
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
// -------------------------------------------------------------
const STORAGE_TEACHERS_KEY = 'smart_qr_teachers';
const STORAGE_CALLS_KEY = 'smart_qr_calls';
const STORAGE_TEACHER_CALLS_KEY = 'smart_qr_teacher_to_student_calls';
const STORAGE_NOTICES_KEY = 'smart_qr_school_notices';
const STORAGE_ATTENDANCE_KEY = 'smart_qr_attendance';
const STORAGE_WORK_NOTES_KEY = 'smart_qr_work_notes';
const STORAGE_STUDENTS_KEY = 'smart_qr_student_roster';

const DEFAULT_STUDENTS: StudentRecord[] = [
  // 1학년 1반
  { id: 'std-1-1-1', grade: 1, classNum: 1, studentNumber: 1, name: '강민준', gender: 'M', status: 'active', notes: '반장' },
  { id: 'std-1-1-2', grade: 1, classNum: 1, studentNumber: 2, name: '김도윤', gender: 'M', status: 'active' },
  { id: 'std-1-1-3', grade: 1, classNum: 1, studentNumber: 3, name: '김서연', gender: 'F', status: 'active', notes: '부반장' },
  { id: 'std-1-1-4', grade: 1, classNum: 1, studentNumber: 4, name: '김시우', gender: 'M', status: 'active' },
  { id: 'std-1-1-5', grade: 1, classNum: 1, studentNumber: 5, name: '김지유', gender: 'F', status: 'active' },
  { id: 'std-1-1-6', grade: 1, classNum: 1, studentNumber: 6, name: '김하은', gender: 'F', status: 'active' },
  { id: 'std-1-1-7', grade: 1, classNum: 1, studentNumber: 7, name: '박건우', gender: 'M', status: 'active' },
  { id: 'std-1-1-8', grade: 1, classNum: 1, studentNumber: 8, name: '박서아', gender: 'F', status: 'active' },
  // 1학년 2반
  { id: 'std-1-2-1', grade: 1, classNum: 2, studentNumber: 1, name: '박서준', gender: 'M', status: 'active', notes: '반장' },
  { id: 'std-1-2-2', grade: 1, classNum: 2, studentNumber: 2, name: '박예준', gender: 'M', status: 'active' },
  { id: 'std-1-2-3', grade: 1, classNum: 2, studentNumber: 3, name: '서유주', gender: 'F', status: 'active' },
  { id: 'std-1-2-4', grade: 1, classNum: 2, studentNumber: 4, name: '송민재', gender: 'M', status: 'active' },
  { id: 'std-1-2-5', grade: 1, classNum: 2, studentNumber: 5, name: '신지아', gender: 'F', status: 'active' },
  // 1학년 3반 (25명 풀 명렬 샘플)
  { id: 'std-1-3-0', grade: 1, classNum: 3, studentNumber: 1, name: '홍길동', gender: 'M', status: 'active', notes: '테스트 학생' },
  { id: 'std-1-3-1', grade: 1, classNum: 3, studentNumber: 2, name: '안유진', gender: 'F', status: 'active', notes: '반장' },
  { id: 'std-1-3-2', grade: 1, classNum: 3, studentNumber: 2, name: '유준상', gender: 'M', status: 'active' },
  { id: 'std-1-3-3', grade: 1, classNum: 3, studentNumber: 3, name: '윤도현', gender: 'M', status: 'active' },
  { id: 'std-1-3-4', grade: 1, classNum: 3, studentNumber: 4, name: '이도현', gender: 'M', status: 'active' },
  { id: 'std-1-3-5', grade: 1, classNum: 3, studentNumber: 5, name: '이로아', gender: 'F', status: 'active' },
  { id: 'std-1-3-6', grade: 1, classNum: 3, studentNumber: 6, name: '이시은', gender: 'F', status: 'active' },
  { id: 'std-1-3-7', grade: 1, classNum: 3, studentNumber: 7, name: '이준우', gender: 'M', status: 'active' },
  { id: 'std-1-3-8', grade: 1, classNum: 3, studentNumber: 8, name: '이하린', gender: 'F', status: 'active' },
  { id: 'std-1-3-9', grade: 1, classNum: 3, studentNumber: 9, name: '이현우', gender: 'M', status: 'active' },
  { id: 'std-1-3-10', grade: 1, classNum: 3, studentNumber: 10, name: '임수빈', gender: 'F', status: 'active' },
  { id: 'std-1-3-11', grade: 1, classNum: 3, studentNumber: 11, name: '임예은', gender: 'F', status: 'active' },
  { id: 'std-1-3-12', grade: 1, classNum: 3, studentNumber: 12, name: '임재윤', gender: 'M', status: 'active' },
  { id: 'std-1-3-13', grade: 1, classNum: 3, studentNumber: 13, name: '장민서', gender: 'F', status: 'active' },
  { id: 'std-1-3-14', grade: 1, classNum: 3, studentNumber: 14, name: '장원우', gender: 'M', status: 'active' },
  { id: 'std-1-3-15', grade: 1, classNum: 3, studentNumber: 15, name: '김민준', gender: 'M', status: 'active', notes: '체육부장' },
  { id: 'std-1-3-16', grade: 1, classNum: 3, studentNumber: 16, name: '정다은', gender: 'F', status: 'active' },
  { id: 'std-1-3-17', grade: 1, classNum: 3, studentNumber: 17, name: '정수아', gender: 'F', status: 'active' },
  { id: 'std-1-3-18', grade: 1, classNum: 3, studentNumber: 18, name: '정예원', gender: 'F', status: 'active' },
  { id: 'std-1-3-19', grade: 1, classNum: 3, studentNumber: 19, name: '정우진', gender: 'M', status: 'active' },
  { id: 'std-1-3-20', grade: 1, classNum: 3, studentNumber: 20, name: '조아인', gender: 'F', status: 'active' },
  { id: 'std-1-3-21', grade: 1, classNum: 3, studentNumber: 21, name: '조은우', gender: 'M', status: 'active' },
  { id: 'std-1-3-22', grade: 1, classNum: 3, studentNumber: 22, name: '조재윤', gender: 'M', status: 'active' },
  { id: 'std-1-3-23', grade: 1, classNum: 3, studentNumber: 23, name: '차은우', gender: 'M', status: 'active' },
  { id: 'std-1-3-24', grade: 1, classNum: 3, studentNumber: 24, name: '최다온', gender: 'M', status: 'active' },
  { id: 'std-1-3-25', grade: 1, classNum: 3, studentNumber: 25, name: '최서현', gender: 'F', status: 'active' },
  // 2학년 1반
  { id: 'std-2-1-1', grade: 2, classNum: 1, studentNumber: 1, name: '권지용', gender: 'M', status: 'active', notes: '반장' },
  { id: 'std-2-1-2', grade: 2, classNum: 1, studentNumber: 2, name: '김태형', gender: 'M', status: 'active' },
  { id: 'std-2-1-3', grade: 2, classNum: 1, studentNumber: 3, name: '박지민', gender: 'M', status: 'active' },
  { id: 'std-2-1-4', grade: 2, classNum: 1, studentNumber: 4, name: '배수지', gender: 'F', status: 'active' },
  // 3학년 1반
  { id: 'std-3-1-1', grade: 3, classNum: 1, studentNumber: 1, name: '아이유', gender: 'F', status: 'active', notes: '학생회장' },
  { id: 'std-3-1-2', grade: 3, classNum: 1, studentNumber: 2, name: '이승기', gender: 'M', status: 'active', notes: '부회장' },
];

const channel = typeof window !== 'undefined' ? new BroadcastChannel('smart_qr_sync_channel') : null;

// Initial default seed teachers with diverse tags/committees
const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'teacher-1',
    name: '김민준',
    room: '본관 1교무실',
    subject: '수학',
    department: '1학년부',
    grade: 1,
    classNum: 3,
    homeroomRole: '1학년 3반 담임',
    duty: '1학년 학년운영 및 수학 수업',
    committees: ['교육과정위원회', '기획위원회'],
    extension: '101',
    tags: ['1학년 담임', '수학과', '1학년부', '기획위원회', '교육과정위원회'],
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'teacher-2',
    name: '이서연',
    room: '본관 1교무실',
    subject: '국어',
    department: '교무기획부',
    homeroomRole: '교무기획부장 (비담임)',
    duty: '교무기획 총괄 및 학사일정',
    committees: ['기획위원회', '인사자문위원회', '교육과정위원회'],
    extension: '102',
    tags: ['교무기획부', '국어과', '부장교사', '기획위원회', '인사자문위원회'],
    createdAt: Date.now() - 3500000,
  },
  {
    id: 'teacher-3',
    name: '박지훈',
    room: '본관 1교무실',
    subject: '영어',
    department: '1학년부',
    grade: 1,
    classNum: 1,
    homeroomRole: '1학년 1반 담임',
    duty: '1학년 영어 수업 및 나이스 학적',
    committees: ['학폭전담기구', '선도위원회'],
    extension: '103',
    tags: ['1학년 담임', '영어과', '1학년부', '학폭전담기구'],
    createdAt: Date.now() - 3400000,
  },
  {
    id: 'teacher-4',
    name: '최유나',
    room: '2학년 연구실',
    subject: '과학',
    department: '2학년부',
    grade: 2,
    classNum: 1,
    homeroomRole: '2학년 부장 / 2-1 담임',
    duty: '2학년 총괄 및 과학 실험실 관리',
    committees: ['기획위원회', '교권보호위원회', '교육과정위원회'],
    extension: '201',
    tags: ['2학년 담임', '2학년 부장', '과학과', '기획위원회', '교권보호위원회'],
    createdAt: Date.now() - 3300000,
  },
  {
    id: 'teacher-5',
    name: '정현우',
    room: '2학년 연구실',
    subject: '사회',
    department: '학생안전부',
    homeroomRole: '학생안전부장 (비담임)',
    duty: '학생 생활지도 및 학교폭력 예방',
    committees: ['학폭전담기구', '선도위원회', '교권보호위원회'],
    extension: '202',
    tags: ['학생안전부', '사회과', '부장교사', '학폭전담기구', '선도위원회'],
    createdAt: Date.now() - 3200000,
  },
  {
    id: 'teacher-6',
    name: '강도윤',
    room: '3학년 연구실',
    subject: '한국사',
    department: '3학년부',
    grade: 3,
    classNum: 1,
    homeroomRole: '3학년 부장 / 3-1 담임',
    duty: '3학년 입시지도 및 학년 운영',
    committees: ['기획위원회', '인사자문위원회'],
    extension: '301',
    tags: ['3학년 담임', '3학년 부장', '역사/사회과', '기획위원회'],
    createdAt: Date.now() - 3100000,
  },
  {
    id: 'teacher-7',
    name: '임서진',
    room: '진로진학상담실',
    subject: '진로상담',
    department: '진로진학상담부',
    homeroomRole: '진로진학상담부장',
    duty: '학생 진로 및 Wee클래스 전문상담',
    committees: ['학폭전담기구', '교육과정위원회', '인사자문위원회'],
    extension: '401',
    tags: ['진로진학부', '상담교사', '교육과정위원회', '학폭전담기구'],
    createdAt: Date.now() - 3000000,
  },
];

// Initial default seed notices
const DEFAULT_NOTICES: SchoolNotice[] = [
  {
    id: 'notice-1',
    type: 'homeroom_morning',
    title: '1학년 3반 오늘 아침 조회 안내',
    content: '1. 오늘 7교시 진로활동 준비물(필기도구) 챙겨서 6교시 후 강당으로 이동합니다.\n2. 방과후 학교 수강신청 마감 17:00까지 꼭 확인하세요.',
    senderName: '김민준',
    senderRole: '1학년 3반 담임',
    targetGrade: 1,
    targetClass: 3,
    isUrgent: false,
    date: new Date().toISOString().slice(0, 10),
    confirmedStudentIds: ['1-3-1-강민서', '1-3-2-김철수'],
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'notice-2',
    type: 'grade',
    title: '1학년 전체 3월 학력평가 시험실 배치표 안내',
    content: '내일 치러지는 전국연합학력평가 시험실 번호와 유의사항(컴퓨터용 사인펜 지참)을 확인하세요.',
    senderName: '최유나',
    senderRole: '1학년 부장',
    targetGrade: 1,
    targetClass: 0,
    isUrgent: true,
    date: new Date().toISOString().slice(0, 10),
    confirmedStudentIds: [],
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'notice-3',
    type: 'department',
    title: '도서관 봄맞이 신간 도서 대출 이벤트',
    content: '도서관 신간 도서 대출 시 도서부 제작 책갈피 및 간식 세트를 선착순 50명에게 증정합니다.',
    senderName: '이서연',
    senderRole: '교육연구부',
    targetGrade: 0,
    targetClass: 0,
    isUrgent: false,
    date: new Date().toISOString().slice(0, 10),
    confirmedStudentIds: [],
    createdAt: Date.now() - 1800000,
  },
];

// Initial default seed work notes
const DEFAULT_WORK_NOTES: TeacherWorkNote[] = [
  {
    id: 'note-1',
    senderId: 'teacher-4',
    senderName: '최유나',
    senderRole: '1학년 부장',
    title: '2학기 현장체험학습 희망처 및 차량 탑승 인원 수합',
    content: '각 반 담임선생님께서는 학급별 학생 희망 장소(에버랜드/롯데월드/서울랜드)와 멀미약 필요 인원을 수합하여 입력해 주시기 바랍니다.',
    noteType: 'data_aggregate',
    targetGroups: ['1학년 담임', '부장교사'],
    deadline: '오늘 16:30까지',
    aggregateFieldLabel: '희망처 및 특이인원(멀미 등)',
    responses: {
      '1-1': { teacherName: '이서연', role: '1-1 담임', isDone: true, value: '에버랜드 (26명) / 멀미약 2명', updatedAt: Date.now() - 2000000 },
      '1-2': { teacherName: '박지훈', role: '1-2 담임', isDone: true, value: '롯데월드 (25명) / 채식 1명', updatedAt: Date.now() - 1500000 },
      '1-3': { teacherName: '김민준', role: '1-3 담임', isDone: false, value: '', updatedAt: Date.now() - 1000000 },
    },
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'note-2',
    senderId: 'teacher-1',
    senderName: '김민준',
    senderRole: '교육과정부장',
    title: '2027학년도 입학생 교육과정 편제표 검토 의견 찬반 투표',
    content: '제1차 학교교육과정위원회 회의 안건(수학/과학 진로선택과목 3학점 편성안)에 대한 찬반 투표를 부탁드립니다.',
    noteType: 'vote',
    targetGroups: ['교육과정위원회', '기획위원회'],
    deadline: '내일 12:00까지',
    voteOptions: ['찬성 (원안 가결)', '반대 (재검토 필요)', '기타 의견'],
    responses: {
      '김민준': { teacherName: '김민준', role: '위원', isDone: true, value: '찬성 (원안 가결)', updatedAt: Date.now() - 3000000 },
      '정현우': { teacherName: '정현우', role: '위원', isDone: true, value: '찬성 (원안 가결)', updatedAt: Date.now() - 2500000 },
      '최유나': { teacherName: '최유나', role: '위원', isDone: false, value: '', updatedAt: Date.now() - 2000000 },
    },
    createdAt: Date.now() - 5400000,
  },
];

// Helper functions for localStorage
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

function saveLocal<T>(key: string, val: T, eventType: string) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    channel?.postMessage({ type: eventType });
  } catch (err) {
    console.error(`Failed to save ${key} in localStorage:`, err);
  }
}

// -------------------------------------------------------------
// UNIFIED DATA SERVICE (Firestore with Automatic Fallback)
// -------------------------------------------------------------
export const dbService = {
  // ==========================================
  // 1. TEACHERS ROSTER & TAGS
  // ==========================================
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
            callback(
              getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS).filter(
                (t) => !roomFilter || t.room === roomFilter
              )
            );
          }
        );
      } catch (err) {
        console.error('Failed to query firestore:', err);
      }
    }

    const emit = () => {
      const all = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS);
      callback(roomFilter ? all.filter((t) => t.room === roomFilter) : all);
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TEACHERS_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_TEACHERS_KEY) emit();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  },

  async addTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<string> {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const docRef = await addDoc(teachersRef, {
          ...teacher,
          tags: teacher.tags || [],
          createdAt: Date.now(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error adding teacher to Firestore:', error);
      }
    }

    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS);
    const newId = 'teacher-' + Date.now();
    const newTeacher: Teacher = {
      ...teacher,
      tags: teacher.tags || [],
      id: newId,
      createdAt: Date.now(),
    };
    saveLocal(STORAGE_TEACHERS_KEY, [...current, newTeacher], 'TEACHERS_UPDATED');
    return newId;
  },

  async addTeachersBatch(newTeachersList: Omit<Teacher, 'id'>[]): Promise<number> {
    if (newTeachersList.length === 0) return 0;

    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        for (const t of newTeachersList) {
          await addDoc(teachersRef, {
            ...t,
            tags: t.tags || [],
            committees: t.committees || [],
            createdAt: Date.now(),
          });
        }
        return newTeachersList.length;
      } catch (error) {
        console.error('Error batch adding teachers to Firestore:', error);
      }
    }

    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS);
    const formatted: Teacher[] = newTeachersList.map((t, idx) => ({
      ...t,
      tags: t.tags || [],
      committees: t.committees || [],
      id: 'teacher-' + Date.now() + '-' + idx,
      createdAt: Date.now(),
    }));
    saveLocal(STORAGE_TEACHERS_KEY, [...current, ...formatted], 'TEACHERS_UPDATED');
    return formatted.length;
  },

  async replaceTeachersBatch(newTeachersList: Omit<Teacher, 'id'>[]): Promise<number> {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const snapshot = await getDocs(teachersRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        for (const t of newTeachersList) {
          await addDoc(teachersRef, {
            ...t,
            tags: t.tags || [],
            committees: t.committees || [],
            createdAt: Date.now(),
          });
        }
        return newTeachersList.length;
      } catch (error) {
        console.error('Error replacing teachers batch in Firestore:', error);
      }
    }

    const formatted: Teacher[] = newTeachersList.map((t, idx) => ({
      ...t,
      tags: t.tags || [],
      committees: t.committees || [],
      id: 'teacher-' + Date.now() + '-' + idx,
      createdAt: Date.now(),
    }));
    saveLocal(STORAGE_TEACHERS_KEY, formatted, 'TEACHERS_UPDATED');
    return formatted.length;
  },

  async resetTeachersToDefault(): Promise<void> {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const snapshot = await getDocs(teachersRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        for (const t of DEFAULT_TEACHERS) {
          await addDoc(teachersRef, {
            ...t,
            createdAt: Date.now(),
          });
        }
        return;
      } catch (error) {
        console.error('Error resetting teachers to default in Firestore:', error);
      }
    }
    saveLocal(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS, 'TEACHERS_UPDATED');
  },

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<void> {
    if (firestore) {
      try {
        const teacherDoc = doc(firestore, 'teachers', id);
        await updateDoc(teacherDoc, updates);
        return;
      } catch (err) {
        console.error('Error updating teacher:', err);
      }
    }

    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS);
    saveLocal(
      STORAGE_TEACHERS_KEY,
      current.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      'TEACHERS_UPDATED'
    );
  },

  async deleteTeacher(id: string): Promise<void> {
    if (firestore) {
      try {
        const teacherDoc = doc(firestore, 'teachers', id);
        await deleteDoc(teacherDoc);
        return;
      } catch (error) {
        console.error('Error deleting teacher in Firestore:', error);
      }
    }

    const current = getLocal<Teacher[]>(STORAGE_TEACHERS_KEY, DEFAULT_TEACHERS);
    saveLocal(
      STORAGE_TEACHERS_KEY,
      current.filter((t) => t.id !== id),
      'TEACHERS_UPDATED'
    );
  },

  async clearAllTeachers(): Promise<void> {
    if (firestore) {
      try {
        const teachersRef = collection(firestore, 'teachers');
        const snapshot = await getDocs(teachersRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        return;
      } catch (error) {
        console.error('Error clearing teachers in Firestore:', error);
      }
    }
    saveLocal(STORAGE_TEACHERS_KEY, [], 'TEACHERS_UPDATED');
  },

  // ==========================================
  // 2. VISITOR CALLS & MEMOS (Student -> Teacher Door QR)
  // ==========================================
  subscribeCalls(callback: (calls: Call[]) => void): Unsubscribe {
    if (firestore) {
      try {
        const callsRef = collection(firestore, 'calls');
        const q = query(callsRef, orderBy('createdAt', 'desc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const list: Call[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Call, 'id'>),
            }));
            callback(list);
          },
          (error) => {
            console.error('Firestore calls subscription error:', error);
            callback(getLocal<Call[]>(STORAGE_CALLS_KEY, []));
          }
        );
      } catch (err) {
        console.error('Failed to query firestore calls:', err);
      }
    }

    const emit = () => callback(getLocal<Call[]>(STORAGE_CALLS_KEY, []));
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CALLS_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_CALLS_KEY) emit();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  },

  subscribeCall(callId: string, callback: (call: Call | null) => void): Unsubscribe {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'calls', callId);
        return onSnapshot(
          callDoc,
          (docSnap) => {
            if (docSnap.exists()) {
              callback({ id: docSnap.id, ...(docSnap.data() as Omit<Call, 'id'>) });
            } else {
              callback(null);
            }
          },
          (error) => {
            console.error('Firestore single call error:', error);
            const found = getLocal<Call[]>(STORAGE_CALLS_KEY, []).find((c) => c.id === callId);
            callback(found || null);
          }
        );
      } catch (err) {
        console.error('Error subscribing to single call:', err);
      }
    }

    const emit = () => {
      const found = getLocal<Call[]>(STORAGE_CALLS_KEY, []).find((c) => c.id === callId);
      callback(found || null);
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CALLS_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async createCall(callData: Omit<Call, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const payload = {
      ...callData,
      status: 'pending' as CallStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    const newId = 'call-' + Date.now();
    const newCall: Call = { ...payload, id: newId };
    saveLocal(STORAGE_CALLS_KEY, [newCall, ...current], 'CALLS_UPDATED');
    return newId;
  },

  async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'calls', callId);
        await updateDoc(callDoc, { status, updatedAt: Date.now() });
        return;
      } catch (error) {
        console.error('Error updating call status in Firestore:', error);
      }
    }

    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.map((c) => (c.id === callId ? { ...c, status, updatedAt: Date.now() } : c)),
      'CALLS_UPDATED'
    );
  },

  async saveMemo(callId: string, memoContent: string, studentContact?: string): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'calls', callId);
        await updateDoc(callDoc, {
          hasMemo: true,
          memoContent,
          studentContact: studentContact || '',
          updatedAt: Date.now(),
        });
        return;
      } catch (error) {
        console.error('Error saving memo to Firestore:', error);
      }
    }

    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.map((c) =>
        c.id === callId
          ? {
              ...c,
              hasMemo: true,
              memoContent,
              studentContact: studentContact || '',
              updatedAt: Date.now(),
            }
          : c
      ),
      'CALLS_UPDATED'
    );
  },

  async updateCallMemo(callId: string, studentName: string, reason: string): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'calls', callId);
        await updateDoc(callDoc, {
          studentName,
          reason,
          hasMemo: true,
          memoContent: reason,
          updatedAt: Date.now(),
        });
        return;
      } catch (error) {
        console.error('Error updating call memo in Firestore:', error);
      }
    }

    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.map((c) =>
        c.id === callId
          ? {
              ...c,
              studentName,
              reason,
              hasMemo: true,
              memoContent: reason,
              updatedAt: Date.now(),
            }
          : c
      ),
      'CALLS_UPDATED'
    );
  },

  async deleteCall(callId: string): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'calls', callId);
        await deleteDoc(callDoc);
        return;
      } catch (err) {
        console.error('Error deleting call:', err);
      }
    }

    const current = getLocal<Call[]>(STORAGE_CALLS_KEY, []);
    saveLocal(
      STORAGE_CALLS_KEY,
      current.filter((c) => c.id !== callId),
      'CALLS_UPDATED'
    );
  },

  // ==========================================
  // 3. TEACHER -> STUDENT REALTIME CALLING
  // ==========================================
  subscribeTeacherCallsToStudent(
    callback: (calls: TeacherCallToStudent[]) => void,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    if (firestore) {
      try {
        const callsRef = collection(firestore, 'teacher_to_student_calls');
        const q = query(callsRef, orderBy('createdAt', 'desc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const list: TeacherCallToStudent[] = snapshot.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<TeacherCallToStudent, 'id'>) }))
              .filter((c) => {
                if (gradeFilter && c.targetGrade !== 0 && c.targetGrade !== gradeFilter) return false;
                if (classFilter && c.targetClass !== 0 && c.targetClass !== classFilter) return false;
                return true;
              });
            callback(list);
          },
          (err) => {
            console.error('Firestore teacherCallsToStudent error:', err);
            const all = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
            callback(
              all.filter((c) => {
                if (gradeFilter && c.targetGrade !== 0 && c.targetGrade !== gradeFilter) return false;
                if (classFilter && c.targetClass !== 0 && c.targetClass !== classFilter) return false;
                return true;
              })
            );
          }
        );
      } catch (err) {
        console.error('Error subscribing to teacher calls:', err);
      }
    }

    const emit = () => {
      const all = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
      callback(
        all.filter((c) => {
          if (gradeFilter && c.targetGrade !== 0 && c.targetGrade !== gradeFilter) return false;
          if (classFilter && c.targetClass !== 0 && c.targetClass !== classFilter) return false;
          return true;
        })
      );
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TEACHER_CALLS_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async addTeacherCallToStudent(
    callData: Omit<TeacherCallToStudent, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const payload = {
      ...callData,
      status: 'sent' as const,
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const ref = collection(firestore, 'teacher_to_student_calls');
        const docRef = await addDoc(ref, payload);
        return docRef.id;
      } catch (err) {
        console.error('Error adding teacher call in Firestore:', err);
      }
    }

    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    const newId = 'tcall-' + Date.now();
    const newCall: TeacherCallToStudent = { ...payload, id: newId };
    saveLocal(STORAGE_TEACHER_CALLS_KEY, [newCall, ...current], 'TEACHER_CALLS_UPDATED');
    return newId;
  },

  async acknowledgeTeacherCall(callId: string): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'teacher_to_student_calls', callId);
        await updateDoc(callDoc, {
          status: 'acknowledged',
          ackAt: Date.now(),
        });
        return;
      } catch (err) {
        console.error('Error acknowledging call:', err);
      }
    }

    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    saveLocal(
      STORAGE_TEACHER_CALLS_KEY,
      current.map((c) => (c.id === callId ? { ...c, status: 'acknowledged', ackAt: Date.now() } : c)),
      'TEACHER_CALLS_UPDATED'
    );
  },

  async deleteTeacherCall(callId: string): Promise<void> {
    if (firestore) {
      try {
        const callDoc = doc(firestore, 'teacher_to_student_calls', callId);
        await deleteDoc(callDoc);
        return;
      } catch (err) {
        console.error('Error deleting teacher call:', err);
      }
    }

    const current = getLocal<TeacherCallToStudent[]>(STORAGE_TEACHER_CALLS_KEY, []);
    saveLocal(
      STORAGE_TEACHER_CALLS_KEY,
      current.filter((c) => c.id !== callId),
      'TEACHER_CALLS_UPDATED'
    );
  },

  // ==========================================
  // 4. SCHOOL NOTICES & HOMEROOM ANNOUNCEMENTS
  // ==========================================
  subscribeSchoolNotices(
    callback: (notices: SchoolNotice[]) => void,
    gradeFilter?: number,
    classFilter?: number,
    isStudentViewer: boolean = false
  ): Unsubscribe {
    const isNoticeMatching = (n: SchoolNotice) => {
      // If student is viewing, filter out notices directed strictly to teachers only
      if (isStudentViewer && n.targetAudience === 'teachers') {
        return false;
      }

      if (gradeFilter) {
        // If notice has targetGrades array specified
        if (n.targetGrades && n.targetGrades.length > 0) {
          if (!n.targetGrades.includes(gradeFilter)) {
            return false;
          }
        } else if (n.targetGrade !== 0 && n.targetGrade !== gradeFilter) {
          return false;
        }
      }

      if (classFilter && n.targetClass !== 0 && n.targetClass !== classFilter) {
        return false;
      }
      return true;
    };

    if (firestore) {
      try {
        const noticesRef = collection(firestore, 'school_notices');
        const q = query(noticesRef, orderBy('createdAt', 'desc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const list: SchoolNotice[] = snapshot.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<SchoolNotice, 'id'>) }))
              .filter(isNoticeMatching);
            callback(list);
          },
          (err) => {
            console.error('Firestore notices error:', err);
            const all = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, DEFAULT_NOTICES);
            callback(all.filter(isNoticeMatching));
          }
        );
      } catch (err) {
        console.error('Error subscribing to notices:', err);
      }
    }

    const emit = () => {
      const all = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, DEFAULT_NOTICES);
      callback(all.filter(isNoticeMatching));
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NOTICES_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async addSchoolNotice(
    noticeData: Omit<SchoolNotice, 'id' | 'confirmedStudentIds' | 'createdAt'>
  ): Promise<string> {
    const payload = {
      ...noticeData,
      confirmedStudentIds: [],
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const ref = collection(firestore, 'school_notices');
        const docRef = await addDoc(ref, payload);
        return docRef.id;
      } catch (err) {
        console.error('Error adding notice:', err);
      }
    }

    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, DEFAULT_NOTICES);
    const newId = 'notice-' + Date.now();
    const newNotice: SchoolNotice = { ...payload, id: newId };
    saveLocal(STORAGE_NOTICES_KEY, [newNotice, ...current], 'NOTICES_UPDATED');
    return newId;
  },

  async confirmSchoolNotice(noticeId: string, studentKey: string): Promise<void> {
    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, DEFAULT_NOTICES);
    const target = current.find((n) => n.id === noticeId);
    if (!target) return;

    const updatedList = Array.from(new Set([...(target.confirmedStudentIds || []), studentKey]));

    if (firestore) {
      try {
        const noticeDoc = doc(firestore, 'school_notices', noticeId);
        await updateDoc(noticeDoc, { confirmedStudentIds: updatedList });
        return;
      } catch (err) {
        console.error('Error confirming notice in Firestore:', err);
      }
    }

    saveLocal(
      STORAGE_NOTICES_KEY,
      current.map((n) => (n.id === noticeId ? { ...n, confirmedStudentIds: updatedList } : n)),
      'NOTICES_UPDATED'
    );
  },

  async deleteSchoolNotice(noticeId: string): Promise<void> {
    if (firestore) {
      try {
        const noticeDoc = doc(firestore, 'school_notices', noticeId);
        await deleteDoc(noticeDoc);
        return;
      } catch (err) {
        console.error('Error deleting notice:', err);
      }
    }

    const current = getLocal<SchoolNotice[]>(STORAGE_NOTICES_KEY, DEFAULT_NOTICES);
    saveLocal(
      STORAGE_NOTICES_KEY,
      current.filter((n) => n.id !== noticeId),
      'NOTICES_UPDATED'
    );
  },

  // ==========================================
  // 5. STUDENT ATTENDANCE (등교 출결 관리)
  // ==========================================
  subscribeAttendance(
    callback: (records: StudentAttendance[]) => void,
    date?: string,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    const today = date || new Date().toISOString().slice(0, 10);

    if (firestore) {
      try {
        const attRef = collection(firestore, 'student_attendance');
        const q = query(attRef, where('date', '==', today));

        return onSnapshot(
          q,
          (snapshot) => {
            const list: StudentAttendance[] = snapshot.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<StudentAttendance, 'id'>) }))
              .filter((r) => {
                if (gradeFilter && r.grade !== gradeFilter) return false;
                if (classFilter && r.classNum !== classFilter) return false;
                return true;
              });
            callback(list);
          },
          (err) => {
            console.error('Firestore attendance error:', err);
            const all = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
            callback(
              all.filter((r) => {
                if (r.date !== today) return false;
                if (gradeFilter && r.grade !== gradeFilter) return false;
                if (classFilter && r.classNum !== classFilter) return false;
                return true;
              })
            );
          }
        );
      } catch (err) {
        console.error('Error querying attendance:', err);
      }
    }

    const emit = () => {
      const all = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
      callback(
        all.filter((r) => {
          if (r.date !== today) return false;
          if (gradeFilter && r.grade !== gradeFilter) return false;
          if (classFilter && r.classNum !== classFilter) return false;
          return true;
        })
      );
    };
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ATTENDANCE_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async recordAttendance(
    record: Omit<StudentAttendance, 'id' | 'createdAt'>
  ): Promise<string> {
    const payload = {
      ...record,
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const attRef = collection(firestore, 'student_attendance');
        const docRef = await addDoc(attRef, payload);
        return docRef.id;
      } catch (err) {
        console.error('Error recording attendance:', err);
      }
    }

    const current = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
    // Replace if already exists for same student on same date
    const filtered = current.filter(
      (r) => !(r.studentKey === record.studentKey && r.date === record.date)
    );
    const newId = 'att-' + Date.now();
    const newRecord: StudentAttendance = { ...payload, id: newId };
    saveLocal(STORAGE_ATTENDANCE_KEY, [newRecord, ...filtered], 'ATTENDANCE_UPDATED');
    return newId;
  },

  async updateAttendanceStatus(
    recordId: string,
    status: StudentAttendance['status'],
    note?: string
  ): Promise<void> {
    if (firestore) {
      try {
        const attDoc = doc(firestore, 'student_attendance', recordId);
        await updateDoc(attDoc, { status, ...(note !== undefined ? { note } : {}) });
        return;
      } catch (err) {
        console.error('Error updating attendance status:', err);
      }
    }

    const current = getLocal<StudentAttendance[]>(STORAGE_ATTENDANCE_KEY, []);
    saveLocal(
      STORAGE_ATTENDANCE_KEY,
      current.map((r) =>
        r.id === recordId ? { ...r, status, ...(note !== undefined ? { note } : {}) } : r
      ),
      'ATTENDANCE_UPDATED'
    );
  },

  // ==========================================
  // 6. TEACHER WORK NOTES & AGGREGATION
  // ==========================================
  subscribeWorkNotes(callback: (notes: TeacherWorkNote[]) => void): Unsubscribe {
    if (firestore) {
      try {
        const notesRef = collection(firestore, 'teacher_work_notes');
        const q = query(notesRef, orderBy('createdAt', 'desc'));

        return onSnapshot(
          q,
          (snapshot) => {
            const list: TeacherWorkNote[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<TeacherWorkNote, 'id'>),
            }));
            callback(list);
          },
          (err) => {
            console.error('Firestore work notes error:', err);
            callback(getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, DEFAULT_WORK_NOTES));
          }
        );
      } catch (err) {
        console.error('Error querying work notes:', err);
      }
    }

    const emit = () => callback(getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, DEFAULT_WORK_NOTES));
    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'WORK_NOTES_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async addWorkNote(note: Omit<TeacherWorkNote, 'id' | 'responses' | 'createdAt'>): Promise<string> {
    const payload = {
      ...note,
      responses: {},
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const ref = collection(firestore, 'teacher_work_notes');
        const docRef = await addDoc(ref, payload);
        return docRef.id;
      } catch (err) {
        console.error('Error adding work note:', err);
      }
    }

    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, DEFAULT_WORK_NOTES);
    const newId = 'wnote-' + Date.now();
    const newNote: TeacherWorkNote = { ...payload, id: newId };
    saveLocal(STORAGE_WORK_NOTES_KEY, [newNote, ...current], 'WORK_NOTES_UPDATED');
    return newId;
  },

  async respondWorkNote(
    noteId: string,
    key: string, // teacherName or classKey '1-3'
    response: WorkNoteResponse
  ): Promise<void> {
    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, DEFAULT_WORK_NOTES);
    const target = current.find((n) => n.id === noteId);
    const updatedResponses = { ...(target?.responses || {}), [key]: response };

    if (firestore) {
      try {
        const noteDoc = doc(firestore, 'teacher_work_notes', noteId);
        await updateDoc(noteDoc, { responses: updatedResponses });
        return;
      } catch (err) {
        console.error('Error responding to work note:', err);
      }
    }

    saveLocal(
      STORAGE_WORK_NOTES_KEY,
      current.map((n) => (n.id === noteId ? { ...n, responses: updatedResponses } : n)),
      'WORK_NOTES_UPDATED'
    );
  },

  async deleteWorkNote(noteId: string): Promise<void> {
    if (firestore) {
      try {
        const noteDoc = doc(firestore, 'teacher_work_notes', noteId);
        await deleteDoc(noteDoc);
        return;
      } catch (err) {
        console.error('Error deleting work note:', err);
      }
    }

    const current = getLocal<TeacherWorkNote[]>(STORAGE_WORK_NOTES_KEY, DEFAULT_WORK_NOTES);
    saveLocal(
      STORAGE_WORK_NOTES_KEY,
      current.filter((n) => n.id !== noteId),
      'WORK_NOTES_UPDATED'
    );
  },

  // ==========================================
  // 7. STUDENT ROSTER (학생 학적 명렬)
  // ==========================================
  subscribeStudents(
    callback: (students: StudentRecord[]) => void,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    if (firestore) {
      try {
        const studentsRef = collection(firestore, 'students_roster');
        let q = query(studentsRef, orderBy('studentNumber', 'asc'));

        if (gradeFilter && gradeFilter > 0) {
          q = query(q, where('grade', '==', gradeFilter));
        }
        if (classFilter && classFilter > 0) {
          q = query(q, where('classNum', '==', classFilter));
        }

        return onSnapshot(
          q,
          (snapshot) => {
            const list: StudentRecord[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<StudentRecord, 'id'>),
            }));
            // Sort by grade, class, number
            list.sort((a, b) => {
              if (a.grade !== b.grade) return a.grade - b.grade;
              if (a.classNum !== b.classNum) return a.classNum - b.classNum;
              return a.studentNumber - b.studentNumber;
            });
            callback(list);
          },
          (err) => {
            console.error('Firestore students subscription error:', err);
            this.fallbackStudentsCallback(callback, gradeFilter, classFilter);
          }
        );
      } catch (err) {
        console.error('Error querying students:', err);
      }
    }

    return this.fallbackStudentsCallback(callback, gradeFilter, classFilter);
  },

  fallbackStudentsCallback(
    callback: (students: StudentRecord[]) => void,
    gradeFilter?: number,
    classFilter?: number
  ): Unsubscribe {
    const emit = () => {
      let current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);
      if (gradeFilter && gradeFilter > 0) {
        current = current.filter((s) => s.grade === gradeFilter);
      }
      if (classFilter && classFilter > 0) {
        current = current.filter((s) => s.classNum === classFilter);
      }
      current.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        if (a.classNum !== b.classNum) return a.classNum - b.classNum;
        return a.studentNumber - b.studentNumber;
      });
      callback(current);
    };

    emit();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'STUDENTS_UPDATED') emit();
    };
    channel?.addEventListener('message', handleMessage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
    };
  },

  async addStudent(student: Omit<StudentRecord, 'id' | 'createdAt'>): Promise<string> {
    const payload = {
      ...student,
      createdAt: Date.now(),
    };

    if (firestore) {
      try {
        const ref = collection(firestore, 'students_roster');
        const docRef = await addDoc(ref, payload);
        return docRef.id;
      } catch (err) {
        console.error('Error adding student:', err);
      }
    }

    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);
    const newId = 'std-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newStudent: StudentRecord = { ...payload, id: newId };
    saveLocal(STORAGE_STUDENTS_KEY, [...current, newStudent], 'STUDENTS_UPDATED');
    return newId;
  },

  async updateStudent(studentId: string, updates: Partial<StudentRecord>): Promise<void> {
    if (firestore) {
      try {
        const studentDoc = doc(firestore, 'students_roster', studentId);
        await updateDoc(studentDoc, updates);
        return;
      } catch (err) {
        console.error('Error updating student in Firestore:', err);
      }
    }

    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.map((s) => (s.id === studentId ? { ...s, ...updates } : s)),
      'STUDENTS_UPDATED'
    );
  },

  async deleteStudent(studentId: string): Promise<void> {
    if (firestore) {
      try {
        const studentDoc = doc(firestore, 'students_roster', studentId);
        await deleteDoc(studentDoc);
        return;
      } catch (err) {
        console.error('Error deleting student:', err);
      }
    }

    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.filter((s) => s.id !== studentId),
      'STUDENTS_UPDATED'
    );
  },

  async bulkImportStudents(
    students: Omit<StudentRecord, 'id' | 'createdAt'>[],
    options?: { overwriteExisting?: boolean; clearTargetClassesFirst?: boolean }
  ): Promise<number> {
    if (firestore) {
      try {
        const ref = collection(firestore, 'students_roster');
        for (const s of students) {
          await addDoc(ref, { ...s, createdAt: Date.now() });
        }
        return students.length;
      } catch (err) {
        console.error('Error bulk importing students to Firestore:', err);
      }
    }

    let current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);

    if (options?.clearTargetClassesFirst) {
      // Find all unique (grade, classNum) in the new import
      const targetPairs = new Set(students.map((s) => `${s.grade}-${s.classNum}`));
      current = current.filter((s) => !targetPairs.has(`${s.grade}-${s.classNum}`));
    } else if (options?.overwriteExisting) {
      // Upsert by key (grade-class-number)
      const importKeyMap = new Map(students.map((s) => [`${s.grade}-${s.classNum}-${s.studentNumber}`, s]));
      current = current.filter((s) => !importKeyMap.has(`${s.grade}-${s.classNum}-${s.studentNumber}`));
    }

    const newStudents: StudentRecord[] = students.map((s, idx) => ({
      ...s,
      id: `std-bulk-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      createdAt: Date.now(),
    }));

    const combined = [...current, ...newStudents];
    combined.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      if (a.classNum !== b.classNum) return a.classNum - b.classNum;
      return a.studentNumber - b.studentNumber;
    });

    saveLocal(STORAGE_STUDENTS_KEY, combined, 'STUDENTS_UPDATED');
    return newStudents.length;
  },

  async clearClassStudents(grade: number, classNum: number): Promise<void> {
    const current = getLocal<StudentRecord[]>(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS);
    saveLocal(
      STORAGE_STUDENTS_KEY,
      current.filter((s) => !(s.grade === grade && s.classNum === classNum)),
      'STUDENTS_UPDATED'
    );
  },

  async clearAllStudents(): Promise<void> {
    saveLocal(STORAGE_STUDENTS_KEY, [], 'STUDENTS_UPDATED');
  },

  async resetDefaultStudents(): Promise<void> {
    if (firestore) {
      try {
        const ref = collection(firestore, 'students_roster');
        const snapshot = await getDocs(ref);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        for (const s of DEFAULT_STUDENTS) {
          await addDoc(ref, { ...s, createdAt: Date.now() });
        }
        return;
      } catch (err) {
        console.error('Error resetting students in Firestore:', err);
      }
    }
    saveLocal(STORAGE_STUDENTS_KEY, DEFAULT_STUDENTS, 'STUDENTS_UPDATED');
  },
};
