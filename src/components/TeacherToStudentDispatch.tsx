import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  Smartphone,
  Paperclip,
  Link2,
  ExternalLink,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { dbService } from '../lib/firebase';
import { getStudentDirectLoginUrl } from '../lib/urlUtils';
import type { Teacher, TeacherCallToStudent, SchoolNotice, ThemeType, NoticeType, StudentRecord, NoticeAttachment } from '../types';
import { VirtualStudentSimulatorModal } from './VirtualStudentSimulatorModal';

export const GEMINI_SURVEY_APP_URL = 'https://share.gemini.google/8FT6YerwHNHU';

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
  const [snTargetGrades, setSnTargetGrades] = useState<number[]>([1]); // multi-select [1], [1, 2], [2, 3], etc.
  const [snTargetClass, setSnTargetClass] = useState<number>(0); // 0 = all
  const [snDepartment, setSnDepartment] = useState<string>('교무기획부');
  const [snCustomDepartment, setSnCustomDepartment] = useState<string>('');
  const [snAudience, setSnAudience] = useState<'all' | 'teachers' | 'students'>('students');
  const [snDeptStudentGrades, setSnDeptStudentGrades] = useState<number[]>([1, 2, 3]); // when students chosen in dept
  const [snTitle, setSnTitle] = useState<string>('');
  const [snContent, setSnContent] = useState<string>('');
  const [snIsUrgent, setSnIsUrgent] = useState<boolean>(false);

  // Attachments state
  const [snAttachments, setSnAttachments] = useState<NoticeAttachment[]>([]);
  const noticeAttachmentInputRef = useRef<HTMLInputElement>(null);

  // External Application / Survey Link state (선착순 신청 링크)
  const [snHasLink, setSnHasLink] = useState<boolean>(false);
  const [snLinkUrl, setSnLinkUrl] = useState<string>('');
  const [snLinkLabel, setSnLinkLabel] = useState<string>('선착순 신청하기');
  const [snIsFirstCome, setSnIsFirstCome] = useState<boolean>(false);
  const [snDeadline, setSnDeadline] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Attachment file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const sizeStr =
        file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : Math.round(file.size / 1024) + ' KB';

      const reader = new FileReader();
      reader.onload = () => {
        setSnAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: sizeStr,
            type: file.type,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
    showToast('📎 첨부파일이 등록되었습니다.');
  };

  const handleRemoveAttachment = (index: number) => {
    setSnAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick preset: Apply Gemini Survey App URL
  const handleApplyGeminiSurveyPreset = () => {
    setSnHasLink(true);
    setSnLinkUrl(GEMINI_SURVEY_APP_URL);
    setSnLinkLabel('📝 설문지 작성 / 선착순 신청하기');
    setSnIsFirstCome(true);
    setSnDeadline('선착순 마감 시 종료');
    showToast('✨ 내가 만든 제미나이 설문지 앱 주소와 설정이 자동 입력되었습니다!');
  };

  // Live Subscriptions
  const [activeTeacherCalls, setActiveTeacherCalls] = useState<TeacherCallToStudent[]>([]);
  const [activeNotices, setActiveNotices] = useState<SchoolNotice[]>([]);
  const [classRoster, setClassRoster] = useState<StudentRecord[]>([]);

  useEffect(() => {
    if (prefilledStudentName) {
      setCallStudentName(prefilledStudentName);
      setDispatchMode('call_student');
    }
  }, [prefilledStudentName]);

  // Subscribe to students in the selected class
  useEffect(() => {
    const unsubStudents = dbService.subscribeStudents(
      (list) => {
        setClassRoster(list);
      },
      callGrade,
      callClass
    );
    return () => unsubStudents();
  }, [callGrade, callClass]);

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

    if (schoolNoticeType === 'grade' && snTargetGrades.length === 0) {
      alert('대상 학년을 최소 1개 이상 선택해주세요 (예: 1학년, 2학년, 3학년).');
      return;
    }

    if (schoolNoticeType === 'department' && snAudience === 'students' && snDeptStudentGrades.length === 0) {
      alert('학생 수신 대상 학년을 최소 1개 이상 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeDept = snCustomDepartment.trim() || snDepartment;
      let roleStr = '교무기획부';
      let finalTargetGrades: number[] = [];
      let finalTargetAudience: 'all' | 'teachers' | 'students' = 'all';

      if (schoolNoticeType === 'grade') {
        const sortedGrades = [...snTargetGrades].sort((a, b) => a - b);
        roleStr = `${sortedGrades.join('·')}학년 부장`;
        finalTargetGrades = sortedGrades;
        finalTargetAudience = 'students';
      } else if (schoolNoticeType === 'department') {
        roleStr = activeDept;
        finalTargetAudience = snAudience;
        if (snAudience === 'students') {
          finalTargetGrades = [...snDeptStudentGrades].sort((a, b) => a - b);
        } else {
          finalTargetGrades = [1, 2, 3];
        }
      } else {
        // 'school'
        roleStr = '학교운영위원회 / 교무기획부';
        finalTargetGrades = [1, 2, 3];
        finalTargetAudience = 'all';
      }

      await dbService.addSchoolNotice({
        type: schoolNoticeType,
        title: snTitle.trim(),
        content: snContent.trim(),
        senderName: currentTeacherObj?.name || '담당교사',
        senderRole: roleStr,
        targetGrade: finalTargetGrades.length === 1 ? finalTargetGrades[0] : 0,
        targetGrades: finalTargetGrades,
        targetClass: Number(snTargetClass),
        targetDepartment: schoolNoticeType === 'department' ? activeDept : undefined,
        targetAudience: finalTargetAudience,
        isUrgent: snIsUrgent,
        date: new Date().toISOString().slice(0, 10),
        attachments: snAttachments.length > 0 ? snAttachments : undefined,
        linkUrl: snHasLink && snLinkUrl.trim() ? snLinkUrl.trim() : undefined,
        linkLabel: snHasLink && snLinkLabel.trim() ? snLinkLabel.trim() : undefined,
        isFirstCome: snHasLink ? snIsFirstCome : false,
        deadline: snHasLink && snDeadline.trim() ? snDeadline.trim() : undefined,
      });

      showToast(`📢 [${roleStr}] 공지사항이 성공적으로 배포되었습니다!`);
      setSnTitle('');
      setSnContent('');
      setSnIsUrgent(false);
      setSnAttachments([]);
      setSnHasLink(false);
      setSnLinkUrl('');
      setSnLinkLabel('선착순 신청하기');
      setSnIsFirstCome(false);
      setSnDeadline('');
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

  const [showTestQrModal, setShowTestQrModal] = useState(false);
  const hongGilDongTestUrl = useMemo(() => {
    return getStudentDirectLoginUrl(1, 3, 1, '홍길동');
  }, []);

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

        {/* Action Controls & Sender Teacher Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-2 p-1.5 rounded-2xl border text-xs font-bold ${
              isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>발신:</span>
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
                  🧑‍🏫 {t.name} ({t.room})
                </option>
              ))}
            </select>
          </div>
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
                      {Array.from({ length: 7 }, (_, i) => i + 1).map((c) => (
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

                {/* Quick Student Selection from Registered Roster */}
                <div className="p-3 rounded-2xl border bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{callGrade}학년 {callClass}반 등록 학생 명렬 ({classRoster.length}명) - 클릭 시 자동 입력:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCallNumber('');
                        setCallStudentName(`${callGrade}학년 ${callClass}반 학생 전체`);
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      📢 학급 전체 지정
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {classRoster.length === 0 ? (
                      <span className="text-[11px] text-slate-400">
                        등록된 학생이 없습니다. 상단 '학생 명렬 관리'에서 명단을 등록해보세요.
                      </span>
                    ) : (
                      classRoster.map((std) => (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => {
                            setCallNumber(String(std.studentNumber));
                            setCallStudentName(std.name);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition flex items-center gap-1 cursor-pointer ${
                            callStudentName === std.name && Number(callNumber) === std.studentNumber
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-[10px] text-indigo-400 font-bold">{std.studentNumber}번</span>
                          <span>{std.name}</span>
                          {std.notes && (
                            <span className="text-[9px] px-1 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 rounded">
                              {std.notes}
                            </span>
                          )}
                        </button>
                      ))
                    )}
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
                      {Array.from({ length: 7 }, (_, i) => i + 1).map((c) => (
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
                <div className="flex items-center justify-between pb-3 border-b border-indigo-50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-black text-lg">학년 / 부서 / 전교생 공지 전달</h3>
                  </div>
                  <a
                    href={GEMINI_SURVEY_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950 dark:hover:bg-purple-900 dark:text-purple-200 text-xs font-bold transition shadow-xs cursor-pointer"
                    title="선생님이 제작하신 제미나이 설문지 앱 바로가기"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>제미나이 설문지 앱 열기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Gemini Survey Tool Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5 flex-wrap">
                        <span>선착순 신청 & 설문조사 제작 (Gemini 연동)</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-600 text-white font-bold">전용 도구</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5">
                        선생님께서 제미나이로 제작하신 설문지 앱에서 양식을 만든 후 아래에 링크를 첨부하여 학생들에게 발송할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <a
                      href={GEMINI_SURVEY_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
                    >
                      <span>📝 설문지 앱 열기</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 1. 공지 분류 선택 */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-500">공지 분류</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSchoolNoticeType('grade')}
                        className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          schoolNoticeType === 'grade'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span>🏫 특정 학년 전체 공지</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSchoolNoticeType('department')}
                        className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          schoolNoticeType === 'department'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span>🏢 행정/교과 부서별 공지</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSchoolNoticeType('school')}
                        className={`p-2.5 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          schoolNoticeType === 'school'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span>🌟 전교생 전체 공지</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-A. 특정 학년 공지: 1, 2, 3학년 복수 선택 (1,2학년, 2,3학년, 1,3학년, 1,2,3학년 등) */}
                  {schoolNoticeType === 'grade' && (
                    <div className="p-4 rounded-2xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>수신 대상 학년 선택 (복수 선택 가능):</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSnTargetGrades([1, 2, 3])}
                            className="text-[11px] px-2 py-0.5 rounded-md font-bold text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/50 cursor-pointer"
                          >
                            전학년(1·2·3)
                          </button>
                          <span className="text-purple-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSnTargetGrades([1, 2])}
                            className="text-[11px] px-2 py-0.5 rounded-md font-bold text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/50 cursor-pointer"
                          >
                            1·2학년
                          </button>
                          <span className="text-purple-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSnTargetGrades([2, 3])}
                            className="text-[11px] px-2 py-0.5 rounded-md font-bold text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/50 cursor-pointer"
                          >
                            2·3학년
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((grade) => {
                          const isSelected = snTargetGrades.includes(grade);
                          return (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (snTargetGrades.length > 1) {
                                    setSnTargetGrades(snTargetGrades.filter((g) => g !== grade));
                                  } else {
                                    alert('최소 1개 이상의 학년을 선택해야 합니다.');
                                  }
                                } else {
                                  setSnTargetGrades([...snTargetGrades, grade]);
                                }
                              }}
                              className={`py-3 px-3 rounded-xl border text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-400/40'
                                  : isLight
                                  ? 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                                  isSelected ? 'bg-white text-purple-600' : 'border border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span>{grade}학년</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-purple-700/80 dark:text-purple-300 font-medium">
                        📌 현재 선택된 대상: <strong>{[...snTargetGrades].sort((a, b) => a - b).map((g) => `${g}학년`).join(', ')}</strong> 전체 학생
                      </p>
                    </div>
                  )}

                  {/* 2-B. 행정/교과 부서별 공지: 발신 부서 선택 + 수신 대상(교원/학생) 구분 + 학생 대상 학년 선택 */}
                  {schoolNoticeType === 'department' && (
                    <div className="p-4 rounded-2xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 space-y-4">
                      {/* 발신 부서 선택 (드롭박스) */}
                      <div>
                        <label className="block text-xs font-black text-purple-900 dark:text-purple-200 mb-1.5 flex items-center justify-between">
                          <span>🏢 발신 부서 선택</span>
                          <span className="text-[11px] font-normal text-slate-500">부서를 드롭다운에서 선택하세요</span>
                        </label>
                        <select
                          value={snCustomDepartment ? 'custom' : snDepartment}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setSnCustomDepartment(snCustomDepartment || '방송부');
                            } else {
                              setSnDepartment(e.target.value);
                              setSnCustomDepartment('');
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none cursor-pointer ${
                            isLight
                              ? 'bg-white border-purple-200 text-slate-800 focus:border-purple-500'
                              : 'bg-slate-900 border-slate-700 text-slate-200 focus:border-purple-400'
                          }`}
                        >
                          <optgroup label="학교 행정/기획 부서">
                            <option value="교무기획부">교무기획부</option>
                            <option value="교육연구부/도서관">교육연구부 (도서관)</option>
                            <option value="학생생활안전부">학생생활안전부</option>
                            <option value="진로진학상담부">진로진학상담부</option>
                            <option value="체육보건부">체육보건부</option>
                            <option value="정보과학부">정보과학부</option>
                          </optgroup>
                          <optgroup label="교과 부서">
                            <option value="인문사회교과부">인문사회교과부 (국어·사회·도덕)</option>
                            <option value="수리과학교과부">수리과학교과부 (수학·과학·정보)</option>
                            <option value="외국어교과부">외국어교과부 (영어·제2외국어)</option>
                            <option value="예체능교과부">예체능교과부 (음악·미술·체육)</option>
                          </optgroup>
                          <optgroup label="특별실 / 상담 / 지원">
                            <option value="Wee클래스(상담실)">Wee클래스 (전문상담실)</option>
                            <option value="보건실">보건실</option>
                            <option value="급식실/영양실">급식실 / 영양실</option>
                            <option value="방송부">방송부 / 미디어센터</option>
                          </optgroup>
                          <optgroup label="직접 입력">
                            <option value="custom">✍️ 직접 입력 (기타 위원회·동아리·특별부서)</option>
                          </optgroup>
                        </select>

                        {(snCustomDepartment !== '' || snDepartment === 'custom') && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold whitespace-nowrap">
                              부서명 직접입력:
                            </span>
                            <input
                              type="text"
                              value={snCustomDepartment}
                              onChange={(e) => setSnCustomDepartment(e.target.value)}
                              placeholder="예: 영재학급운영부, 교권보호위원회 등"
                              autoFocus
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                                isLight ? 'bg-white border-purple-300' : 'bg-slate-900 border-slate-700'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* 수신 대상 구분 (교원 vs 학생) */}
                      <div className="pt-3 border-t border-purple-200/60 dark:border-purple-900/60">
                        <label className="block text-xs font-black text-purple-900 dark:text-purple-200 mb-1.5">
                          🎯 수신 대상 구분
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setSnAudience('students')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              snAudience === 'students'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-400/40'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>학생 대상</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSnAudience('teachers')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              snAudience === 'teachers'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/40'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>교원 (교직원) 대상</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSnAudience('all')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              snAudience === 'all'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/40'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>교원 및 학생 전체</span>
                          </button>
                        </div>

                        {/* 학생 대상일 때 학년 선택 (1, 2, 3학년 복수/전체 선택 가능) */}
                        {snAudience === 'students' && (
                          <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-purple-900 dark:text-purple-200">
                                학생 수신 학년 선택 (1·2·3학년 전체 또는 특정 학년 조합):
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSnDeptStudentGrades([1, 2, 3])}
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 cursor-pointer"
                                >
                                  전체(1·2·3)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSnDeptStudentGrades([1, 2])}
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 cursor-pointer"
                                >
                                  1·2학년
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSnDeptStudentGrades([2, 3])}
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 cursor-pointer"
                                >
                                  2·3학년
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((g) => {
                                const isGSelected = snDeptStudentGrades.includes(g);
                                return (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => {
                                      if (isGSelected) {
                                        if (snDeptStudentGrades.length > 1) {
                                          setSnDeptStudentGrades(snDeptStudentGrades.filter((x) => x !== g));
                                        } else {
                                          alert('최소 1개 이상의 학년을 선택해주세요.');
                                        }
                                      } else {
                                        setSnDeptStudentGrades([...snDeptStudentGrades, g]);
                                      }
                                    }}
                                    className={`py-2 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      isGSelected
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                        : isLight
                                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    <Check className={`w-3.5 h-3.5 ${isGSelected ? 'opacity-100' : 'opacity-0'}`} />
                                    <span>{g}학년 학생</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
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

                {/* 3. 첨부파일 등록 (Attachments) */}
                <div className="p-4 rounded-2xl border bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>첨부파일 등록 (가정통신문, 신청양식, PDF, HWP, 엑셀 등)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => noticeAttachmentInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>파일 추가하기</span>
                    </button>
                    <input
                      type="file"
                      ref={noticeAttachmentInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                      accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                    />
                  </div>

                  {snAttachments.length > 0 ? (
                    <div className="space-y-2">
                      {snAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                            {file.size && <span className="text-[10px] text-slate-400 shrink-0">({file.size})</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                            title="첨부파일 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => noticeAttachmentInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-center cursor-pointer hover:border-indigo-400 transition"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        📎 클릭하여 파일을 선택하거나 첨부할 파일(.pdf, .hwp, .xlsx, 이미지 등)을 등록하세요.
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. 선착순 신청 / 별도 온라인 설문 링크 설정 */}
                <div className="p-4 rounded-2xl border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk-sn-haslink"
                        checked={snHasLink}
                        onChange={(e) => setSnHasLink(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                      <label htmlFor="chk-sn-haslink" className="text-xs font-black text-purple-950 dark:text-purple-200 cursor-pointer flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>선착순 신청 또는 온라인 설문지 링크 첨부</span>
                      </label>
                    </div>

                    {/* Gemini Survey Preset Button */}
                    <button
                      type="button"
                      onClick={handleApplyGeminiSurveyPreset}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition"
                      title="제미나이 설문지 앱 주소와 선착순 설정을 1초 만에 자동 입력합니다"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>✨ 제미나이 설문지 앱 주소 자동 입력</span>
                    </button>
                  </div>

                  {snHasLink && (
                    <div className="space-y-3 pt-3 border-t border-purple-200/70 dark:border-purple-900/50">
                      <div>
                        <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                          신청 / 설문 링크 URL (https://...) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={snLinkUrl}
                            onChange={(e) => setSnLinkUrl(e.target.value)}
                            placeholder="https://..."
                            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                              isLight ? 'bg-white border-purple-300 focus:border-purple-600' : 'bg-slate-900 border-slate-700 text-white'
                            }`}
                          />
                          <Link2 className="w-4 h-4 absolute left-2.5 top-2.5 text-purple-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            버튼 라벨 (학생 화면 표시 문구)
                          </label>
                          <input
                            type="text"
                            value={snLinkLabel}
                            onChange={(e) => setSnLinkLabel(e.target.value)}
                            placeholder="예: 선착순 신청하기, 설문지 작성하기"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                              isLight ? 'bg-white border-purple-200' : 'bg-slate-900 border-slate-700 text-white'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            마감/선착순 안내 텍스트
                          </label>
                          <input
                            type="text"
                            value={snDeadline}
                            onChange={(e) => setSnDeadline(e.target.value)}
                            placeholder="예: 선착순 30명 마감, 8월 20일 17:00까지"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                              isLight ? 'bg-white border-purple-200' : 'bg-slate-900 border-slate-700 text-white'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="chk-sn-firstcome"
                          checked={snIsFirstCome}
                          onChange={(e) => setSnIsFirstCome(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 cursor-pointer"
                        />
                        <label htmlFor="chk-sn-firstcome" className="text-xs font-black text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>선착순 신청 강조 (학생 화면에 🔥 선착순 신청 뱃지 및 강조 버튼 노출)</span>
                        </label>
                      </div>
                    </div>
                  )}
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
                  <span>
                    {isSubmitting
                      ? '공지 배포 중...'
                      : schoolNoticeType === 'grade'
                      ? `[${[...snTargetGrades].sort((a, b) => a - b).join('·')}학년 전체] 공지사항 배포하기`
                      : schoolNoticeType === 'department'
                      ? `[${snCustomDepartment || snDepartment} / ${snAudience === 'teachers' ? '교원 대상' : `${[...snDeptStudentGrades].sort((a, b) => a - b).join('·')}학년 학생 대상`}] 공지 배포하기`
                      : '전교생 전체에게 공지사항 배포하기'}
                  </span>
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
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-1.5 font-black flex-wrap">
                          {notice.isUrgent && <span className="text-rose-500 font-black">🚨 [긴급]</span>}
                          {notice.isFirstCome && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500 text-white font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> 선착순
                            </span>
                          )}
                          <span>{notice.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                            {notice.type === 'grade'
                              ? `${notice.targetGrades && notice.targetGrades.length > 0 ? notice.targetGrades.join('·') : notice.targetGrade}학년 전체`
                              : notice.type === 'department'
                              ? `${notice.targetDepartment || '부서'} (${notice.targetAudience === 'teachers' ? '교원' : notice.targetGrades && notice.targetGrades.length > 0 ? `${notice.targetGrades.join('·')}학년 학생` : '학생'})`
                              : notice.type === 'homeroom_morning' || notice.type === 'homeroom_closing'
                              ? `${notice.targetGrade}-${notice.targetClass}반`
                              : '전교생'}
                          </span>
                          <span>👤 {notice.senderRole}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-bold">
                            👁️ {notice.confirmedStudentIds?.length || 0}명 확인 완료
                          </span>
                        </div>

                        {/* Attachments & Link chips in Teacher Feed */}
                        {((notice.attachments && notice.attachments.length > 0) || notice.linkUrl) && (
                          <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                            {notice.attachments && notice.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                <Paperclip className="w-2.5 h-2.5" /> 첨부 {notice.attachments.length}개
                              </span>
                            )}
                            {notice.linkUrl && (
                              <a
                                href={notice.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold hover:underline"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                <span>{notice.linkLabel || '신청/설문 링크'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
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

      {/* Virtual Student Interactive Simulator Modal */}
      <VirtualStudentSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        theme={theme}
        currentTeacher={currentTeacherObj}
      />
    </div>
  );
};
