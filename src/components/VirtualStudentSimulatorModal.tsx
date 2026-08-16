import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Radio,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Volume2,
  School,
  Send,
  UserCheck,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, TeacherCallToStudent, StudentRecord, ThemeType } from '../types';

interface VirtualStudentSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeType;
  currentTeacher?: Teacher | null;
}

export const VirtualStudentSimulatorModal: React.FC<VirtualStudentSimulatorModalProps> = ({
  isOpen,
  onClose,
  theme,
  currentTeacher,
}) => {
  const isLight = theme === 'vibrant-palette';

  // Selected virtual student persona
  const [targetGrade, setTargetGrade] = useState<number>(1);
  const [targetClass, setTargetClass] = useState<number>(3);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [classStudents, setClassStudents] = useState<StudentRecord[]>([]);

  // Simulation Teacher Dispatch State
  const [callMessage, setCallMessage] = useState<string>('지금 3교시 쉬는 시간에 수학 학습지 챙겨서 교무실로 오세요.');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Live Calls subscription for the selected virtual student
  const [studentCalls, setStudentCalls] = useState<TeacherCallToStudent[]>([]);
  const [lastAckMsg, setLastAckMsg] = useState<string>('');

  // Load roster for grade & class
  useEffect(() => {
    if (!isOpen) return;
    const unsub = dbService.subscribeStudents(
      (list) => {
        setClassStudents(list);
        if (list.length > 0) {
          setSelectedStudent((prev) => {
            const found = list.find((s) => s.id === prev?.id);
            return found || list[0];
          });
        } else {
          // Default to a fallback virtual student so it is ALWAYS interactive
          setSelectedStudent((prev) => prev || {
            id: 'sim-1',
            grade: targetGrade,
            classNum: targetClass,
            studentNumber: 1,
            name: '홍길동',
            createdAt: Date.now(),
          });
        }
      },
      targetGrade,
      targetClass
    );
    return () => unsub();
  }, [isOpen, targetGrade, targetClass]);

  // Subscribe to live calls targeting this virtual student
  useEffect(() => {
    if (!isOpen || !selectedStudent) {
      setStudentCalls([]);
      return;
    }

    const unsub = dbService.subscribeTeacherCallsToStudent((calls) => {
      const relevant = calls.filter((c) => {
        if (c.targetGrade !== 0 && c.targetGrade !== selectedStudent.grade) return false;
        if (c.targetClass !== 0 && c.targetClass !== selectedStudent.classNum) return false;
        if (c.targetNumber && c.targetNumber !== 0 && c.targetNumber !== selectedStudent.studentNumber) {
          if (c.targetStudentName && !c.targetStudentName.includes(selectedStudent.name)) {
            return false;
          }
        }
        return true;
      });
      setStudentCalls(relevant);
    });

    return () => unsub();
  }, [isOpen, selectedStudent]);

  if (!isOpen) return null;

  const handleSendCallFromTeacher = async () => {
    if (!selectedStudent) {
      alert('호출할 가상 학생을 선택해주세요.');
      return;
    }

    setIsSending(true);
    try {
      await dbService.addTeacherCallToStudent({
        teacherName: currentTeacher?.name || '김교무 선생님',
        teacherRoom: currentTeacher?.room || '본관 1교무실',
        targetGrade: selectedStudent.grade,
        targetClass: selectedStudent.classNum,
        targetNumber: selectedStudent.studentNumber,
        targetStudentName: selectedStudent.name,
        message: callMessage.trim() || '교무실로 즉시 와주세요.',
        presetType: 'custom',
      });

      setToastMessage(`⚡ [${selectedStudent.name}] 학생의 스마트폰으로 호출 신호가 즉시 전송되었습니다!`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('호출 신호 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcknowledgeFromPhone = async (callId: string) => {
    try {
      await dbService.acknowledgeTeacherCall(callId);
      setLastAckMsg('선생님께 "확인 완료 & 지금 교무실로 출발 🏃" 신호가 전송되었습니다!');
      setTimeout(() => setLastAckMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeUrgentCall = studentCalls.find((c) => c.status === 'sent');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-slate-50 border-indigo-200' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  가상 학생 호출 & 실시간 스마트폰 수신 시뮬레이터
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  실시간 인터랙티브 테스트
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                왼쪽에서 선생님이 호출을 전송하면, 오른쪽 가상 학생 스마트폰 화면에 0.1초 만에 알림이 뜹니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Teacher Dispatch Control (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div
              className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                isLight ? 'bg-white border-indigo-100' : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-black">1. 교사 측: 가상 학생 선택 및 호출 발송</h4>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  발신: {currentTeacher?.name || '김교무 선생님'} ({currentTeacher?.room || '본관 1교무실'})
                </span>
              </div>

              {/* Grade & Class selectors */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    대상 학년
                  </label>
                  <select
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isLight ? 'bg-indigo-50/40 border-indigo-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    대상 학급(반)
                  </label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isLight ? 'bg-indigo-50/40 border-indigo-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        {c}반
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student quick selection list & Direct Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>가상 학생 선택 ({selectedStudent ? `${selectedStudent.grade}-${selectedStudent.classNum} ${selectedStudent.studentNumber}번 ${selectedStudent.name}` : '선택 없음'}):</span>
                  <span className="text-indigo-600 font-bold text-[11px]">클릭 즉시 가상 폰과 연결</span>
                </label>

                {/* Quick Persona Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
                  {[
                    { id: 'sim-1', grade: targetGrade, classNum: targetClass, studentNumber: 1, name: '홍길동' },
                    { id: 'sim-2', grade: targetGrade, classNum: targetClass, studentNumber: 2, name: '안유진' },
                    { id: 'sim-3', grade: targetGrade, classNum: targetClass, studentNumber: 3, name: '김민준' },
                    { id: 'sim-4', grade: targetGrade, classNum: targetClass, studentNumber: 4, name: '이서연' },
                    ...classStudents.filter(s => !['홍길동', '안유진', '김민준', '이서연'].includes(s.name)),
                  ].map((std) => (
                    <button
                      key={std.id || `${std.grade}-${std.classNum}-${std.studentNumber}`}
                      type="button"
                      onClick={() => setSelectedStudent({
                        id: std.id || `sim-${std.studentNumber}`,
                        grade: targetGrade,
                        classNum: targetClass,
                        studentNumber: std.studentNumber,
                        name: std.name,
                        createdAt: Date.now(),
                      })}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold transition flex items-center gap-1 cursor-pointer ${
                        selectedStudent?.name === std.name && selectedStudent?.studentNumber === std.studentNumber
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                          : isLight
                          ? 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-[10px] text-indigo-400 font-bold">{std.studentNumber}번</span>
                      <span>{std.name}</span>
                    </button>
                  ))}
                </div>

                {/* Direct Custom Name Input */}
                <div className="flex gap-2 items-center pt-1">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={selectedStudent?.studentNumber || 1}
                    onChange={(e) => setSelectedStudent(prev => ({
                      id: prev?.id || 'custom-sim',
                      grade: targetGrade,
                      classNum: targetClass,
                      studentNumber: Number(e.target.value) || 1,
                      name: prev?.name || '홍길동',
                      createdAt: Date.now(),
                    }))}
                    className={`w-16 p-2 text-xs rounded-xl border font-bold text-center ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                    placeholder="번호"
                  />
                  <input
                    type="text"
                    value={selectedStudent?.name || ''}
                    onChange={(e) => setSelectedStudent(prev => ({
                      id: prev?.id || 'custom-sim',
                      grade: targetGrade,
                      classNum: targetClass,
                      studentNumber: prev?.studentNumber || 1,
                      name: e.target.value,
                      createdAt: Date.now(),
                    }))}
                    placeholder="원하는 학생 이름 입력 (예: 홍길동)"
                    className={`flex-1 p-2 text-xs rounded-xl border font-bold ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Message preset buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  호출 메시지 예시 프리셋:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '지금 3교시 쉬는 시간에 수학 학습지 챙겨서 교무실로 오세요.',
                    '오늘 종례 후 청소 구역(본관 3층 복도) 확인 바랍니다.',
                    '방과후 진로상담실에서 상담 예정이니 16:30까지 오세요.',
                    '미제출된 수행평가 서류를 5교시 시작 전까지 제출하세요.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCallMessage(preset)}
                      className={`p-2 rounded-xl border text-[11px] font-bold text-left transition cursor-pointer line-clamp-2 ${
                        callMessage === preset
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  호출 메시지 내용 직접 입력
                </label>
                <textarea
                  rows={2}
                  value={callMessage}
                  onChange={(e) => setCallMessage(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                />
              </div>

              {toastMessage && (
                <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold animate-pulse flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{toastMessage}</span>
                </div>
              )}

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendCallFromTeacher}
                disabled={isSending || !selectedStudent}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                <span>
                  {selectedStudent
                    ? `[${selectedStudent.grade}-${selectedStudent.classNum} ${selectedStudent.name}] 학생에게 호출 신호 보내기 📡`
                    : '가상 학생을 먼저 선택해주세요'}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT: Virtual Student Smartphone Mockup (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>2. 학생 스마트폰 수신 화면 (실시간 PWA 연동 화면)</span>
            </div>

            {/* Smartphone Outer Frame */}
            <div
              className={`w-full max-w-[340px] rounded-[36px] p-3 border-[6px] shadow-2xl flex flex-col ${
                isLight
                  ? 'bg-slate-900 border-slate-800 text-slate-900'
                  : 'bg-slate-950 border-slate-800 text-white'
              }`}
            >
              {/* Speaker / Camera Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>

              {/* Screen Inner Container */}
              <div
                className={`flex-1 rounded-[26px] p-4 flex flex-col overflow-hidden relative min-h-[460px] ${
                  isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-white'
                }`}
              >
                {/* Mobile Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <div className="font-black text-indigo-600 flex items-center gap-1">
                    <School className="w-3.5 h-3.5" />
                    <span>스마트 학생 PWA</span>
                  </div>
                  <div className="font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                    {selectedStudent ? `${selectedStudent.grade}-${selectedStudent.classNum} ${selectedStudent.name}` : '학생 미선택'}
                  </div>
                </div>

                {/* Mobile Tab Simulation Header */}
                <div className="my-2 p-1 rounded-xl bg-slate-200 dark:bg-slate-800 flex text-[10px] font-bold">
                  <div className="flex-1 py-1 text-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    📢 알림장·호출
                  </div>
                  <div className="flex-1 py-1 text-center text-slate-400">
                    📍 등교출결
                  </div>
                  <div className="flex-1 py-1 text-center text-slate-400">
                    🔔 교무실접수
                  </div>
                </div>

                {/* Screen Content: Live Teacher Call Popup or List */}
                <div className="flex-1 overflow-y-auto space-y-3 pt-1">
                  {lastAckMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black animate-bounce text-center">
                      {lastAckMsg}
                    </div>
                  )}

                  {/* URGENT FULL BANNER (If Active unread call exists) */}
                  {activeUrgentCall ? (
                    <div className="p-3.5 rounded-2xl bg-rose-500 text-white shadow-lg space-y-2 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-black/30 rounded-full flex items-center gap-1 animate-pulse">
                          <Radio className="w-3 h-3" />
                          <span>선생님 실시간 호출 수신!</span>
                        </span>
                        <span className="text-[10px] font-bold opacity-80">방금 전</span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-rose-100">
                          {activeUrgentCall.teacherName} 선생님 ({activeUrgentCall.teacherRoom})
                        </div>
                        <div className="text-sm font-black mt-1 leading-snug">
                          "{activeUrgentCall.message}"
                        </div>
                      </div>

                      {/* Interactive ACK button right inside simulator */}
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeFromPhone(activeUrgentCall.id)}
                        className="w-full py-2.5 rounded-xl bg-white text-rose-600 font-black text-xs shadow-md hover:bg-rose-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>확인 및 지금 출발 🏃</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center py-6 text-slate-400 text-xs">
                      <Volume2 className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-indigo-600" />
                      <p className="font-bold">현재 대기 중인 긴급 호출이 없습니다.</p>
                      <p className="text-[10px] mt-1 text-slate-400">
                        왼쪽 [호출 신호 보내기]를 누르면<br />여기에 실시간 팝업이 울립니다.
                      </p>
                    </div>
                  )}

                  {/* Call History for this student */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      수신된 호출 이력 ({studentCalls.length}건):
                    </span>
                    {studentCalls.map((call) => (
                      <div
                        key={call.id}
                        className={`p-2.5 rounded-xl border text-[11px] ${
                          call.status === 'acknowledged'
                            ? isLight
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : 'bg-emerald-950/30 border-emerald-900/60'
                            : isLight
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {call.teacherName} 선생님
                          </span>
                          {call.status === 'acknowledged' ? (
                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>출발 확인됨</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              <span>수신 대기</span>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                          {call.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home Indicator bar */}
                <div className="w-20 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>이 시뮬레이터는 실제 모바일 브라우저 환경과 동일하게 Firestore/브로드캐스트 채널로 작동합니다.</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold cursor-pointer hover:bg-slate-700 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
