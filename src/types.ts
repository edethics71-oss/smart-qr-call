export type CallStatus = 'pending' | 'accepted' | 'wait_outside' | 'ignored' | 'auto-away';

export interface Teacher {
  id: string;
  name: string;
  room: string;
  subject?: string;
  department?: string; // 소속 부서 (교무기획부, 학생안전부, 진로진학부 등)
  grade?: number; // 1, 2, 3 (0 또는 undefined = 비담임)
  classNum?: number; // 1 ~ 7
  homeroomRole?: string; // e.g. '1학년 3반 담임', '2학년 부장', '비담임'
  duty?: string; // 담당 업무 (나이스 학적, 평가계, 학폭예방 등)
  committees?: string[]; // 소속 위원회 e.g. ['기획위원회', '교육과정위원회', '인사자문위원회']
  extension?: string; // 내선 번호
  email?: string;
  notes?: string; // 비고
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
  | 'grade'            // 학년 전달사항 (특정 학년 복수 선택 가능: 1, 2, 3학년)
  | 'department'       // 부서별 전달사항 (교원, 학생/학년별 수신 대상 지정 가능)
  | 'school';          // 전교생 공지

export interface NoticeAttachment {
  name: string;
  size?: string;
  type?: string;
  dataUrl?: string; // base64 or blob url for direct download
}

export interface SchoolNotice {
  id: string;
  type: NoticeType;
  title: string;
  content: string;
  senderName: string;
  senderRole: string; // e.g. '1학년 3반 담임', '교무기획부장', '1·2학년 부장'
  targetGrade: number; // 0 = 전교생/전학년 (레거시 및 단일 지정 호환)
  targetGrades?: number[]; // [1, 2], [2, 3], [1, 2, 3] 등 복수 학년 지원 (빈 배열/미지정 시 전체)
  targetClass: number; // 0 = 학년 전체
  targetDepartment?: string;
  targetAudience?: 'all' | 'teachers' | 'students'; // 교원 대상 / 학생 대상 / 전체
  isUrgent?: boolean;
  date: string; // YYYY-MM-DD
  confirmedStudentIds: string[]; // e.g. ['1-3-15-김철수', '1-3-22-이영희']
  // Attachments & Application/Survey Link
  attachments?: NoticeAttachment[];
  linkUrl?: string; // 별도 신청 / 설문 링크 URL
  linkLabel?: string; // 버튼 문구 e.g. '선착순 신청하기', '온라인 설문지 작성'
  isFirstCome?: boolean; // 선착순 신청 플래그
  deadline?: string; // 마감 일시 또는 선착순 인원 안내
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
  createdAt?: number;
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
  targetGroups?: string[]; // e.g. ['1학년 담임', '기획위원회', '전교직원']
  deadline?: string;
  voteOptions?: string[]; // e.g. ['찬성', '반대'] or ['1안', '2안', '3안']
  aggregateFieldLabel?: string; // e.g. '필요 물품 및 수량'
  responses?: Record<string, WorkNoteResponse>; // key: teacherName or '1-3'
  createdAt?: number;
}

export interface StudentProfile {
  grade: number;
  classNum: number;
  studentNumber: number;
  name: string;
}

// -------------------------------------------------------------
// 5. School Student Roster (학적 학생 명렬)
// -------------------------------------------------------------
export interface StudentRecord {
  id: string;
  grade: number; // 1, 2, 3
  classNum: number; // 1 ~ 7
  studentNumber: number; // 1 ~ 45
  name: string;
  gender?: 'M' | 'F' | string;
  status?: 'active' | 'transferred' | 'leave'; // 재학, 전출, 휴학
  parentContact?: string;
  notes?: string;
  createdAt?: number;
}
