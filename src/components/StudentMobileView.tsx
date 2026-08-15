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
  Check
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, Call, ThemeType } from '../types';

interface StudentMobileViewProps {
  theme: ThemeType;
  initialRoom: string;
  onNavigateToTeacher?: () => void;
}

export const StudentMobileView: React.FC<StudentMobileViewProps> = ({
  theme,
  initialRoom,
  onNavigateToTeacher,
}) => {
  // Current room state
  const [currentRoom, setCurrentRoom] = useState<string>(initialRoom || '본관 1교무실');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Call tracking state
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isCalling, setIsCalling] = useState(false);

  // Memo writing state (Step 3)
  const [isWritingMemo, setIsWritingMemo] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentGradeClass, setStudentGradeClass] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmittingMemo, setIsSubmittingMemo] = useState(false);
  const [memoSubmitted, setMemoSubmitted] = useState(false);

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

  // Distinct rooms for selector
  const [allRooms, setAllRooms] = useState<string[]>(['본관 1교무실', '2학년 연구실', '진로진학상담실']);
  useEffect(() => {
    const unsubscribe = dbService.subscribeTeachers((all) => {
      const set = new Set<string>(['본관 1교무실', '2학년 연구실', '진로진학상담실']);
      all.forEach((t) => {
        if (t.room) set.add(t.room);
      });
      setAllRooms(Array.from(set));
    });
    return () => unsubscribe();
  }, []);

  // Filtered teachers by search
  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  // 1단계: 선생님 호출하기 버튼 클릭
  const handleStartCall = async () => {
    if (!selectedTeacher) {
      alert('호출할 선생님을 선택해주세요.');
      return;
    }

    setIsCalling(true);
    try {
      const callId = await dbService.createCall({
        room: currentRoom,
        teacherName: selectedTeacher.name,
        studentName: '',
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

  // 3단계: 방문 메모 제출
  const handleSubmitMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAgreed) {
      alert('개인정보 수집 및 교무 전달에 동의해주세요.');
      return;
    }
    if (!studentName.trim()) {
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
      const fullStudentIdentifier = studentGradeClass.trim()
        ? `${studentGradeClass.trim()} ${studentName.trim()}`
        : studentName.trim();

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

  // Reset to call another teacher
  const handleResetCall = () => {
    setActiveCallId(null);
    setActiveCall(null);
    setIsWritingMemo(false);
    setMemoSubmitted(false);
    setPrivacyAgreed(false);
    setReason('');
    setSelectedTeacher(null);
  };

  const isLight = theme === 'vibrant-palette';

  return (
    <div className="max-w-md mx-auto px-4 py-4 sm:py-6">
      {/* Mobile Header Card */}
      <div
        id="student-header"
        className={`rounded-3xl p-5 border text-center shadow-sm mb-6 transition-all ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-900 shadow-indigo-100/50'
            : 'bg-slate-900 border-slate-800 text-white shadow-xl'
        }`}
      >
        <div
          className={`inline-flex items-center justify-center p-3 rounded-2xl mb-2 border ${
            isLight
              ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-inner'
              : 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60'
          }`}
        >
          <School className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
          스마트 방문 접수처
        </h1>

        {/* Room badge & changer */}
        <div
          className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
            isLight
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{currentRoom}</span>
        </div>

        {/* Room switch dropdown if student scans different room */}
        {!activeCallId && (
          <div className="mt-3">
            <select
              value={currentRoom}
              onChange={(e) => {
                setCurrentRoom(e.target.value);
                setSelectedTeacher(null);
              }}
              className={`text-xs rounded-xl px-3 py-1.5 outline-none font-bold border cursor-pointer ${
                isLight
                  ? 'bg-indigo-50/50 text-slate-700 border-indigo-200 focus:border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {allRooms.map((r) => (
                <option key={r} value={r}>
                  📍 {r}으로 변경
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* STEP 1: SELECT TEACHER & PRESS CALL BUTTON                        */}
      {/* ----------------------------------------------------------------- */}
      {!activeCallId && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Instruction Card */}
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-700 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <p
              className={`font-bold mb-1 ${
                isLight ? 'text-indigo-900' : 'text-slate-200'
              }`}
            >
              📢 방문 안내
            </p>
            <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed`}>
              만나실 선생님을 목록에서 선택한 후 아래 <strong>[호출하기]</strong> 버튼을
              누르면, 교무실 안 선생님 PC 화면에 알림이 전달됩니다.
            </p>
          </div>

          {/* Teacher Search & List */}
          <div
            id="student-teacher-selection"
            className={`rounded-3xl border p-4 sm:p-5 transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label
                className={`text-xs font-bold ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                1단계: 선생님 선택 <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                총 {filteredTeachers.length}명
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search
                className={`w-4 h-4 absolute left-3 top-3 ${
                  isLight ? 'text-slate-400' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="선생님 성함 또는 과목 검색..."
                className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border outline-none font-medium transition ${
                  isLight
                    ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                    : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Teachers Radio/Select Cards */}
            {filteredTeachers.length === 0 ? (
              <div
                className={`p-6 text-center text-xs ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                해당 교무실에 등록된 선생님이 없습니다.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredTeachers.map((teacher) => {
                  const isSelected = selectedTeacher?.id === teacher.id;
                  return (
                    <div
                      key={teacher.id}
                      id={`teacher-option-${teacher.id}`}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? isLight
                            ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                            : 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                          : isLight
                          ? 'border-indigo-50 bg-slate-50/60 hover:border-indigo-200 text-slate-800'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : isLight
                              ? 'bg-white text-indigo-700 border-indigo-100'
                              : 'bg-slate-700 text-slate-300 border-slate-600'
                          }`}
                        >
                          {teacher.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-black text-sm">{teacher.name} 선생님</div>
                          <div
                            className={`text-xs ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {teacher.subject || teacher.room}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : isLight
                            ? 'border-slate-300'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Action Button: CALL TEACHER */}
          <button
            id="btn-student-call"
            disabled={!selectedTeacher || isCalling}
            onClick={handleStartCall}
            className={`w-full py-4 px-6 rounded-2xl text-base sm:text-lg font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedTeacher
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.98]'
                : isLight
                ? 'bg-slate-200 text-slate-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            <Bell className="w-5 h-5 animate-pulse" />
            <span>
              {isCalling
                ? '호출 신호 전송 중...'
                : selectedTeacher
                ? `${selectedTeacher.name} 선생님 호출하기`
                : '선생님을 먼저 선택해주세요'}
            </span>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 2: REAL-TIME RESPONSE SCREEN (Pending, Accepted, Ignored/Away)*/}
      {/* ----------------------------------------------------------------- */}
      {activeCallId && activeCall && !isWritingMemo && (
        <div className="space-y-6 animate-in zoom-in-95 duration-200">
          {/* Target Teacher Summary Box */}
          <div
            className={`p-4 rounded-2xl border text-center transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              호출 대상
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-emerald-400 mt-0.5">
              {activeCall.teacherName} 선생님
            </div>
            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              📍 {activeCall.room}
            </div>
          </div>

          {/* 1. STATE: PENDING (선생님 응답 대기 중) */}
          {activeCall.status === 'pending' && (
            <div
              id="student-status-pending"
              className={`p-6 rounded-3xl border-2 border-indigo-300 text-center shadow-lg transition-all ${
                isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
              }`}
            >
              <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-700">
                  <Bell className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <h2 className="text-xl font-black tracking-tight">
                선생님께 호출 알림을 보냈습니다
              </h2>
              <p
                className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                선생님 PC 화면에 알림이 울리고 있습니다.
                <br />
                잠시만 화면을 닫지 말고 문앞에서 기다려주세요...
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>실시간 수신 대기 중</span>
              </div>
            </div>
          )}

          {/* 2. STATE: ACCEPTED (선생님이 수락하셨습니다: 들어오세요) */}
          {activeCall.status === 'accepted' && (
            <div
              id="student-status-accepted"
              className="p-6 sm:p-8 rounded-3xl border-4 border-emerald-500 bg-emerald-50 text-center shadow-2xl animate-in zoom-in-95 duration-300 dark:bg-emerald-950/40"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 mb-2 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">
                호출 수락 완료
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight leading-snug">
                "선생님이 확인하셨습니다!
                <br />
                노크 후 들어오세요."
              </h2>

              <p className="text-xs sm:text-sm text-emerald-700 dark:text-slate-300 mt-3 font-medium">
                선생님이 교무실 안에서 기다리고 계십니다.
              </p>

              <div className="mt-6 pt-4 border-t border-emerald-200 dark:border-emerald-800/60">
                <button
                  onClick={handleResetCall}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음으로 돌아가기</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. STATE: IGNORED OR AUTO-AWAY (선생님이 부재중/바쁘십니다) */}
          {(activeCall.status === 'ignored' || activeCall.status === 'auto-away') && (
            <div
              id="student-status-away"
              className={`p-6 sm:p-8 rounded-3xl border-2 text-center shadow-xl transition-all ${
                activeCall.status === 'ignored'
                  ? isLight
                    ? 'border-rose-300 bg-rose-50/60 text-slate-900'
                    : 'border-rose-500/50 bg-rose-950/30 text-white'
                  : isLight
                  ? 'border-amber-300 bg-amber-50/60 text-slate-900'
                  : 'border-amber-500/50 bg-amber-950/30 text-white'
              }`}
            >
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  activeCall.status === 'ignored'
                    ? 'bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
                }`}
              >
                {activeCall.status === 'ignored' ? (
                  <XCircle className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {activeCall.status === 'ignored'
                  ? '선생님이 지금 상담/통화 중이십니다'
                  : '선생님이 현재 자리를 비우셨습니다 (부재중)'}
              </h2>

              <p
                className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {activeCall.status === 'ignored'
                  ? '현재 바쁜 용무로 방문이 어렵습니다. 선생님께 방문 메모를 남겨주시면 확인 후 연락을 드릴 수 있습니다.'
                  : '선생님이 수업 또는 교외 출장 중이실 수 있습니다. 방문 사유와 학번을 남겨주시면 전달됩니다.'}
              </p>

              {/* Memo state or button */}
              {memoSubmitted ? (
                <div
                  className={`mt-6 p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>방문 메모가 선생님께 성공적으로 전달되었습니다!</span>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <button
                    id="btn-open-memo-form"
                    onClick={() => setIsWritingMemo(true)}
                    className="w-full py-3.5 px-6 rounded-2xl text-base font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-5 h-5" />
                    <span>방문 메모 남기기</span>
                  </button>

                  <button
                    onClick={handleResetCall}
                    className={`text-xs py-1 transition cursor-pointer ${
                      isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    다른 선생님 호출하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 3: VISITOR MEMO FORM (동의 필수 + 이름/사유 작성)             */}
      {/* ----------------------------------------------------------------- */}
      {activeCallId && isWritingMemo && (
        <div
          id="student-memo-form-card"
          className={`p-6 rounded-3xl border shadow-xl space-y-5 animate-in slide-in-from-bottom-4 duration-300 ${
            isLight
              ? 'bg-white border-indigo-100 text-slate-900 shadow-indigo-100/50'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-indigo-100' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h2 className="font-black text-lg">방문 메모 남기기</h2>
            </div>
            <button
              onClick={() => setIsWritingMemo(false)}
              className={`text-xs transition cursor-pointer ${
                isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              닫기
            </button>
          </div>

          <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            수신자:{' '}
            <strong className="text-indigo-600 dark:text-emerald-400">
              {activeCall?.teacherName} 선생님
            </strong>
          </div>

          <form onSubmit={handleSubmitMemo} className="space-y-4">
            {/* Privacy Agreement Checkbox (REQUIRED) */}
            <div
              id="privacy-agreement-box"
              className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                isLight
                  ? 'bg-indigo-50/50 border-indigo-100 text-slate-800'
                  : 'bg-slate-800/70 border-slate-700/80'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <input
                  id="checkbox-privacy-agree"
                  type="checkbox"
                  required
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-400 cursor-pointer"
                />
                <label
                  htmlFor="checkbox-privacy-agree"
                  className={`text-xs font-bold cursor-pointer select-none leading-relaxed ${
                    isLight ? 'text-slate-900' : 'text-slate-200'
                  }`}
                >
                  <span className="text-rose-500 font-black">[필수]</span> 학생 개인정보(이름, 학번,
                  방문 목적) 수집 및 교무 전달에 동의합니다.
                </label>
              </div>
              <p
                className={`text-[11px] pl-6 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                수집된 정보는 당일 선생님의 학생 상담 및 방문 확인 목적으로만 열람됩니다.
              </p>
            </div>

            {/* Student Grade/Class & Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className={`block text-xs font-bold mb-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  학년 / 반 (선택)
                </label>
                <input
                  id="input-student-grade"
                  type="text"
                  value={studentGradeClass}
                  onChange={(e) => setStudentGradeClass(e.target.value)}
                  placeholder="예: 2학년 3반"
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                    isLight
                      ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                      : 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-bold mb-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  학생 이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-student-name"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="예: 홍길동"
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none font-medium transition ${
                    isLight
                      ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                      : 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Visit Reason */}
            <div>
              <label
                className={`block text-xs font-bold mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                방문 목적 및 남길 말씀 <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="textarea-visit-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 수학 수행평가 3번 문항 질문이 있어 쉬는 시간에 찾아왔습니다."
                className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none resize-none leading-relaxed font-medium transition ${
                  isLight
                    ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                    : 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-memo"
              type="submit"
              disabled={isSubmittingMemo || !privacyAgreed || !studentName.trim() || !reason.trim()}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmittingMemo ? '전달 중...' : '선생님께 메모 전달하기'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
