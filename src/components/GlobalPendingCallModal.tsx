import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  User,
  Building2,
  PhoneCall,
  Sparkles,
  Volume2,
  XCircle,
  MessageSquare
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-indigo-500 transform scale-100 transition-all ${
          isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
        }`}
      >
        {/* Top Header with Pulsing Bell */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-600/40">
              <Bell className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                실시간 학생 방문 호출 도착
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                학생이 문앞에서 호출했습니다!
              </h2>
            </div>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-xs font-black">
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingSec}초</span>
          </div>
        </div>

        {/* Big Crisp Arrival Card */}
        <div className="my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-pink-50/30 dark:from-slate-800/80 dark:to-slate-800/40 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-inner space-y-3.5 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                방문 학생
              </span>
            </div>
            <span className="text-lg sm:text-xl font-black text-indigo-950 dark:text-indigo-100 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-sm">
              {activeCall.studentName || '학생'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                호출 대상 & 장소
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                {activeCall.teacherName} 선생님
              </div>
              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                📍 {activeCall.room}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold">호출 접수 시각</span>
            <span className="font-mono font-black text-slate-700 dark:text-slate-300">
              {new Date(activeCall.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* 3 Response Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleAccept}
            className="py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>입장 수락</span>
            <span className="text-[10px] font-normal opacity-90">지금 들어오세요</span>
          </button>

          <button
            type="button"
            onClick={handleWait}
            className="py-4 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-sm shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition"
          >
            <Clock className="w-6 h-6" />
            <span>잠시 대기</span>
            <span className="text-[10px] font-normal opacity-90">통화·업무 중</span>
          </button>

          <button
            type="button"
            onClick={handleReject}
            className="py-4 px-3 rounded-2xl bg-slate-600 hover:bg-slate-700 active:scale-95 text-white font-black text-sm shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer transition"
          >
            <XCircle className="w-6 h-6" />
            <span>부재중 처리</span>
            <span className="text-[10px] font-normal opacity-90">메모 작성 유도</span>
          </button>
        </div>

        {pendingCalls.length > 1 && (
          <p className="mt-3 text-center text-xs font-bold text-rose-500 dark:text-rose-400">
            🔔 총 {pendingCalls.length}명의 학생이 호출 대기 중입니다.
          </p>
        )}
      </div>
    </div>
  );
};
