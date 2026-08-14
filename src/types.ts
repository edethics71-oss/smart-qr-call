export type CallStatus = 'pending' | 'accepted' | 'ignored' | 'auto-away';

export interface Teacher {
  id: string;
  name: string;
  room: string;
  subject?: string;
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
  createdAt: number;
  updatedAt?: number;
}

export type ThemeType = 'vibrant-palette' | 'vibrant-dark';

export interface RoomOption {
  name: string;
  count: number;
}
