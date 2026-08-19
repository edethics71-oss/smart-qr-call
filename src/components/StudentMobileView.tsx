import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  User,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Search,
  School,
  Check,
  UserCheck,
  Wifi,
  MapPin,
  Megaphone,
  CheckCheck,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Paperclip,
  Link2,
  ExternalLink,
  Download
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type {
  Teacher,
  Call,
  ThemeType,
  StudentProfile,
  TeacherCallToStudent,
  SchoolNotice,
  StudentAttendance,
  StudentRecord,
} from '../types';

interface StudentMobileViewProps {
  theme: ThemeType;
  initialRoom: string;
  onNavigateToTeacher?: () => void;
}

type StudentTab = 'visit' | 'attendance' | 'notices';

const PROFILE_STORAGE_KEY = 'edu_student_profile_v1';

export const StudentMobileView: React.FC<StudentMobileViewProps> = ({
  theme,
  initialRoom,
  onNavigateToTeacher,
}) => {
  const isLight = theme === 'vibrant-palette';

  // Active student tab
  const [activeTab, setActiveTab] = useState<StudentTab>('visit');

  // QR Parameters parsing
  const qrParams = useMemo(() => {
    if (typeof window === 'undefined') return { grade: 0, classNum: 0, isClassQr: false };
    const searchPart = window.location.search;
    const hashPart = window.location.hash;
    const queryString = searchPart || (hashPart.includes('?') ? hashPart.substring(hashPart.indexOf('?')) : '');
    const params = new URLSearchParams(queryString);
    const g = parseInt(params.get('grade') || '0', 10);
    const c = parseInt(params.get('class') || params.get('classNum') || '0', 10);
    return {
      grade: g,
      classNum: c,
      isClassQr: g > 0 && c > 0,
    };
  }, []);

  // Student Profile State (Supports auto-initialization from URL query params)
  const [profile, setProfile] = useState<StudentProfile>(() => {
    if (typeof window !== 'undefined') {
      // 1. Check URL parameters from hash or search
      const queryString = window.location.search || (window.location.hash.includes('?') ? window.location.hash.substring(window.location.hash.indexOf('?')) : '');
      const params = new URLSearchParams(queryString);
      const paramName = params.get('name') || params.get('stdName');
      const paramGrade = parseInt(params.get('grade') || '0', 10);
      const paramClass = parseInt(params.get('class') || params.get('classNum') || '0', 10);
      const paramNum = parseInt(params.get('num') || params.get('studentNumber') || '0', 10);

      // Check localStorage
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      let parsedSaved: StudentProfile | null = null;
      if (saved) {
        try {
          parsedSaved = JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }

      // 1. Direct login with full student details in URL (개인 전용 QR)
      if (paramName && paramGrade && paramClass) {
        const autoProfile = {
          grade: paramGrade,
          classNum: paramClass,
          studentNumber: paramNum || 1,
          name: paramName,
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(autoProfile));
        return autoProfile;
      }

      // 2. Class QR scan (?grade=1&class=1 or ?grade=1&classNum=1)
      if (paramGrade && paramClass) {
        if (parsedSaved && parsedSaved.grade === paramGrade && parsedSaved.classNum === paramClass && parsedSaved.name) {
          return parsedSaved;
        } else {
          // If class QR is scanned and saved profile is from different class or empty, reset name so student picks themselves
          const newProfile = { grade: paramGrade, classNum: paramClass, studentNumber: 1, name: '' };
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
          return newProfile;
        }
      }

      if (parsedSaved && parsedSaved.name) {
        return parsedSaved;
      }
    }
    return { grade: 1, classNum: 1, studentNumber: 1, name: '' };
  });

  const [isEditingProfile, setIsEditingProfile] = useState(() => !profile.name.trim());
  const [tempProfile, setTempProfile] = useState<StudentProfile>(profile);
  const [tempClassRoster, setTempClassRoster] = useState<StudentRecord[]>([]);
  const [isSyncingRoster, setIsSyncingRoster] = useState(false);

  const handleForceRefreshRoster = async () => {
    setIsSyncingRoster(true);
    try {
      const fresh = await dbService.forceRefreshStudents(tempProfile.grade, tempProfile.classNum);
      setTempClassRoster(fresh);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingRoster(false);
    }
  };

  // Always subscribe to student roster for current grade/class to validate and provide easy selection
  useEffect(() => {
    const unsub = dbService.subscribeStudents(
      (list) => {
        setTempClassRoster(list);
        // If current profile name is not in the registered list (e.g. old test student or new roster imported), prompt selection
        if (list.length > 0) {
          if (profile.name) {
            const match = list.some((s) => s.name === profile.name && s.studentNumber === profile.studentNumber);
            if (!match) {
              // Old student profile does not exist in new roster, prompt to pick and clear stale profile
              setIsEditingProfile(true);
              setProfile((prev) => ({ ...prev, name: '' }));
              setTempProfile((prev) => ({ ...prev, name: '' }));
              localStorage.removeItem(PROFILE_STORAGE_KEY);
            }
          } else {
            // No name set yet, keep editor open so student can pick from roster
            setIsEditingProfile(true);
          }
        }
      },
      tempProfile.grade,
      tempProfile.classNum
    );
    return () => unsub();
  }, [tempProfile.grade, tempProfile.classNum, profile.name, profile.studentNumber]);

  // Listen to live URL changes (e.g. scanning QR code while app is in background or foreground)
  useEffect(() => {
    const handleUrlUpdate = () => {
      const queryString = window.location.search || (window.location.hash.includes('?') ? window.location.hash.substring(window.location.hash.indexOf('?')) : '');
      const params = new URLSearchParams(queryString);
      const paramName = params.get('name') || params.get('stdName');
      const paramGrade = parseInt(params.get('grade') || '0', 10);
      const paramClass = parseInt(params.get('class') || params.get('classNum') || '0', 10);
      const paramNum = parseInt(params.get('num') || params.get('studentNumber') || '0', 10);

      if (paramName && paramGrade && paramClass) {
        const autoProfile = {
          grade: paramGrade,
          classNum: paramClass,
          studentNumber: paramNum || 1,
          name: paramName,
        };
        setProfile(autoProfile);
        setTempProfile(autoProfile);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(autoProfile));
        setIsEditingProfile(false);
      } else if (paramGrade && paramClass) {
        setTempProfile((prev) => ({ ...prev, grade: paramGrade, classNum: paramClass, name: '' }));
        setIsEditingProfile(true);
      }
    };

    window.addEventListener('hashchange', handleUrlUpdate);
    window.addEventListener('popstate', handleUrlUpdate);
    return () => {
      window.removeEventListener('hashchange', handleUrlUpdate);
      window.removeEventListener('popstate', handleUrlUpdate);
    };
  }, []);

  // Save student profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProfile.name.trim()) {
      alert('학생 성명을 입력하거나 명렬표에서 본인 이름을 선택해주세요.');
      return;
    }
    setProfile(tempProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(tempProfile));
    setIsEditingProfile(false);
  };

  const handleSelectStudentFromRoster = (std: StudentRecord) => {
    const selected: StudentProfile = {
      grade: std.grade,
      classNum: std.classNum,
      studentNumber: std.studentNumber,
      name: std.name,
    };
    setProfile(selected);
    setTempProfile(selected);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(selected));
    setIsEditingProfile(false);
  };

  const handleResetStudentProfile = () => {
    const resetProf: StudentProfile = {
      grade: profile.grade || 1,
      classNum: profile.classNum || 1,
      studentNumber: 1,
      name: '',
    };
    setProfile(resetProf);
    setTempProfile(resetProf);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setIsEditingProfile(true);
  };

  // -------------------------------------------------------------
  // TAB 1: TEACHER VISIT & CALLING (교무실 앞 방문)
  // -------------------------------------------------------------
  const [currentRoom, setCurrentRoom] = useState<string>(initialRoom || '');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Distinct rooms from actual teachers
  const [allRooms, setAllRooms] = useState<string[]>([]);
  useEffect(() => {
    const unsubscribe = dbService.subscribeTeachers((all) => {
      const roomsSet = new Set<string>();
      all.forEach((t) => {
        if (t.room && t.room.trim()) roomsSet.add(t.room.trim());
      });
      const roomList = Array.from(roomsSet);
      setAllRooms(roomList);
      if (roomList.length > 0 && (!currentRoom || !roomList.includes(currentRoom))) {
        setCurrentRoom(roomList[0]);
      }
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // Active visit call tracking state
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isCalling, setIsCalling] = useState(false);

  // Memo writing state
  const [isWritingMemo, setIsWritingMemo] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [memoStudentName, setMemoStudentName] = useState('');
  const [memoGradeClass, setMemoGradeClass] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmittingMemo, setIsSubmittingMemo] = useState(false);
  const [memoSubmitted, setMemoSubmitted] = useState(false);

  // Auto-fill memo with student profile
  useEffect(() => {
    if (profile.name) {
      setMemoStudentName(profile.name);
      setMemoGradeClass(`${profile.grade}학년 ${profile.classNum}반 ${profile.studentNumber}번`);
    }
  }, [profile]);

  // Load teachers for current room
  useEffect(() => {
    const unsubscribe = dbService.subscribeTeachers((list) => {
      setTeachers(list);
    }, currentRoom);

    return () => unsubscribe();
  }, [currentRoom]);

  // Subscribe to the active call's status changes in real-time
  useEffect(() => {
    if (!activeCallId) {
      setActiveCall(null);
      return;
    }

    const unsubscribe = dbService.subscribeCall(activeCallId, (callDoc) => {
      if (callDoc) {
        setActiveCall(callDoc);
        if (callDoc.hasMemo) {
          setMemoSubmitted(true);
        }
      }
    });

    return () => unsubscribe();
  }, [activeCallId]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  const handleStartCall = async () => {
    if (!selectedTeacher) {
      alert('호출할 선생님을 선택해주세요.');
      return;
    }

    setIsCalling(true);
    try {
      const studentDisplayName = profile.name
        ? `${profile.grade}학년 ${profile.classNum}반 ${profile.studentNumber ? profile.studentNumber + '번 ' : ''}${profile.name}`
        : `${profile.grade}학년 ${profile.classNum}반 방문 학생`;

      const callId = await dbService.createCall({
        room: currentRoom,
        teacherName: selectedTeacher.name,
        studentName: studentDisplayName,
        reason: '',
        hasMemo: false,
      });

      setActiveCallId(callId);
      setIsWritingMemo(false);
      setMemoSubmitted(false);
    } catch (err) {
      console.error('Failed to create call:', err);
      alert('호출 신호 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCalling(false);
    }
  };

  const handleSubmitMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAgreed) {
      alert('개인정보 수집 및 교무 전달에 동의해주세요.');
      return;
    }
    if (!memoStudentName.trim()) {
      alert('학생 이름을 입력해주세요.');
      return;
    }
    if (!reason.trim()) {
      alert('방문 사유를 입력해주세요.');
      return;
    }
    if (!activeCallId) return;

    setIsSubmittingMemo(true);
    try {
      const fullStudentIdentifier = memoGradeClass.trim()
        ? `${memoGradeClass.trim()} ${memoStudentName.trim()}`
        : memoStudentName.trim();

      await dbService.updateCallMemo(activeCallId, fullStudentIdentifier, reason.trim());
      setMemoSubmitted(true);
      setIsWritingMemo(false);
    } catch (err) {
      console.error('Failed to submit memo:', err);
      alert('메모 저장에 실패했습니다.');
    } finally {
      setIsSubmittingMemo(false);
    }
  };

  const handleResetCall = () => {
    setActiveCallId(null);
    setActiveCall(null);
    setIsWritingMemo(false);
    setMemoSubmitted(false);
    setPrivacyAgreed(false);
    setReason('');
    setSelectedTeacher(null);
  };

  // -------------------------------------------------------------
  // TAB 2: MORNING ATTENDANCE (등교 출결 1초 체크)
  // -------------------------------------------------------------
  const todayStr = new Date().toISOString().slice(0, 10);
  const [todayAttendance, setTodayAttendance] = useState<StudentAttendance | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState('');
  const [wifiSimulated] = useState('Edu-School-5G (교내 인증 네트워크)');

  useEffect(() => {
    const studentKey = `${profile.grade}-${profile.classNum}-${profile.studentNumber}-${profile.name}`;
    const unsubscribe = dbService.subscribeAttendance(
      (records) => {
        const myRecord = records.find((r) => r.studentKey === studentKey);
        setTodayAttendance(myRecord || null);
      },
      todayStr,
      profile.grade,
      profile.classNum
    );
    return () => unsubscribe();
  }, [profile, todayStr]);

  const handlePerformCheckIn = async (method: 'wifi' | 'gps') => {
    if (!profile.name) {
      alert('먼저 상단에서 학생 본인 정보를 저장해주세요.');
      setIsEditingProfile(true);
      return;
    }

    setIsCheckingIn(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 40);

    const studentKey = `${profile.grade}-${profile.classNum}-${profile.studentNumber}-${profile.name}`;

    try {
      await dbService.recordAttendance({
        studentKey,
        grade: profile.grade,
        classNum: profile.classNum,
        studentNumber: profile.studentNumber,
        studentName: profile.name,
        date: todayStr,
        checkInTime: timeStr,
        status: isLate ? 'late' : 'present',
        method,
        note: method === 'wifi' ? '교내 Wi-Fi 자동인증' : '학교 교문 GPS 인증',
      });

      setCheckInSuccessMsg(`🎉 ${timeStr} 등교 ${isLate ? '지각' : '정상 출석'} 인증이 완료되었습니다!`);
      setTimeout(() => setCheckInSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      alert('출석 체크에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: TEACHER CALLS & NOTICES (선생님 호출 및 전달사항 알림)
  // -------------------------------------------------------------
  const [teacherCalls, setTeacherCalls] = useState<TeacherCallToStudent[]>([]);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const studentKey = `${profile.grade}-${profile.classNum}-${profile.studentNumber}-${profile.name}`;

  // Subscribe to teacher calls for my grade & class
  useEffect(() => {
    const unsubscribe = dbService.subscribeTeacherCallsToStudent((calls) => {
      // Filter for me or my whole class
      const relevant = calls.filter((c) => {
        if (c.targetGrade !== 0 && c.targetGrade !== profile.grade) return false;
        if (c.targetClass !== 0 && c.targetClass !== profile.classNum) return false;
        if (c.targetNumber && c.targetNumber !== 0 && c.targetNumber !== profile.studentNumber) {
          if (c.targetStudentName && !c.targetStudentName.includes(profile.name)) {
            return false;
          }
        }
        return true;
      });
      setTeacherCalls(relevant);
    });
    return () => unsubscribe();
  }, [profile]);

  // Subscribe to notices for my grade & class
  useEffect(() => {
    const unsubscribe = dbService.subscribeSchoolNotices(
      (list) => {
        setNotices(list);
      },
      profile.grade,
      profile.classNum,
      true // isStudentViewer
    );
    return () => unsubscribe();
  }, [profile]);

  // Unacknowledged direct urgent teacher call popup
  const urgentDirectCall = useMemo(() => {
    return teacherCalls.find(
      (c) =>
        c.status === 'sent' &&
        (c.targetNumber === profile.studentNumber ||
          c.targetStudentName.includes(profile.name) ||
          c.targetClass === profile.classNum)
    );
  }, [teacherCalls, profile]);

  const handleAcknowledgeCall = async (callId: string) => {
    try {
      await dbService.acknowledgeTeacherCall(callId);
      alert('선생님께 확인 완료 및 지금 교무실로 출발 신호가 전송되었습니다! 🏃');
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmNotice = async (noticeId: string) => {
    try {
      await dbService.confirmSchoolNotice(noticeId, studentKey);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-md mx-auto px-3.5 py-4 sm:py-6 pb-24">
      {/* 🌟 학급 전용 QR 접속 시 상단 안내 배지 */}
      {qrParams.isClassQr && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{qrParams.grade}학년 {qrParams.classNum}반 QR</strong>로 접속하셨어요 — 학년·반은 자동으로 설정됩니다.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shrink-0">
            자동인식
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GLOBAL URGENT CALL MODAL / BANNER (교사 긴급 호출 발생 시)    */}
      {/* ------------------------------------------------------------- */}
      {urgentDirectCall && (
        <div className="mb-5 animate-bounce-short">
          <div className="rounded-3xl p-5 border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/80 shadow-xl text-rose-900 dark:text-rose-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-rose-600 text-white animate-pulse">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                  선생님 호출 알림
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {urgentDirectCall.teacherName} 선생님께서 호출하셨습니다!
                </h3>
              </div>
            </div>

            <div className="my-3 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800 text-xs space-y-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">방문 장소</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  📍 {urgentDirectCall.teacherRoom}
                </span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                "{urgentDirectCall.message}"
              </div>
            </div>

            <button
              onClick={() => handleAcknowledgeCall(urgentDirectCall.id)}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>확인 완료 & 지금 교무실로 출발 🏃</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HEADER: APP TITLE & STUDENT PROFILE CARD                      */}
      {/* ------------------------------------------------------------- */}
      <div
        id="student-header"
        className={`rounded-3xl p-4 sm:p-5 border text-center shadow-sm mb-4 transition-all ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-900 shadow-indigo-100/50'
            : 'bg-slate-900 border-slate-800 text-white shadow-xl'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <div
              className={`p-2.5 rounded-2xl border ${
                isLight
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60'
              }`}
            >
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>스마트 학생 모바일 PWA</span>
              </h1>
              <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                등교 출결 • 교무실 방문 • 알림장 통합
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTempProfile(profile);
                setIsEditingProfile(!isEditingProfile);
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                profile.name
                  ? isLight
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-rose-500 text-white border-rose-600 animate-pulse'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>
                {profile.name
                  ? `${profile.grade}-${profile.classNum} ${profile.studentNumber}번 ${profile.name}`
                  : '⚠️ 학생 선택 필요'}
              </span>
            </button>

            {profile.name && (
              <button
                onClick={handleResetStudentProfile}
                title="학생 정보 변경 / 다시 선택"
                className={`p-1.5 rounded-xl border transition cursor-pointer text-[10px] ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Editor Collapse */}
        {isEditingProfile && (
          <div
            className={`mt-3 pt-3 border-t text-left text-xs space-y-3 animate-in fade-in ${
              isLight ? 'border-indigo-100' : 'border-slate-800'
            }`}
          >
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <strong>학생 본인 선택 (최초 1회 등록)</strong>
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">스마트폰에 자동 기억됨</span>
            </div>

            {/* Quick 1-Tap Student Selection from Registered Roster */}
            {tempClassRoster.length > 0 ? (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>👇 {tempProfile.grade}학년 {tempProfile.classNum}반 명렬표 ({tempClassRoster.length}명)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleForceRefreshRoster}
                    disabled={isSyncingRoster}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold hover:bg-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSyncingRoster ? 'animate-spin' : ''}`} />
                    <span>{isSyncingRoster ? '동기화 중...' : '최신 갱신'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  {tempClassRoster.map((std) => (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => handleSelectStudentFromRoster(std)}
                      className={`p-2 rounded-xl border text-xs font-black transition cursor-pointer text-left flex items-center justify-between ${
                        profile.name === std.name && profile.studentNumber === std.studentNumber && profile.classNum === std.classNum
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : isLight
                          ? 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-500 hover:bg-slate-700'
                      }`}
                    >
                      <span>{std.studentNumber}번 {std.name}</span>
                      {profile.name === std.name && profile.studentNumber === std.studentNumber && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  💡 본인 이름을 터치하면 즉시 설정되어 출결, 공지사항, 교무실 방문이 가능합니다.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold">⚠️ {tempProfile.grade}학년 {tempProfile.classNum}반에 등록된 학생 명렬이 없습니다.</span>
                  <button
                    type="button"
                    onClick={handleForceRefreshRoster}
                    disabled={isSyncingRoster}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold hover:bg-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSyncingRoster ? 'animate-spin' : ''}`} />
                    <span>{isSyncingRoster ? '확인 중...' : '새로고침'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  선생님이 등록하신 학년/반과 일치하는지 아래 학년·반 선택을 확인하시거나, 직접 번호와 이름을 입력하세요.
                </p>
              </div>
            )}

            {/* Manual Form Entry (Optional fallback) */}
            <form onSubmit={handleSaveProfile} className="space-y-2.5 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">학년</label>
                  <select
                    value={tempProfile.grade}
                    onChange={(e) => setTempProfile({ ...tempProfile, grade: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      isLight
                        ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">학급(반)</label>
                  <select
                    value={tempProfile.classNum}
                    onChange={(e) => setTempProfile({ ...tempProfile, classNum: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      isLight
                        ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        {c}반
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">출석번호</label>
                  <input
                    type="number"
                    min={1}
                    max={45}
                    value={tempProfile.studentNumber}
                    onChange={(e) => setTempProfile({ ...tempProfile, studentNumber: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none ${
                      isLight ? 'bg-indigo-50/50 border-indigo-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">학생 성명 직접 입력</label>
                <input
                  type="text"
                  required
                  value={tempProfile.name}
                  onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                  placeholder="예: 김민수"
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none ${
                    isLight ? 'bg-indigo-50/50 border-indigo-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black cursor-pointer shadow-md transition"
                >
                  직접 입력값으로 저장
                </button>
                {profile.name && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className={`px-4 py-2.5 rounded-xl font-bold border ${
                      isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    닫기
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3 PRIMARY STUDENT TABS SWITCHER                               */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border mb-5 shadow-sm ${
          isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <button
          onClick={() => setActiveTab('visit')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'visit'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isLight
              ? 'text-slate-600 hover:text-indigo-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>방문 접수</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isLight
              ? 'text-slate-600 hover:text-indigo-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>등교 출결</span>
          {todayAttendance?.status === 'present' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 sm:static sm:w-1.5 sm:h-1.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('notices')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'notices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isLight
              ? 'text-slate-600 hover:text-indigo-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>알림장·호출</span>
          {teacherCalls.filter((c) => c.status === 'sent').length > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-500 text-white font-black">
              {teacherCalls.filter((c) => c.status === 'sent').length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: 교무실 앞 방문 호출                                    */}
      {/* ============================================================= */}
      {activeTab === 'visit' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Room Selector Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isLight ? 'bg-indigo-50/70 border-indigo-100' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                현재 방문 교무실:
              </span>
            </div>

            <select
              value={currentRoom}
              onChange={(e) => {
                setCurrentRoom(e.target.value);
                setSelectedTeacher(null);
              }}
              className={`text-xs rounded-xl px-2.5 py-1 outline-none font-bold border cursor-pointer ${
                isLight
                  ? 'bg-white text-indigo-700 border-indigo-200'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              {allRooms.map((r) => (
                <option key={r} value={r}>
                  📍 {r}
                </option>
              ))}
            </select>
          </div>

          {!activeCallId ? (
            /* STEP 1: Select Teacher & Call */
            <div className="space-y-4">
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isLight
                    ? 'bg-white border-indigo-100 text-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                📢 <strong>방문 안내:</strong> 만나실 선생님을 목록에서 선택 후 아래 <strong>[선생님 호출하기]</strong>를 누르면 교무실 내 선생님 PC 화면에 실시간 호출 팝업이 전송됩니다.
              </div>

              {/* Teacher Selector Card */}
              <div
                className={`rounded-3xl border p-4 sm:p-5 ${
                  isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    1단계: 선생님 선택 <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">{filteredTeachers.length}명 대기</span>
                </div>

                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="선생님 성명 또는 교과 검색..."
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none font-medium ${
                      isLight
                        ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 focus:bg-white'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                {filteredTeachers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {filteredTeachers.map((t) => {
                      const isSelected = selectedTeacher?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTeacher(t)}
                          className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-800'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-black text-xs">{t.name} 선생님</div>
                            <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {t.subject || '교과'}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-bold">등록된 선생님이 없습니다.</p>
                    <p className="text-[11px] text-slate-400">교무 관리자 화면에서 교직원 명단을 등록해주세요.</p>
                  </div>
                )}
              </div>

              {/* Call Action Button */}
              <button
                onClick={handleStartCall}
                disabled={!selectedTeacher || isCalling}
                className="w-full py-4 px-4 rounded-2xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Bell className="w-4 h-4" />
                <span>
                  {isCalling
                    ? '호출 신호 전송 중...'
                    : selectedTeacher
                    ? `${selectedTeacher.name} 선생님 호출하기`
                    : '선생님을 먼저 선택해주세요'}
                </span>
              </button>
            </div>
          ) : (
            /* STEP 2 & 3: Active Call State & Memo */
            <div className="space-y-4">
              <div
                className={`rounded-3xl p-6 border text-center ${
                  isLight ? 'bg-white border-indigo-100 shadow-md' : 'bg-slate-900 border-slate-800'
                }`}
              >
                {activeCall?.status === 'pending' && (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center animate-pulse">
                      <Clock className="w-7 h-7 animate-spin" />
                    </div>
                    <h3 className="text-base font-black">
                      {selectedTeacher?.name} 선생님께 호출 신호 전송 완료
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      선생님 PC 화면에 호출 팝업이 표시되었습니다.<br />잠시만 문앞에서 대기해주세요 (최대 30초).
                    </p>
                  </div>
                )}

                {activeCall?.status === 'accepted' && (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      선생님께서 호출을 수락하셨습니다!
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      지금 바로 교무실 안으로 입장해주세요.
                    </p>
                  </div>
                )}

                {(activeCall?.status === 'ignored' || activeCall?.status === 'auto-away') && (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-black text-amber-600 dark:text-amber-400">
                      선생님께서 현재 부재중이거나 통화/수업 중입니다
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      아래 <strong>방문 메모 남기기</strong>를 작성하시면 선생님 복귀 시 전달됩니다.
                    </p>

                    {!memoSubmitted && !isWritingMemo && (
                      <button
                        onClick={() => setIsWritingMemo(true)}
                        className="mt-2 w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
                      >
                        📝 방문 메모 작성하기
                      </button>
                    )}
                  </div>
                )}

                {/* Memo form */}
                {isWritingMemo && !memoSubmitted && (
                  <form onSubmit={handleSubmitMemo} className="mt-4 text-left space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="agree-memo"
                        checked={privacyAgreed}
                        onChange={(e) => setPrivacyAgreed(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="agree-memo" className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        개인정보 수집 및 교무 전달에 동의합니다.
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">방문 사유</label>
                      <textarea
                        required
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="예: 수행평가 제출 관련 문의로 쉬는 시간에 찾아왔습니다."
                        className={`w-full p-2.5 rounded-xl border text-xs ${
                          isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-800 border-slate-700'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingMemo || !privacyAgreed || !reason.trim()}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
                    >
                      {isSubmittingMemo ? '전달 중...' : '선생님께 메모 전달 완료'}
                    </button>
                  </form>
                )}

                {memoSubmitted && (
                  <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ✅ 방문 메모가 선생님께 안전하게 전달되었습니다!
                  </div>
                )}

                <div className="mt-5 pt-4 border-t flex gap-2">
                  <button
                    onClick={handleResetCall}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition ${
                      isLight
                        ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    처음 화면으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: 등교 출결 1초 원터치 체크                              */}
      {/* ============================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Status Card */}
          <div
            className={`rounded-3xl p-5 border text-center shadow-sm ${
              isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-3">
              <span>📅 {todayStr} (오늘)</span>
              <span>등교 마감: 08:40</span>
            </div>

            {todayAttendance ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-black text-base text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {todayAttendance.status === 'present' ? '등교 정상 출석 완료' : '지각 출석 처리'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  인증 시각: <strong>{todayAttendance.checkInTime}</strong> ({todayAttendance.note})
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-black text-sm text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span>오늘 등교 출결 미인증 상태입니다</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  교내 Wi-Fi 또는 학교 교문 반경 안에서 아래 버튼을 눌러주세요.
                </p>
              </div>
            )}

            {checkInSuccessMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold animate-pulse">
                {checkInSuccessMsg}
              </div>
            )}

            {/* Check-in Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handlePerformCheckIn('wifi')}
                disabled={isCheckingIn || !!todayAttendance}
                className="w-full py-4 px-4 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Wifi className="w-5 h-5" />
                <span>
                  {todayAttendance
                    ? '오늘 출석체크가 이미 완료되었습니다'
                    : isCheckingIn
                    ? '인증 처리 중...'
                    : '📍 1초 원터치 등교 출석체크 (교내 Wi-Fi)'}
                </span>
              </button>

              <button
                onClick={() => handlePerformCheckIn('gps')}
                disabled={isCheckingIn || !!todayAttendance}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                  isLight
                    ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>교문 GPS 위치로 출석 인증하기</span>
              </button>
            </div>
          </div>

          {/* Wi-Fi & Safety Info */}
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              isLight ? 'bg-indigo-50/50 border-indigo-100 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>부정 출석 방지 안심 시스템</span>
            </div>
            <p className="leading-relaxed">
              본 시스템은 교내 인증 네트워크(<strong>{wifiSimulated}</strong>) 및 학교 위치를 검증하여 대리 출석을 방지하며, 인증 결과는 담임 선생님 교무 수첩과 나이스(NEIS)로 연동됩니다.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: 알림장 & 선생님 호출 확인                              */}
      {/* ============================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Section 1: Teacher Direct Calls to Me */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
              <span>선생님 개별 호출 이력 ({teacherCalls.length}건)</span>
            </h3>

            {teacherCalls.length === 0 ? (
              <div
                className={`p-4 rounded-2xl border text-center text-xs text-slate-400 ${
                  isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
                }`}
              >
                현재 수신된 호출이 없습니다.
              </div>
            ) : (
              teacherCalls.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition ${
                    c.status === 'sent'
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                      : isLight
                      ? 'bg-white border-indigo-100'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {c.teacherName} 선생님
                    </span>
                    <span className="text-[10px] text-slate-400">
                      📍 {c.teacherRoom}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                    "{c.message}"
                  </p>

                  {c.status === 'sent' ? (
                    <button
                      onClick={() => handleAcknowledgeCall(c.id)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>확인 및 지금 출발하기</span>
                    </button>
                  ) : (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>출발 확인 전송됨</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Section 2: School / Class Notices */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>조회·종례 및 학년 알림장 ({notices.length}건)</span>
            </h3>

            {notices.length === 0 ? (
              <div
                className={`p-4 rounded-2xl border text-center text-xs text-slate-400 ${
                  isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
                }`}
              >
                등록된 알림장이 없습니다.
              </div>
            ) : (
              notices.map((n) => {
                const isConfirmed = n.confirmedStudentIds?.includes(studentKey);
                return (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border ${
                      isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {n.type === 'homeroom_morning'
                            ? '조회 알림장'
                            : n.type === 'homeroom_closing'
                            ? '종례 알림장'
                            : n.type === 'grade'
                            ? `학년 공지${n.targetGrades && n.targetGrades.length > 0 ? ` (${n.targetGrades.join('·')}학년)` : ''}`
                            : n.type === 'department'
                            ? `부서 공지 (${n.targetDepartment || '행정부서'})`
                            : '전교생 공지'}
                        </span>
                        {n.isUrgent && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-rose-500 text-white">
                            🚨 긴급
                          </span>
                        )}
                        {n.isFirstCome && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white flex items-center gap-0.5 animate-pulse">
                            <Flame className="w-2.5 h-2.5" /> 선착순 신청
                          </span>
                        )}
                        {n.deadline && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            ⏰ {n.deadline}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{n.senderRole} {n.senderName}</span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1">
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5 whitespace-pre-line">
                      {n.content}
                    </p>

                    {/* Notice Attachments (Downloadable) */}
                    {n.attachments && n.attachments.length > 0 && (
                      <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>첨부파일 ({n.attachments.length}개)</span>
                        </div>
                        <div className="space-y-1">
                          {n.attachments.map((att, attIdx) => (
                            <a
                              key={attIdx}
                              href={att.dataUrl || '#'}
                              download={att.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition text-xs group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {att.name}
                                </span>
                                {att.size && <span className="text-[10px] text-slate-400 shrink-0">({att.size})</span>}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                <Download className="w-3.5 h-3.5" />
                                <span>다운로드</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notice External Application / Survey Link */}
                    {n.linkUrl && (
                      <div className="mb-3">
                        <a
                          href={n.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full py-2.5 px-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition ${
                            n.isFirstCome
                              ? 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white shadow-rose-600/20'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                          }`}
                        >
                          {n.isFirstCome ? <Flame className="w-4 h-4 text-amber-300 animate-pulse" /> : <Link2 className="w-4 h-4" />}
                          <span>{n.linkLabel || '선착순 신청 / 설문지 작성 바로가기'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <span className="text-[11px] text-slate-400">
                        확인 인원: {n.confirmedStudentIds?.length || 0}명
                      </span>

                      {isConfirmed ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>읽음 확인 완료</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmNotice(n.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>확인했습니다 (읽음)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
