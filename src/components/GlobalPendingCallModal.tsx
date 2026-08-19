import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Sparkles,
  Volume2,
  XCircle,
  AlertTriangle,
  Flame,
  Radio,
  DoorOpen,
  LogOut
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import { playAlertChime } from '../utils/audio';
import type { Call, ThemeType } from '../types';

interface GlobalPendingCallModalProps {
  theme: ThemeType;
}

export const GlobalPendingCallModal: React.FC<GlobalPendingCallModalProps> = ({ theme }) => {
  const [pendingCalls, setPendingCalls] = useState<Call[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Subscribe to all incoming calls in real-time
  useEffect(() => {
    const unsubscribe = dbService.subscribeCalls((allCalls) => {
      const pendingList = allCalls.filter((c) => c.status === 'pending');
      setPendingCalls(pendingList);

      if (pendingList.length > 0) {
        // If no active call is currently focused or current one is resolved, focus the latest
        setActiveCall((prev) => {
          if (!prev) {
            playAlertChime();
            setRemainingSec(30);

            // Send OS-level Desktop / Browser Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const target = pendingList[0];
                new Notification(`🚨 [학생 호출] ${target.studentName || '학생'}`, {
                  body: `${target.teacherName} 선생님 (${target.room}) - 교무실 문앞에서 호출 중입니다.`,
                  icon: '/icon.png',
                  requireInteraction: true,
                });
              } catch (e) {
                console.error(e);
              }
            }

            return pendingList[0];
          }
          const stillExists = pendingList.find((c) => c.id === prev.id);
          if (!stillExists) {
            setRemainingSec(30);
            return pendingList[0];
          }
          return stillExists;
        });
      } else {
        setActiveCall(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Tab Title Flasher & Audio Reminder while call is active
  useEffect(() => {
    if (!activeCall) {
      if (typeof document !== 'undefined' && originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
      return;
    }

    let isFlashing = false;
    const titleInterval = setInterval(() => {
      if (typeof document !== 'undefined') {
        document.title = isFlashing
          ? `🔔 [긴급 호출!] ${activeCall.studentName || '학생'} - ${activeCall.teacherName}T`
          : `🚨 [입장 확인 필요] 교무실 앞 학생 호출 대기 중`;
        isFlashing = !isFlashing;
      }
    }, 1000);

    // Audio chime loop every 8 seconds if not responded
    const chimeInterval = setInterval(() => {
      playAlertChime();
    }, 8000);

    return () => {
      clearInterval(titleInterval);
      clearInterval(chimeInterval);
      if (typeof document !== 'undefined' && originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [activeCall?.id, activeCall?.studentName, activeCall?.teacherName]);

  // 30 seconds countdown timer
  useEffect(() => {
    if (!activeCall) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto change to away if no response
          if (activeCall) {
            dbService.updateCallStatus(activeCall.id, 'auto-away');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall?.id]);

  if (!activeCall) return null;

  const isLight = theme === 'vibrant-palette';

  const handleAccept = async () => {
    if (!activeCall) return;
    try {
      await dbService.updateCallStatus(activeCall.id, 'accepted');
      setActiveCall(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWaitOutside = async () => {
    if (!activeCall) return;
    try {
      await dbService.updateCallStatus(activeCall.id, 'wait_outside');
      setActiveCall(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWait = async () => {
    if (!activeCall) return;
    try {
      await dbService.updateCallStatus(activeCall.id, 'auto-away');
      setActiveCall(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!activeCall) return;
    try {
      await dbService.updateCallStatus(activeCall.id, 'ignored');
      setActiveCall(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* 1. TOP FLOATING URGENT TICKER BAR (Always fixed at very top z-[999998]) */}
      <div className="fixed top-0 left-0 right-0 z-[999998] bg-rose-600 text-white py-2.5 px-4 shadow-2xl flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between text-xs sm:text-sm font-black">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 animate-ping text-yellow-300" />
            <span>[긴급 호출 도착] {activeCall.studentName || '학생'} 님이 {activeCall.teacherName} 선생님을 호출했습니다!</span>
          </div>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-mono">
            {remainingSec}초 남음
          </span>
        </div>
      </div>

      {/* 2. SUPER-HIGH PRIORITY FULLSCREEN MODAL (z-[999999] - Never covered by any window) */}
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
        <div
          className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-500 transform scale-100 transition-all ${
            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
          }`}
        >
          {/* Top Header with Pulsing Siren Bell */}
          <div className="flex items-center justify-between pb-4 border-b border-rose-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-600 text-white animate-bounce shadow-xl shadow-rose-600/50">
                <Bell className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1 w-fit">
                  <Flame className="w-3 h-3 text-rose-600" />
                  <span>실시간 학생 방문 호출 도착</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1 text-slate-950 dark:text-white">
                  학생이 문앞에서 호출했습니다!
                </h2>
              </div>
            </div>

            {/* Countdown timer badge */}
            <div className="flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-200 dark:border-rose-800">
              <Clock className="w-4 h-4 animate-spin text-rose-600" />
              <span>{remainingSec}초</span>
            </div>
          </div>

          {/* Big Crisp Arrival Card */}
          <div className="my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-800 dark:to-slate-850 border-2 border-rose-300 dark:border-rose-900/60 shadow-inner space-y-3.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  방문 학생
                </span>
              </div>
              <span className="text-lg sm:text-xl font-black text-rose-950 dark:text-rose-100 bg-white dark:bg-slate-900 px-3.5 py-1 rounded-xl border border-rose-200 dark:border-slate-700 shadow-sm">
                {activeCall.studentName || '학생'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  호출 대상 & 장소
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {activeCall.teacherName} 선생님
                </div>
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  📍 {activeCall.room}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">호출 접수 시각</span>
              <span className="font-mono font-black text-slate-700 dark:text-slate-300">
                {new Date(activeCall.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* 4 Response Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              type="button"
              onClick={handleAccept}
              className="py-3.5 px-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>입장 수락</span>
              <span className="text-[9px] font-normal opacity-90">들어오세요</span>
            </button>

            <button
              type="button"
              onClick={handleWaitOutside}
              className="py-3.5 px-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-sky-600/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center"
            >
              <DoorOpen className="w-5 h-5" />
              <span>밖에서 대기</span>
              <span className="text-[9px] font-normal opacity-90">곧 나갈게요</span>
            </button>

            <button
              type="button"
              onClick={handleWait}
              className="py-3.5 px-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center"
            >
              <Clock className="w-5 h-5" />
              <span>잠시 대기</span>
              <span className="text-[9px] font-normal opacity-90">통화·업무 중</span>
            </button>

            <button
              type="button"
              onClick={handleReject}
              className="py-3.5 px-2.5 rounded-2xl bg-slate-600 hover:bg-slate-700 active:scale-95 text-white font-black text-xs shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center"
            >
              <XCircle className="w-5 h-5" />
              <span>부재중 처리</span>
              <span className="text-[9px] font-normal opacity-90">메모 작성 유도</span>
            </button>
          </div>

          {pendingCalls.length > 1 && (
            <p className="mt-3 text-center text-xs font-bold text-rose-500 dark:text-rose-400 animate-pulse">
              🔔 총 {pendingCalls.length}명의 학생이 호출 대기 중입니다.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

