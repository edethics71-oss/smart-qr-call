import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  AlertCircle,
  Volume2,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  Calendar,
  Eye,
  RefreshCw,
  LogOut,
  MousePointer,
  DoorOpen,
  HelpCircle,
  Building2,
  Printer
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import { playAlertChime } from '../utils/audio';
import type { Teacher, Call, ThemeType } from '../types';

interface TeacherReceiverViewProps {
  theme: ThemeType;
  teachers: Teacher[];
  onOpenManagement: () => void;
  onOpenPlacard: (room: string) => void;
}

export const TeacherReceiverView: React.FC<TeacherReceiverViewProps> = ({
  theme,
  teachers,
  onOpenManagement,
  onOpenPlacard,
}) => {
  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('ALL');
  const [memoOnlyFilter, setMemoOnlyFilter] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calls list & Active pending call for modal
  const [calls, setCalls] = useState<Call[]>([]);
  const [activePendingCall, setActivePendingCall] = useState<Call | null>(null);

  // Inactivity tracking (10 seconds)
  const IDLE_TIMEOUT_SEC = 10;
  const [secondsSinceActivity, setSecondsSinceActivity] = useState<number>(0);
  const isIdle = secondsSinceActivity >= IDLE_TIMEOUT_SEC;
  const [manualAwayMode, setManualAwayMode] = useState<boolean>(false);

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Distinct rooms
  const rooms = useMemo(() => {
    const roomSet = new Set<string>();
    teachers.forEach((t) => {
      if (t.room) roomSet.add(t.room);
    });
    return Array.from(roomSet);
  }, [teachers]);

  // Teachers filtered by selected room
  const availableTeachers = useMemo(() => {
    if (selectedRoom === 'ALL') return teachers;
    return teachers.filter((t) => t.room === selectedRoom);
  }, [teachers, selectedRoom]);

  // -------------------------------------------------------------
  // 10-Second Mouse/Keyboard Activity Tracker
  // -------------------------------------------------------------
  const lastActivityTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimestamp.current = Date.now();
      setSecondsSinceActivity(0);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    const timer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityTimestamp.current) / 1000);
      setSecondsSinceActivity(elapsedSec);
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(timer);
    };
  }, []);

  // -------------------------------------------------------------
  // Real-time Calls Subscription
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = dbService.subscribeCalls((updatedCalls) => {
      setCalls(updatedCalls);

      // Look for newly arrived 'pending' call that matches current filters
      const targetPending = updatedCalls.find((c) => {
        if (c.status !== 'pending') return false;
        if (selectedRoom !== 'ALL' && c.room !== selectedRoom) return false;
        if (selectedTeacherName !== 'ALL' && c.teacherName !== selectedTeacherName) return false;
        return true;
      });

      if (targetPending) {
        // If teacher is idle or manually away, automatically set to 'auto-away'
        if (isIdle || manualAwayMode) {
          dbService.updateCallStatus(targetPending.id, 'auto-away');
        } else {
          // Teacher is active! Show huge modal and ring chime
          setActivePendingCall(targetPending);
          if (soundEnabled) {
            playAlertChime();
          }
        }
      } else {
        // If current active call was answered elsewhere
        setActivePendingCall((prev) => {
          if (!prev) return null;
          const stillExistsAndPending = updatedCalls.some(
            (c) => c.id === prev.id && c.status === 'pending'
          );
          return stillExistsAndPending ? prev : null;
        });
      }
    }, selectedRoom, selectedTeacherName);

    return () => unsubscribe();
  }, [selectedRoom, selectedTeacherName, isIdle, manualAwayMode, soundEnabled]);

  // Handle Response Action (수락 / 무시)
  const handleCallResponse = async (status: 'accepted' | 'ignored') => {
    if (!activePendingCall) return;
    const targetId = activePendingCall.id;
    setActivePendingCall(null);
    await dbService.updateCallStatus(targetId, status);
  };

  // Filtered list for display
  const displayCalls = useMemo(() => {
    return calls.filter((c) => {
      if (selectedRoom !== 'ALL' && c.room !== selectedRoom) return false;
      if (selectedTeacherName !== 'ALL' && c.teacherName !== selectedTeacherName) return false;
      if (memoOnlyFilter && !c.hasMemo) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchStudent = c.studentName?.toLowerCase().includes(query);
        const matchReason = c.reason?.toLowerCase().includes(query);
        const matchTeacher = c.teacherName?.toLowerCase().includes(query);
        const matchRoom = c.room?.toLowerCase().includes(query);
        return matchStudent || matchReason || matchTeacher || matchRoom;
      }
      return true;
    });
  }, [calls, selectedRoom, selectedTeacherName, memoOnlyFilter, searchQuery]);

  // Today stats
  const todayStats = useMemo(() => {
    const total = calls.length;
    const accepted = calls.filter((c) => c.status === 'accepted').length;
    const awayOrIgnored = calls.filter(
      (c) => c.status === 'auto-away' || c.status === 'ignored'
    ).length;
    const memos = calls.filter((c) => c.hasMemo).length;
    return { total, accepted, awayOrIgnored, memos };
  }, [calls]);

  const isLight = theme === 'vibrant-palette';

  return (
    <div className="space-y-6">
      {/* Top Banner & Activity / Inactivity Monitor */}
      <div
        id="teacher-status-banner"
        className={`rounded-2xl p-4 sm:p-6 border transition-all duration-300 ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
            : 'bg-slate-900 border-slate-800 text-white shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status state */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner ${
                  manualAwayMode
                    ? isLight
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : isIdle
                    ? isLight
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : isLight
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {manualAwayMode ? '🚪' : isIdle ? '⏳' : '🔔'}
              </div>
              <span
                className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ${
                  isLight ? 'ring-white' : 'ring-slate-900'
                } ${
                  manualAwayMode
                    ? 'bg-purple-500'
                    : isIdle
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {manualAwayMode
                    ? '수동 부재중 모드 (외출/수업)'
                    : isIdle
                    ? '자동 부재중 (유휴 상태)'
                    : '실시간 호출 수신 대기 중'}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    manualAwayMode
                      ? isLight
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-purple-950/70 text-purple-300 border border-purple-700/50'
                      : isIdle
                      ? isLight
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-amber-950/70 text-amber-300 border border-amber-700/50'
                      : isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                  }`}
                >
                  {manualAwayMode
                    ? '외출 중'
                    : isIdle
                    ? '10초 미동작 부재중'
                    : '자리 있음 (정상 수신)'}
                </span>
              </div>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {manualAwayMode
                  ? '외출 중에는 학생 호출 시 즉시 부재중 안내 및 방문 메모 작성으로 연결됩니다.'
                  : isIdle
                  ? '마우스 미동작 10초 경과로 자동 부재중 처리됩니다. 마우스를 움직이면 정상 대기로 복귀합니다.'
                  : '학생이 문 앞 QR로 호출하면 즉시 알림음과 함께 대형 수락 팝업이 화면에 나타납니다.'}
              </p>
            </div>
          </div>

          {/* Idle Countdown meter & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Countdown progress indicator */}
            <div
              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
                isLight
                  ? 'bg-indigo-50/60 border-indigo-100 text-indigo-950'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5 text-indigo-600 dark:text-emerald-400" />
              <span>
                마우스 미동작:{' '}
                <strong className="font-mono text-indigo-700 dark:text-emerald-400">
                  {Math.min(secondsSinceActivity, IDLE_TIMEOUT_SEC)}s / 10s
                </strong>
              </span>
              <div
                className={`w-16 h-2 rounded-full overflow-hidden ${
                  isLight ? 'bg-indigo-200/70' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    isIdle ? 'bg-amber-500' : 'bg-indigo-600 dark:bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (secondsSinceActivity / IDLE_TIMEOUT_SEC) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Manual Away Toggle Button */}
            <button
              id="toggle-manual-away-btn"
              onClick={() => setManualAwayMode(!manualAwayMode)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                manualAwayMode
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : isLight
                  ? 'bg-white hover:bg-indigo-50 text-slate-700 border-indigo-200 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{manualAwayMode ? '대기 모드로 복귀' : '외출/수업 부재중 전환'}</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              id="toggle-sound-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="알림음 토글"
              className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                soundEnabled
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                  : isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
            >
              <Volume2
                className={`w-4 h-4 ${
                  soundEnabled
                    ? isLight
                      ? 'text-emerald-600'
                      : 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div
        id="teacher-filter-bar"
        className={`p-4 rounded-2xl border ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-800 shadow-sm'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Room & Teacher Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-emerald-400" />
              <label
                className={`text-xs font-bold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                교무실 선택:
              </label>
              <select
                id="select-room-filter"
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  setSelectedTeacherName('ALL');
                }}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl border font-bold outline-none transition cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50/50 border-indigo-200 text-slate-900 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
              >
                <option value="ALL">🏢 전체 교무실 수신</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    📍 {room}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600 dark:text-emerald-400" />
              <label
                className={`text-xs font-bold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                내 이름 필터:
              </label>
              <select
                id="select-teacher-filter"
                value={selectedTeacherName}
                onChange={(e) => setSelectedTeacherName(e.target.value)}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl border font-bold outline-none transition cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50/50 border-indigo-200 text-slate-900 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                }`}
              >
                <option value="ALL">👥 모든 선생님 호출 수신</option>
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.name}>
                    👤 {t.name} 선생님 {t.subject ? `(${t.subject})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoom !== 'ALL' && (
              <button
                id="open-placard-btn"
                onClick={() => onOpenPlacard(selectedRoom)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>[{selectedRoom}] 문앞 부착판 인쇄</span>
              </button>
            )}
          </div>

          {/* Right Actions: Search & Toggle memo only */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                id="search-memo-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학생 이름, 방문 사유 검색..."
                className={`text-xs pl-8 pr-3 py-1.5 rounded-xl border outline-none w-44 sm:w-56 transition ${
                  isLight
                    ? 'bg-white border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                    : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                }`}
              />
            </div>

            <button
              id="filter-memo-toggle-btn"
              onClick={() => setMemoOnlyFilter(!memoOnlyFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                memoOnlyFilter
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : isLight
                  ? 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{memoOnlyFilter ? '메모 작성 건만 보기' : '모든 호출 내역 보기'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today Dashboard Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-white border-indigo-100 shadow-sm'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="text-xs font-bold text-slate-500">오늘 총 방문 호출</div>
          <div
            className={`text-2xl font-black mt-1 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {todayStats.total}건
          </div>
        </div>
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 shadow-sm'
              : 'bg-emerald-950/20 border-emerald-800/60'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            수락 (입실 완료)
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {todayStats.accepted}건
          </div>
        </div>
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-amber-50/70 border-amber-200 shadow-sm'
              : 'bg-amber-950/20 border-amber-800/60'
          }`}
        >
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
            부재중/바쁨 처리
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {todayStats.awayOrIgnored}건
          </div>
        </div>
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight
              ? 'bg-indigo-50/70 border-indigo-200 shadow-sm'
              : 'bg-indigo-950/20 border-indigo-800/60'
          }`}
        >
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
            남겨진 방문 메모
          </div>
          <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
            {todayStats.memos}건
          </div>
        </div>
      </div>

      {/* Main Section: Visitor Memo List (방문자 메모 리스트) */}
      <div
        id="visitor-memo-section"
        className={`rounded-2xl border overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-indigo-100 shadow-sm'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div
          className={`p-4 sm:px-6 border-b flex items-center justify-between ${
            isLight
              ? 'border-indigo-100 bg-indigo-50/40 text-slate-900'
              : 'border-slate-800 bg-slate-900/90 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
            <h3 className="font-black text-base sm:text-lg">
              {memoOnlyFilter ? '학생 방문 메모 접수 목록' : '호출 및 방문 메모 전체 기록'}
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isLight
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              }`}
            >
              {displayCalls.length}건
            </span>
          </div>

          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            실시간 자동 업데이트됨
          </div>
        </div>

        {displayCalls.length === 0 ? (
          <div className="p-12 text-center">
            <FileText
              className={`w-12 h-12 mx-auto mb-3 opacity-30 ${
                isLight ? 'text-indigo-400' : 'text-slate-500'
              }`}
            />
            <p
              className={`font-bold text-base ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              {memoOnlyFilter
                ? '아직 남겨진 방문 메모가 없습니다.'
                : '아직 등록된 호출 내역이 없습니다.'}
            </p>
            <p
              className={`text-xs mt-1 max-w-md mx-auto ${
                isLight ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              학생이 교무실 앞 QR 코드를 스캔하여 호출하거나, 부재중일 때 메모를 남기면 여기에 실시간으로
              표시됩니다.
            </p>
          </div>
        ) : (
          <div
            className={`divide-y ${
              isLight ? 'divide-indigo-100' : 'divide-slate-800'
            }`}
          >
            {displayCalls.map((call) => (
              <div
                key={call.id}
                id={`call-card-${call.id}`}
                className={`p-4 sm:p-5 transition ${
                  isLight ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-800/40'
                } ${call.hasMemo ? (isLight ? 'bg-indigo-50/20' : 'bg-indigo-950/10') : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      {call.status === 'accepted' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 수락됨 (입실)
                        </span>
                      )}
                      {call.status === 'auto-away' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                          <Clock className="w-3.5 h-3.5" /> 자동 부재중
                        </span>
                      )}
                      {call.status === 'ignored' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700">
                          <XCircle className="w-3.5 h-3.5" /> 선생님 바쁨 처리
                        </span>
                      )}
                      {call.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700">
                          <Bell className="w-3.5 h-3.5" /> 호출 수신 중
                        </span>
                      )}

                      {/* Room & Teacher target */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        📍 {call.room}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          isLight
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        👤 {call.teacherName} 선생님 호출
                      </span>

                      {/* Time */}
                      <span
                        className={`text-xs flex items-center gap-1 font-mono ${
                          isLight ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {new Date(call.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Memo Content (if submitted) */}
                    {call.hasMemo ? (
                      <div
                        className={`p-3.5 rounded-xl border ${
                          isLight
                            ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                            : 'bg-slate-950 border-emerald-700/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            ✍️ 학생: {call.studentName || '익명 학생'}
                          </span>
                          <span
                            className={`text-xs font-normal ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            (개인정보 수집 동의 완료)
                          </span>
                        </div>
                        <p
                          className={`text-sm whitespace-pre-wrap leading-relaxed font-medium ${
                            isLight ? 'text-slate-800' : 'text-slate-100'
                          }`}
                        >
                          {call.reason || '방문 사유 미입력'}
                        </p>
                      </div>
                    ) : (
                      <p
                        className={`text-xs italic ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {call.status === 'pending'
                          ? '선생님의 수락 또는 부재중 응답 대기 중...'
                          : '방문 메모 작성 없이 호출이 완료되었습니다.'}
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-start">
                    {call.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => dbService.updateCallStatus(call.id, 'accepted')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
                        >
                          수락
                        </button>
                        <button
                          onClick={() => dbService.updateCallStatus(call.id, 'ignored')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer"
                        >
                          무시
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 🚨 CRITICAL: HUGE FULL-SCREEN MODAL POPUP FOR NEW CALLS 🚨     */}
      {/* Must NOT close until teacher clicks [수락] or [무시]           */}
      {/* High contrast, giant typography visible from across the room!   */}
      {/* ------------------------------------------------------------- */}
      {activePendingCall && (
        <div
          id="teacher-emergency-call-modal"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          style={{ cursor: 'default' }}
        >
          <div
            className={`w-full max-w-2xl rounded-3xl p-6 sm:p-10 border-4 shadow-2xl transition-all transform scale-100 ${
              isLight
                ? 'bg-white border-indigo-600 text-slate-900 shadow-indigo-500/25'
                : 'bg-slate-900 border-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {/* Header Alert Badge */}
            <div className="flex items-center justify-between mb-6">
              <div
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm sm:text-base font-black animate-pulse ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}
              >
                <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                <span>교무실 앞 학생 방문 호출 도착!</span>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs sm:text-sm font-mono ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {new Date(activePendingCall.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Huge Text Content Visible From 5 Meters Away */}
            <div className="space-y-4 my-6 sm:my-8 text-center sm:text-left">
              <div
                className={`text-base sm:text-lg font-bold ${
                  isLight ? 'text-indigo-600' : 'text-indigo-400'
                }`}
              >
                📍 {activePendingCall.room}
              </div>

              <div className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400 decoration-wavy decoration-2">
                  {activePendingCall.teacherName} 선생님
                </span>
                <span>을</span>
                <br />
                <span>학생이 호출하였습니다!</span>
              </div>

              <p
                className={`text-base sm:text-lg font-medium pt-2 ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                스마트폰으로 교무실 문앞 QR을 찍고 대기 중입니다. 지금 들어오게 하시겠습니까?
              </p>
            </div>

            {/* Two Huge Contrast Decision Buttons */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-8 pt-4 border-t ${
                isLight ? 'border-indigo-100' : 'border-slate-800'
              }`}
            >
              {/* ACCEPT BUTTON (수락 / 들어오세요) */}
              <button
                id="btn-accept-student-call"
                onClick={() => handleCallResponse('accepted')}
                className="w-full py-5 sm:py-6 px-6 rounded-2xl text-xl sm:text-2xl font-black bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-2 border-emerald-300 cursor-pointer"
              >
                <Check className="w-8 h-8 stroke-[3]" />
                <span>수락 (들어오세요)</span>
              </button>

              {/* IGNORE BUTTON (무시 / 지금 바빠요) */}
              <button
                id="btn-ignore-student-call"
                onClick={() => handleCallResponse('ignored')}
                className="w-full py-5 sm:py-6 px-6 rounded-2xl text-xl sm:text-2xl font-black bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-2 border-rose-400 cursor-pointer"
              >
                <X className="w-8 h-8 stroke-[3]" />
                <span>무시 (지금 바빠요)</span>
              </button>
            </div>

            <div className="text-center mt-4">
              <span
                className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                ※ [무시]를 누르시면 학생 스마트폰 화면에 부재중 안내와 함께 [방문 메모 남기기]가 제공됩니다.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
