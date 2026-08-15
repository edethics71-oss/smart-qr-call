export type CallStatus = 'pending' | 'accepted' | 'ignored' | 'auto-away';

export interface Teacher {
  id: string;
  name: string;
  room: string;
  subject?: string;
  tags?: string[]; // e.g. ['1학년 담임', '수학과', '부장교사', '기획위원회', '교육과정위원회']
  createdAt?: number;
}

export interface Call {
  id: string;
  room: string;
  teacherName: string;
  status: CallStatus;
  studentName: string;
  reason: string;
  hasMemo: boolean;
  memoContent?: string;
  studentContact?: string;
  createdAt: number;
  updatedAt?: number;
}

export type ThemeType = 'vibrant-palette' | 'vibrant-dark';

export interface RoomOption {
  name: string;
  count: number;
}

// -------------------------------------------------------------
// 1. Teacher -> Student Realtime Calling
// -------------------------------------------------------------
export interface TeacherCallToStudent {
  id: string;
  teacherName: string;
  teacherRoom: string;
  targetGrade: number; // 1, 2, 3
  targetClass: number; // 1 ~ 12
  targetNumber?: number; // 0 = class-wide or specific number
  targetStudentName: string; // e.g. '김철수' or '1반 학생 전체'
  message: string;
  presetType?: 'urgent' | 'break' | 'cleaning' | 'counsel' | 'custom';
  status: 'sent' | 'acknowledged';
  ackAt?: number;
  createdAt: number;
}

// -------------------------------------------------------------
// 2. School Notices & Homeroom Announcements
// -------------------------------------------------------------
export type NoticeType =
  | 'homeroom_morning' // 조회 알림장
  | 'homeroom_closing' // 종례 알림장
  | 'class'            // 학급 전달사항
  | 'grade'            // 학년 전달사항
  | 'department'       // 부서별 전달사항 (교무부, 안전부, 진로부 등)
  | 'school';          // 전교생 공지

export interface SchoolNotice {
  id: string;
  type: NoticeType;
  title: string;
  content: string;
  senderName: string;
  senderRole: string; // e.g. '1학년 3반 담임', '교무기획부장', '1학년 부장'
  targetGrade: number; // 0 = 전교생/전학년
  targetClass: number; // 0 = 학년 전체
  targetDepartment?: string;
  isUrgent?: boolean;
  date: string; // YYYY-MM-DD
  confirmedStudentIds: string[]; // e.g. ['1-3-15-김철수', '1-3-22-이영희']
  createdAt: number;
}

// -------------------------------------------------------------
// 3. Morning Attendance Check-in
// -------------------------------------------------------------
export interface StudentAttendance {
  id: string;
  studentKey: string; // '1-3-15-김철수'
  grade: number;
  classNum: number;
  studentNumber: number;
  studentName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm:ss
  status: 'present' | 'late' | 'excused' | 'absent';
  method: 'wifi' | 'gps' | 'manual';
  note?: string;
  createdAt: number;
}

// -------------------------------------------------------------
// 4. Teacher Work Notes & Data Aggregation
// -------------------------------------------------------------
export type WorkNoteType = 'notice' | 'class_check' | 'data_aggregate' | 'vote';

export interface WorkNoteResponse {
  teacherId?: string;
  teacherName: string;
  role?: string;
  isDone: boolean;
  value?: string; // input text (item/quantity), vote choice ('찬성'/'반대'), etc.
  updatedAt: number;
}

export interface TeacherWorkNote {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  title: string;
  content: string;
  noteType: WorkNoteType;
  targetGroups: string[]; // e.g. ['1학년 담임', '기획위원회', '전교직원']
  deadline?: string;
  voteOptions?: string[]; // e.g. ['찬성', '반대'] or ['1안', '2안', '3안']
  aggregateFieldLabel?: string; // e.g. '필요 물품 및 수량'
  responses: Record<string, WorkNoteResponse>; // key: teacherName or '1-3'
  createdAt: number;
}

export interface StudentProfile {
  grade: number;
  classNum: number;
  studentNumber: number;
  name: string;
}
