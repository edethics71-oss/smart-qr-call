import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Bell,
  Megaphone,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  AlertTriangle,
  Building2,
  RefreshCw,
  Eye,
  Check,
  Flame,
  Radio,
  FileText
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, TeacherCallToStudent, SchoolNotice, ThemeType, NoticeType } from '../types';

interface TeacherToStudentDispatchProps {
  theme: ThemeType;
  teachers: Teacher[];
  prefilledStudentName?: string;
  onClearPrefill?: () => void;
}

export const TeacherToStudentDispatch: React.FC<TeacherToStudentDispatchProps> = ({
  theme,
  teachers,
  prefilledStudentName,
  onClearPrefill,
}) => {
  const isLight = theme === 'vibrant-palette';

  // Primary mode: 'call_student' (개별 학생 호출) | 'homeroom_notice' (우리 반 조회/종례) | 'school_notice' (학년/전교생/부서 공지)
  const [dispatchMode, setDispatchMode] = useState<'call_student' | 'homeroom_notice' | 'school_notice'>('call_student');

  // Teacher identification
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(
    teachers[0]?.name || '김민준'
  );
  const currentTeacherObj = useMemo(() => {
    return teachers.find((t) => t.name === selectedTeacherName) || teachers[0];
  }, [teachers, selectedTeacherName]);

  // Form states for Call Student
  const [callGrade, setCallGrade] = useState<number>(1);
  const [callClass, setCallClass] = useState<number>(3);
  const [callNumber, setCallNumber] = useState<string>('');
  const [callStudentName, setCallStudentName] = useState<string>(prefilledStudentName || '');
  const [callMessage, setCallMessage] = useState<string>('');
  const [callPreset, setCallPreset] = useState<string>('지금 본관 교무실로 오세요.');

  // Form states for Homeroom Notice (조회/종례)
  const [homeroomType, setHomeroomType] = useState<'homeroom_morning' | 'homeroom_closing'>('homeroom_closing');
  const [hrGrade, setHrGrade] = useState<number>(1);
  const [hrClass, setHrClass] = useState<number>(3);
  const [hrTitle, setHrTitle] = useState<string>('');
  const [hrContent, setHrContent] = useState<string>('');
  const [hrIsUrgent, setHrIsUrgent] = useState<boolean>(false);

  // Form states for School / Grade / Department Notice
  const [schoolNoticeType, setSchoolNoticeType] = useState<NoticeType>('grade');
  const [snTargetGrade, setSnTargetGrade] = useState<number>(1); // 0 = all
  const [snTargetClass, setSnTargetClass] = useState<number>(0); // 0 = all
  const [snDepartment, setSnDepartment] = useState<string>('교무기획부');
  const [snTitle, setSnTitle] = useState<string>('');
  const [snContent, setSnContent] = useState<string>('');
  const [snIsUrgent, setSnIsUrgent] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Live Subscriptions
  const [activeTeacherCalls, setActiveTeacherCalls] = useState<TeacherCallToStudent[]>([]);
  const [activeNotices, setActiveNotices] = useState<SchoolNotice[]>([]);

  useEffect(() => {
    if (prefilledStudentName) {
      setCallStudentName(prefilledStudentName);
      setDispatchMode('call_student');
    }
  }, [prefilledStudentName]);

  useEffect(() => {
    const unsubCalls = dbService.subscribeTeacherCallsToStudent((list) => {
      setActiveTeacherCalls(list);
    });
    const unsubNotices = dbService.subscribeSchoolNotices((list) => {
      setActiveNotices(list);
    });
    return () => {
      unsubCalls();
      unsubNotices();
    };
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Quick Preset Buttons for Student Call
  const presets = [
    { label: '⚡ 지금 교무실로 방문', text: '지금 본관 교무실로 오세요.' },
    { label: '☕ 쉬는 시간에 방문', text: '다음 쉬는 시간에 학습지 챙겨서 교무실로 오세요.' },
    { label: '🧹 청소 구역 담당 확인', text: '오늘 종례 후 청소 구역으로 모여주세요.' },
    { label: '💬 방과후 개별 상담', text: '오늘 방과후에 진로 상담실로 와주세요.' },
    { label: '📝 제출물 미제출 확인', text: '아직 제출하지 않은 과제물 및 서류를 오늘 중으로 제출하세요.' },
  ];

  // Quick presets for Homeroom Notice
  const homeroomPresets = [
    {
      title: '오늘 종례 사항 안내',
      content: '1. 내일 영어 듣기평가 실시 (8:30까지 입실 완료)\n2. 체험학습 신청서 내일까지 제출\n3. 7교시 진로활동 강당 집합',
    },
    {
      title: '아침 조회 및 준비물 공지',
      content: '1. 1교시 체육 수업 체육관으로 이동\n2. 건강상태 자가진단 미완료 학생은 8:50까지 완료할 것\n3. 수행평가 학습지 배부 예정',
    },
  ];

  // Handle Send Student Call
  const handleSendCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = callStudentName.trim() || `${callClass}반 학생`;
    const finalMsg = callMessage.trim() || callPreset;

    setIsSubmitting(true);
    try {
      await dbService.addTeacherCallToStudent({
        teacherName: currentTeacherObj?.name || '선생님',
        teacherRoom: currentTeacherObj?.room || '본관 1교무실',
        targetGrade: Number(callGrade),
        targetClass: Number(callClass),
        targetNumber: callNumber ? Number(callNumber) : undefined,
        targetStudentName: finalName,
        message: finalMsg,
        presetType: 'custom',
      });

      showToast(`📢 [${callGrade}학년 ${callClass}반 ${finalName}] 학생에게 실시간 호출이 전송되었습니다!`);
      setCallStudentName('');
      setCallNumber('');
      setCallMessage('');
      if (onClearPrefill) onClearPrefill();
    } catch (err) {
      console.error(err);
      alert('호출 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Homeroom Notice
  const handleSendHomeroomNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrTitle.trim() || !hrContent.trim()) {
      alert('알림장 제목과 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.addSchoolNotice({
        type: homeroomType,
        title: hrTitle.trim(),
        content: hrContent.trim(),
        senderName: currentTeacherObj?.name || '담임교사',
        senderRole: `${hrGrade}학년 ${hrClass}반 담임`,
        targetGrade: Number(hrGrade),
        targetClass: Number(hrClass),
        isUrgent: hrIsUrgent,
        date: new Date().toISOString().slice(0, 10),
      });

      showToast(`📋 [${hrGrade}학년 ${hrClass}반] ${homeroomType === 'homeroom_morning' ? '조회' : '종례'} 알림장이 배포되었습니다!`);
      setHrTitle('');
      setHrContent('');
      setHrIsUrgent(false);
    } catch (err) {
      console.error(err);
      alert('공지 배포 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send School / Grade / Department Notice
  const handleSendSchoolNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snTitle.trim() || !snContent.trim()) {
      alert('공지 제목과 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleStr =
        schoolNoticeType === 'department'
          ? snDepartment
          : schoolNoticeType === 'grade'
          ? `${snTargetGrade}학년 부장`
          : '교무기획부';

      await dbService.addSchoolNotice({
        type: schoolNoticeType,
        title: snTitle.trim(),
        content: snContent.trim(),
        senderName: currentTeacherObj?.name || '담당교사',
        senderRole: roleStr,
        targetGrade: Number(snTargetGrade),
        targetClass: Number(snTargetClass),
        targetDepartment: schoolNoticeType === 'department' ? snDepartment : undefined,
        isUrgent: snIsUrgent,
        date: new Date().toISOString().slice(0, 10),
      });

      showToast(`📢 학교 공지사항이 성공적으로 전달되었습니다!`);
      setSnTitle('');
      setSnContent('');
      setSnIsUrgent(false);
    } catch (err) {
      console.error(err);
      alert('공지 배포 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCall = async (id: string) => {
    if (window.confirm('이 호출 내역을 삭제하시겠습니까?')) {
      await dbService.deleteTeacherCall(id);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (window.confirm('이 공지사항을 삭제하시겠습니까?')) {
      await dbService.deleteSchoolNotice(id);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-2xl shadow-emerald-900/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>📢 학생 호출 & 공지 발송 센터</span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            개별 학생 스마트폰 실시간 호출, 우리 반 조회·종례 알림장, 학년 및 부서별 공지를 한곳에서 발송합니다.
          </p>
        </div>

        {/* Sender Teacher Selector */}
        <div
          className={`flex items-center gap-2 p-2 rounded-2xl border text-xs font-bold ${
            isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>발신 교사:</span>
          <select
            value={selectedTeacherName}
            onChange={(e) => setSelectedTeacherName(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border outline-none font-black cursor-pointer ${
              isLight
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-slate-800 border-slate-700 text-emerald-300'
            }`}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.name}>
                🧑‍🏫 {t.name} 선생님 ({t.room})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Main Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setDispatchMode('call_student')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
            dispatchMode === 'call_student'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-400/40'
              : isLight
              ? 'bg-white border-indigo-100 hover:border-indigo-300 text-slate-800'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
              dispatchMode === 'call_student'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100 text-indigo-600 dark:bg-slate-800 dark:text-emerald-400'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm">1. 개별 학생 실시간 호출</div>
            <div
              className={`text-xs mt-0.5 ${
                dispatchMode === 'call_student' ? 'text-indigo-100' : 'text-slate-400'
              }`}
            >
              스마트폰으로 "지금 오세요" 전송 & 실시간 수락 확인
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDispatchMode('homeroom_notice')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
            dispatchMode === 'homeroom_notice'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-400/40'
              : isLight
              ? 'bg-white border-indigo-100 hover:border-indigo-300 text-slate-800'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
              dispatchMode === 'homeroom_notice'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm">2. 우리 반 조회·종례 알림장</div>
            <div
              className={`text-xs mt-0.5 ${
                dispatchMode === 'homeroom_notice' ? 'text-indigo-100' : 'text-slate-400'
              }`}
            >
              학급 전체에게 준비물 및 종례 사항 배포 & 읽음 집계
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDispatchMode('school_notice')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
            dispatchMode === 'school_notice'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-400/40'
              : isLight
              ? 'bg-white border-indigo-100 hover:border-indigo-300 text-slate-800'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
              dispatchMode === 'school_notice'
                ? 'bg-white/20 text-white'
                : 'bg-purple-100 text-purple-600 dark:bg-slate-800 dark:text-emerald-400'
            }`}
          >
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm">3. 학년 / 부서 / 전교생 공지</div>
            <div
              className={`text-xs mt-0.5 ${
                dispatchMode === 'school_notice' ? 'text-indigo-100' : 'text-slate-400'
              }`}
            >
              학력평가, 수강신청, 도서관 등 부서별 전달사항
            </div>
          </div>
        </button>
      </div>

      {/* Main Grid: Left Form (7 cols), Right Active Feeds (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Input Form */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-white shadow-xl'
            }`}
          >
            {/* MODE 1: Call Single Student Form */}
            {dispatchMode === 'call_student' && (
              <form onSubmit={handleSendCall} className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-indigo-50 dark:border-slate-800">
                  <Radio className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
                  <h3 className="font-black text-lg">개별 학생 스마트폰 실시간 호출</h3>
                </div>

                {/* Target Student Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">학년</label>
                    <select
                      value={callGrade}
                      onChange={(e) => setCallGrade(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      {[1, 2, 3].map((g) => (
                        <option key={g} value={g}>
                          {g}학년
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">학급(반)</label>
                    <select
                      value={callClass}
                      onChange={(e) => setCallClass(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                        <option key={c} value={c}>
                          {c}반
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">출석번호 (선택)</label>
                    <input
                      type="number"
                      value={callNumber}
                      onChange={(e) => setCallNumber(e.target.value)}
                      placeholder="예: 15"
                      min="1"
                      max="40"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-medium outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">학생 성함</label>
                    <input
                      type="text"
                      value={callStudentName}
                      onChange={(e) => setCallStudentName(e.target.value)}
                      placeholder="예: 김철수 (또는 반전체)"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-black outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-500">
                    ⚡ 자주 쓰는 호출 메시지 선택:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCallPreset(p.text);
                          setCallMessage(p.text);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                          callMessage === p.text
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Custom Box */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    호출 메시지 내용 <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={callMessage}
                    onChange={(e) => setCallMessage(e.target.value)}
                    placeholder="학생 스마트폰 화면에 굵은 글씨로 크게 표시될 메시지입니다. (예: 3교시 쉬는 시간에 수학 학습지 들고 본관 1교무실로 오세요.)"
                    className={`w-full p-3 rounded-2xl border text-sm font-medium outline-none leading-relaxed ${
                      isLight
                        ? 'bg-indigo-50/20 border-indigo-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? '호출 전송 중...'
                      : `[${callGrade}학년 ${callClass}반 ${callStudentName || '학생'}] 스마트폰으로 즉시 호출하기`}
                  </span>
                </button>
              </form>
            )}

            {/* MODE 2: Homeroom Morning/Closing Notice Form */}
            {dispatchMode === 'homeroom_notice' && (
              <form onSubmit={handleSendHomeroomNotice} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-indigo-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-black text-lg">우리 반 조회 / 종례 알림장 배포</h3>
                  </div>

                  {/* Morning / Closing Switch */}
                  <div
                    className={`flex p-1 rounded-xl border text-xs font-bold ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setHomeroomType('homeroom_morning')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        homeroomType === 'homeroom_morning'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      🌅 아침 조회
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeroomType('homeroom_closing')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        homeroomType === 'homeroom_closing'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      🌇 하교 종례
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">담당 학년</label>
                    <select
                      value={hrGrade}
                      onChange={(e) => setHrGrade(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      {[1, 2, 3].map((g) => (
                        <option key={g} value={g}>
                          {g}학년
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">담당 학급(반)</label>
                    <select
                      value={hrClass}
                      onChange={(e) => setHrClass(Number(e.target.value))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                        <option key={c} value={c}>
                          {c}반
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preset suggestions */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">예시 템플릿 채우기:</label>
                  <div className="flex gap-2">
                    {homeroomPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setHrTitle(p.title);
                          setHrContent(p.content);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                          isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        ⚡ {p.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    알림장 제목 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={hrTitle}
                    onChange={(e) => setHrTitle(e.target.value)}
                    placeholder="예: 8월 15일 1학년 3반 하교 종례 사항"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none ${
                      isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    전달 사항 상세 내용 <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={hrContent}
                    onChange={(e) => setHrContent(e.target.value)}
                    placeholder={`1. 내일 준비물: 미술 준비물(수채화 도구)\n2. 자율동아리 신청서 금요일까지 제출\n3. 청소구역 담당자 16:30까지 남기`}
                    className={`w-full p-3 rounded-2xl border text-sm font-medium leading-relaxed outline-none ${
                      isLight
                        ? 'bg-indigo-50/20 border-indigo-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-hr-urgent"
                    checked={hrIsUrgent}
                    onChange={(e) => setHrIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="chk-hr-urgent" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                    🚨 중요 공지 강조 (학생 스마트폰에 붉은색 배너로 강조 표시)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? '알림장 배포 중...'
                      : `[${hrGrade}학년 ${hrClass}반] 전체 학생에게 알림장 배포하기`}
                  </span>
                </button>
              </form>
            )}

            {/* MODE 3: School / Grade / Department Notice Form */}
            {dispatchMode === 'school_notice' && (
              <form onSubmit={handleSendSchoolNotice} className="space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-indigo-50 dark:border-slate-800">
                  <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-black text-lg">학년 / 부서 / 전교생 공지 전달</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">공지 분류</label>
                    <select
                      value={schoolNoticeType}
                      onChange={(e) => setSchoolNoticeType(e.target.value as NoticeType)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      <option value="grade">🏫 특정 학년 전체 공지</option>
                      <option value="department">🏢 행정/교과 부서별 공지</option>
                      <option value="school">🌟 전교생 전체 공지</option>
                    </select>
                  </div>

                  {schoolNoticeType === 'grade' && (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">대상 학년</label>
                      <select
                        value={snTargetGrade}
                        onChange={(e) => setSnTargetGrade(Number(e.target.value))}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                          isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        <option value={1}>1학년 전체</option>
                        <option value={2}>2학년 전체</option>
                        <option value={3}>3학년 전체</option>
                      </select>
                    </div>
                  )}

                  {schoolNoticeType === 'department' && (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">발신 부서</label>
                      <select
                        value={snDepartment}
                        onChange={(e) => setSnDepartment(e.target.value)}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                          isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        <option value="교무기획부">교무기획부</option>
                        <option value="학생생활안전부">학생생활안전부</option>
                        <option value="교육연구부/도서관">교육연구부 (도서관)</option>
                        <option value="진로진학상담부">진로진학상담부</option>
                        <option value="체육보건부">체육보건부</option>
                        <option value="정보과학부">정보과학부</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    공지 제목 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={snTitle}
                    onChange={(e) => setSnTitle(e.target.value)}
                    placeholder="예: 2학기 방과후학교 수강신청 마감 안내"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none ${
                      isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    공지 내용 <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={snContent}
                    onChange={(e) => setSnContent(e.target.value)}
                    placeholder="학생들에게 안내할 상세 일정, 준비물, 주의사항을 작성하세요."
                    className={`w-full p-3 rounded-2xl border text-sm font-medium leading-relaxed outline-none ${
                      isLight
                        ? 'bg-indigo-50/20 border-indigo-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-sn-urgent"
                    checked={snIsUrgent}
                    onChange={(e) => setSnIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                  <label htmlFor="chk-sn-urgent" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                    🚨 긴급 공지 (학생 화면 접속 시 최상단 팝업 배너 표시)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{isSubmitting ? '공지 전달 중...' : '학생들에게 공지사항 전달하기'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Real-time Live Feeds & Confirmation Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Teacher Calls Feed */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-white shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600 dark:text-emerald-400" />
                <h4 className="font-black text-sm">실시간 학생 호출 현황</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400 font-bold">
                  {activeTeacherCalls.length}건
                </span>
              </div>
            </div>

            {activeTeacherCalls.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                현재 전송된 학생 호출 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeTeacherCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`p-3 rounded-2xl border text-xs transition ${
                      call.status === 'acknowledged'
                        ? isLight
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-emerald-950/20 border-emerald-800'
                        : isLight
                        ? 'bg-indigo-50/40 border-indigo-100'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black flex items-center gap-1.5">
                          <span>
                            {call.targetGrade}학년 {call.targetClass}반{' '}
                            {call.targetNumber ? `${call.targetNumber}번 ` : ''}
                            {call.targetStudentName}
                          </span>
                          {call.status === 'acknowledged' ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-600 text-white flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>확인 완료 ({call.ackAt ? formatTime(call.ackAt) : ''})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>전송됨 (수신 대기)</span>
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 mt-1 font-medium leading-tight">
                          💬 "{call.message}"
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteCall(call.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Notices & Homeroom Board Feed */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-white shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-black text-sm">배포된 공지 & 조회/종례 목록</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold">
                  {activeNotices.length}개
                </span>
              </div>
            </div>

            {activeNotices.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                등록된 공지 및 알림장이 없습니다.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {activeNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className={`p-3 rounded-2xl border text-xs transition ${
                      isLight
                        ? 'bg-white border-indigo-100 hover:border-indigo-200'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-black">
                          {notice.isUrgent && <span className="text-rose-500 font-black">🚨 [긴급]</span>}
                          <span>{notice.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>👤 {notice.senderRole}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">
                            👁️ {notice.confirmedStudentIds?.length || 0}명 확인 완료
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
