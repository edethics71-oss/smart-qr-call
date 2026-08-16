import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  Printer,
  Settings,
  GraduationCap,
  Briefcase,
  Users,
  Coffee,
  Radio,
  Send,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import { getPublicStudentUrl } from '../lib/urlUtils';
import { playAlertChime } from '../utils/audio';
import { VisitMemosModal } from './VisitMemosModal';
import type { Teacher, Call, ThemeType } from '../types';

interface TeacherReceiverViewProps {
  theme: ThemeType;
  teachers: Teacher[];
  onOpenManagement: () => void;
  onOpenPlacard: (room: string) => void;
  onQuickCallStudent?: (studentName: string) => void;
}

export type TeacherPresenceStatus = 'present' | 'class' | 'trip' | 'meeting' | 'away';

export const TeacherReceiverView: React.FC<TeacherReceiverViewProps> = ({
  theme,
  teachers,
  onOpenManagement,
  onOpenPlacard,
  onQuickCallStudent,
}) => {
  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calls list & Active pending call for modal
  const [calls, setCalls] = useState<Call[]>([]);
  const [activePendingCall, setActivePendingCall] = useState<Call | null>(null);

  // Visit Memos Modal state
  const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);

  // Presence Status (기본: 'present' 재실/수신대기)
  const [presenceStatus, setPresenceStatus] = useState<TeacherPresenceStatus>('present');
  
  // Call response countdown timeout (기본 20초)
  const [responseTimeoutSec, setResponseTimeoutSec] = useState<number>(20);
  const [popupRemainingSec, setPopupRemainingSec] = useState<number>(20);

  // User activity tracker
  const [idleSettingMinutes, setIdleSettingMinutes] = useState<number>(0);
  const [minutesSinceActivity, setMinutesSinceActivity] = useState<number>(0);
  const isIdleAway = idleSettingMinutes > 0 && minutesSinceActivity >= idleSettingMinutes;

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Distinct rooms
  const rooms = useMemo(() => {
    const roomSet = new Set<string>();
    teachers.forEach((t) => {
      if (t.room) roomSet.add(t.room);
    });
    return Array.from(roomSet);
  }, [teachers]);

  // Room QR Modal state (교무실 문 부착용 QR 안내판 생성/인쇄)
  const [isRoomQrModalOpen, setIsRoomQrModalOpen] = useState<boolean>(false);
  const [qrModalRoom, setQrModalRoom] = useState<string>('본관 1교무실');
  const [customQrRoom, setCustomQrRoom] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Set default qr room when rooms list loads
  useEffect(() => {
    if (rooms.length > 0 && (!qrModalRoom || qrModalRoom === '본관 1교무실')) {
      setQrModalRoom(rooms[0]);
    }
  }, [rooms]);

  // Teachers filtered by selected room
  const availableTeachers = useMemo(() => {
    if (selectedRoom === 'ALL') return teachers;
    return teachers.filter((t) => t.room === selectedRoom);
  }, [teachers, selectedRoom]);

  // Activity Tracker
  const lastActivityTimestamp = useRef<number>(Date.now());
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimestamp.current = Date.now();
      setMinutesSinceActivity(0);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    const timer = setInterval(() => {
      const elapsedMin = Math.floor((Date.now() - lastActivityTimestamp.current) / 60000);
      setMinutesSinceActivity(elapsedMin);
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(timer);
    };
  }, []);

  const effectiveIsAway = presenceStatus !== 'present' || isIdleAway;

  // Real-time Calls Subscription
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
        if (effectiveIsAway) {
          dbService.updateCallStatus(targetPending.id, 'auto-away');
        } else {
          setActivePendingCall(targetPending);
          setPopupRemainingSec(responseTimeoutSec > 0 ? responseTimeoutSec : 20);
          if (soundEnabled) {
            playAlertChime();
          }
        }
      } else if (activePendingCall) {
        const stillPending = updatedCalls.find((c) => c.id === activePendingCall.id && c.status === 'pending');
        if (!stillPending) {
          setActivePendingCall(null);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedRoom, selectedTeacherName, effectiveIsAway, soundEnabled, responseTimeoutSec]);

  // Response countdown timer for active incoming call
  useEffect(() => {
    if (!activePendingCall || responseTimeoutSec === 0) return;

    const interval = setInterval(() => {
      setPopupRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activePendingCall) {
            dbService.updateCallStatus(activePendingCall.id, 'auto-away');
            setActivePendingCall(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activePendingCall, responseTimeoutSec]);

  // Handle Response Actions
  const handleAcceptCall = async (callId: string) => {
    try {
      await dbService.updateCallStatus(callId, 'accepted');
      setActivePendingCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBusyCall = async (callId: string) => {
    try {
      await dbService.updateCallStatus(callId, 'auto-away');
      setActivePendingCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectCall = async (callId: string) => {
    try {
      await dbService.updateCallStatus(callId, 'ignored');
      setActivePendingCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Count memos for the button badge
  const memoCount = useMemo(() => {
    return calls.filter((c) => c.hasMemo && (c.memoContent || c.reason)).length;
  }, [calls]);

  // Filtered recent calls list
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (selectedRoom !== 'ALL' && c.room !== selectedRoom) return false;
      if (selectedTeacherName !== 'ALL' && c.teacherName !== selectedTeacherName) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.studentName.toLowerCase().includes(q);
        const matchTeacher = c.teacherName.toLowerCase().includes(q);
        const matchReason = (c.reason || '').toLowerCase().includes(q);
        if (!matchName && !matchTeacher && !matchReason) return false;
      }
      return true;
    });
  }, [calls, selectedRoom, selectedTeacherName, searchQuery]);

  const isLight = theme === 'vibrant-palette';

  const currentStatusInfo = useMemo(() => {
    switch (presenceStatus) {
      case 'present':
        return {
          label: '재실 (호출 수신 대기)',
          color: 'text-emerald-500',
          badge: '🟢 실시간 수신 중',
          desc: '학생 호출 시 딩동 알림음과 함께 대형 수신 팝업이 화면에 즉시 뜹니다.',
        };
      case 'class':
        return {
          label: '수업 중 (부재중 자동 처리)',
          color: 'text-purple-500',
          badge: '🎓 수업 중 모드',
          desc: '학생 호출 시 "지금은 수업 중이십니다" 안내와 함께 [방문 메모 남기기]가 실행됩니다.',
        };
      case 'trip':
        return {
          label: '출장 중',
          color: 'text-amber-500',
          badge: '💼 출장 모드',
          desc: '학생 호출 시 "출장 중이십니다" 안내와 함께 [방문 메모 남기기]가 실행됩니다.',
        };
      case 'meeting':
        return {
          label: '교직원 회의 중',
          color: 'text-blue-500',
          badge: '👥 회의 중 모드',
          desc: '학생 호출 시 "회의 중이십니다" 안내와 함께 [방문 메모 남기기]가 실행됩니다.',
        };
      case 'away':
        return {
          label: '자리비움 / 상담 중',
          color: 'text-rose-500',
          badge: '☕ 자리비움 모드',
          desc: '학생 호출 시 "잠시 자리비움 중이십니다" 안내와 함께 [방문 메모 남기기]가 실행됩니다.',
        };
    }
  }, [presenceStatus]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Status & Presence Control Bar */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
            : 'bg-slate-900 border-slate-800 text-white shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Presence Status */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md ${
                presenceStatus === 'present'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-indigo-600 text-white shadow-indigo-600/20'
              }`}
            >
              {presenceStatus === 'present' && '🔔'}
              {presenceStatus === 'class' && '🎓'}
              {presenceStatus === 'trip' && '💼'}
              {presenceStatus === 'meeting' && '👥'}
              {presenceStatus === 'away' && '☕'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight">
                  {currentStatusInfo.label}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                    presenceStatus === 'present'
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                      : isLight
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-purple-950/70 text-purple-300 border border-purple-700/50'
                  }`}
                >
                  {currentStatusInfo.badge}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {currentStatusInfo.desc}
              </p>
            </div>
          </div>

          {/* Right Action Buttons: Presence Selector + Visit Memo Check Button + Door QR Placard */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prominent Door QR Placard Button as requested */}
            <button
              id="btn-open-door-qr-modal"
              onClick={() => {
                if (selectedRoom !== 'ALL') {
                  setQrModalRoom(selectedRoom);
                }
                setIsRoomQrModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
              title="교무실 출입문에 부착할 QR 코드 안내판 생성 및 A4 인쇄"
            >
              <QrCode className="w-4 h-4" />
              <span>🚪 교무실 문 부착용 QR 생성·인쇄</span>
            </button>

            {/* Prominent Visit Memo Button with Counter as requested */}
            <button
              id="btn-open-visit-memos"
              onClick={() => setIsMemoModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>학생 방문 메모 확인</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-indigo-700 text-xs font-black shadow-inner">
                {memoCount}건
              </span>
            </button>

            {/* Quick 1-Click Presence Status Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-2xl border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPresenceStatus('present')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  presenceStatus === 'present'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>🔔</span>
                <span>재실</span>
              </button>

              <button
                onClick={() => setPresenceStatus('class')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  presenceStatus === 'class'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>🎓</span>
                <span>수업</span>
              </button>

              <button
                onClick={() => setPresenceStatus('trip')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  presenceStatus === 'trip'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>💼</span>
                <span>출장</span>
              </button>

              <button
                onClick={() => setPresenceStatus('meeting')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  presenceStatus === 'meeting'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>👥</span>
                <span>회의</span>
              </button>

              <button
                onClick={() => setPresenceStatus('away')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  presenceStatus === 'away'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>☕</span>
                <span>비움</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playAlertChime();
              }}
              title="알림음 켜기/끄기"
              className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                soundEnabled
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="응답 제한 시간 및 유휴 감지 설정"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Room & Teacher Filter Toolbar */}
      <div
        className={`p-4 rounded-3xl border flex flex-wrap gap-4 items-center justify-between transition ${
          isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span className="text-slate-500">교무실:</span>
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setSelectedTeacherName('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl border font-black outline-none cursor-pointer ${
                isLight ? 'bg-indigo-50/40 border-indigo-200 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">🏢 전체 교무실 수신</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  📍 {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <User className="w-4 h-4 text-indigo-500" />
            <span className="text-slate-500">선생님:</span>
            <select
              value={selectedTeacherName}
              onChange={(e) => setSelectedTeacherName(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border font-black outline-none cursor-pointer ${
                isLight ? 'bg-indigo-50/40 border-indigo-200 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">👥 전체 선생님 호출 수신</option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.name}>
                  👤 {t.name} 선생님 {t.subject ? `(${t.subject})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* QR Door Placard Print Button (Always Available) */}
          <button
            onClick={() => {
              if (selectedRoom !== 'ALL') {
                onOpenPlacard(selectedRoom);
              } else {
                setIsRoomQrModalOpen(true);
              }
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>{selectedRoom !== 'ALL' ? `[${selectedRoom}] 문앞 부착판 인쇄` : '출입문 QR 부착판 인쇄'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생명/사유 검색..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium outline-none ${
              isLight ? 'bg-indigo-50/20 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
            }`}
          />
        </div>
      </div>

      {/* 3. Live Incoming Calls List */}
      <div
        className={`rounded-3xl border overflow-hidden transition-all ${
          isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-800 bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-emerald-400" />
            <h3 className="font-black text-base">교무실 앞 문앞 학생 호출 기록</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400">
              {filteredCalls.length}건
            </span>
          </div>

          <div className="text-xs text-slate-400">
            실시간 자동 동기화 중
          </div>
        </div>

        {filteredCalls.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-bold text-sm text-slate-500">도착한 호출 기록이 없습니다.</p>
            <p>학생이 교무실 문앞 QR을 스캔하여 호출하면 실시간으로 알림음과 함께 표시됩니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  call.status === 'pending'
                    ? isLight
                      ? 'bg-amber-50/60'
                      : 'bg-amber-950/20'
                    : isLight
                    ? 'hover:bg-slate-50'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">👤 {call.studentName}</span>
                    <span className="text-xs text-slate-500 font-bold">
                      ➔ {call.teacherName} 선생님 ({call.room})
                    </span>
                    {call.status === 'accepted' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        ✓ 수락 완료
                      </span>
                    )}
                    {call.status === 'auto-away' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        부재중 자동안내
                      </span>
                    )}
                    {call.status === 'ignored' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                        거절/취소
                      </span>
                    )}
                    {call.status === 'pending' && (
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-indigo-600 text-white animate-pulse">
                        🔔 호출 대기 중!
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    용건: {call.reason || '방문 호출'}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(call.createdAt)}
                  </span>

                  {call.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAcceptCall(call.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition cursor-pointer"
                      >
                        입실 수락
                      </button>
                      <button
                        onClick={() => handleBusyCall(call.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold transition cursor-pointer"
                      >
                        바쁨/메모유도
                      </button>
                    </div>
                  )}

                  {call.hasMemo && (
                    <button
                      onClick={() => setIsMemoModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400 font-bold border border-indigo-200 dark:border-slate-700 hover:bg-indigo-100 cursor-pointer"
                    >
                      📝 남긴 메모 보기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Active Pending Call Emergency Alert Popup Modal */}
      {activePendingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div
            className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border-2 border-indigo-500 shadow-2xl space-y-6 text-center animate-in zoom-in-95 ${
              isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30 animate-bounce">
              <Bell className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-black tracking-widest text-indigo-600 dark:text-emerald-400 uppercase">
                🚨 문앞 학생 방문 호출 도착!
              </div>
              <h2 className="text-2xl font-black mt-1">
                [{activePendingCall.studentName}] 학생이 호출했습니다
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {activePendingCall.room} • {activePendingCall.teacherName} 선생님 앞
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl text-sm font-bold ${
                isLight ? 'bg-indigo-50 text-indigo-950 border border-indigo-100' : 'bg-slate-800 text-emerald-200'
              }`}
            >
              용건: "{activePendingCall.reason || '선생님 방문'}"
            </div>

            {/* Countdown bar */}
            {responseTimeoutSec > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>자동 부재중 전환까지</span>
                  <span className="text-indigo-600 font-black">{popupRemainingSec}초</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-1000 rounded-full"
                    style={{
                      width: `${(popupRemainingSec / (responseTimeoutSec || 20)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleAcceptCall(activePendingCall.id)}
                className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>들어오세요 (수락)</span>
              </button>

              <button
                onClick={() => handleBusyCall(activePendingCall.id)}
                className="py-3.5 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-black text-sm transition cursor-pointer"
              >
                <span>지금 바쁨 (메모유도)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Visit Memos Modal (when clicking the header button) */}
      {isMemoModalOpen && (
        <VisitMemosModal
          theme={theme}
          calls={calls}
          onClose={() => setIsMemoModalOpen(false)}
          onQuickCallStudent={(studentName) => {
            if (onQuickCallStudent) {
              onQuickCallStudent(studentName);
            }
          }}
        />
      )}

      {/* 6. Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isLight ? 'bg-white border-indigo-100 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>호출 수신 환경 설정</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">
                  호출 팝업 자동 부재중 전환 시간
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 0].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setResponseTimeoutSec(sec)}
                      className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                        responseTimeoutSec === sec
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sec === 0 ? '무제한' : `${sec}초`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">
                  PC 미조작 시 자동 자리비움 보호
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 0, label: '끄기' },
                    { val: 10, label: '10분' },
                    { val: 30, label: '30분' },
                    { val: 60, label: '60분' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setIdleSettingMinutes(opt.val)}
                      className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                        idleSettingMinutes === opt.val
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white text-xs transition cursor-pointer"
              >
                저장 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚪 교무실 출입문 부착용 QR 코드 생성 및 인쇄 모달 */}
      {isRoomQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition space-y-5 max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-indigo-100 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">교무실 문 부착용 QR 안내판 생성</h3>
                  <p className="text-xs text-slate-500">학생이 스마트폰 카메라로 스캔하여 선생님을 호출하는 QR 코드</p>
                </div>
              </div>
              <button
                onClick={() => setIsRoomQrModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                출입문 부착 대상 교무실 선택:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {rooms.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setQrModalRoom(r);
                      setCustomQrRoom('');
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition text-left truncate flex items-center justify-between cursor-pointer ${
                      qrModalRoom === r && !customQrRoom
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">📍 {r}</span>
                    <span className="text-[11px] opacity-75 whitespace-nowrap ml-1">
                      {teachers.filter((t) => t.room === r).length}명
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Room Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">직접 입력:</span>
                <input
                  type="text"
                  value={customQrRoom}
                  onChange={(e) => {
                    setCustomQrRoom(e.target.value);
                    if (e.target.value) setQrModalRoom(e.target.value);
                  }}
                  placeholder="예: 3학년 교무실, 체육관 교무실, 음악실 등"
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Active Room QR Display */}
            {(() => {
              const activeRoom = customQrRoom.trim() || qrModalRoom || '본관 1교무실';
              const studentUrl = getPublicStudentUrl(activeRoom);
              const roomTeachers = teachers.filter((t) => t.room === activeRoom);

              return (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 space-y-4">
                  <div className="text-center space-y-1">
                    <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-black">
                      {activeRoom}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      상주 선생님: {roomTeachers.length > 0 ? roomTeachers.map((t) => t.name).join(', ') : '등록된 교사 없음'}
                    </p>
                  </div>

                  {/* QR Code Graphic */}
                  <div className="flex justify-center p-3 bg-white rounded-2xl border border-slate-200 shadow-inner w-fit mx-auto">
                    <QRCodeSVG value={studentUrl} size={180} level="H" includeMargin />
                  </div>

                  {/* URL Text & Copy */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-mono break-all flex items-center justify-between gap-2">
                    <span className="truncate">{studentUrl}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(studentUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? '복사됨' : '복사'}</span>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => {
                        setIsRoomQrModalOpen(false);
                        onOpenPlacard(activeRoom);
                      }}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>[{activeRoom}] A4 출입문 부착 안내판 인쇄하기</span>
                    </button>

                    <button
                      onClick={() => {
                        window.open(studentUrl, '_blank');
                      }}
                      className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>학생 호출 화면 새 창으로 테스트 열기</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
