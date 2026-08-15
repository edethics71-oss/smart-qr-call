import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  UserPlus,
  Trash2,
  QrCode,
  Building2,
  BookOpen,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Download,
  Users,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Tag
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, ThemeType } from '../types';

interface TeacherManagementViewProps {
  theme: ThemeType;
  teachers: Teacher[];
  onOpenPlacard: (room: string) => void;
  onNavigateToStudentView: (room: string) => void;
}

const COMMON_TAG_SUGGESTIONS = [
  '1학년 담임',
  '2학년 담임',
  '3학년 담임',
  '부장교사',
  '기획위원회',
  '교육과정위원회',
  '학폭전담기구',
  '인사자문위원회',
  '수학과',
  '국어과',
  '영어과',
  '과학과',
  '사회과',
  '예체능과',
  '진로진학부',
  '학생안전부',
];

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  theme,
  teachers,
  onOpenPlacard,
  onNavigateToStudentView,
}) => {
  const isLight = theme === 'vibrant-palette';

  // Registration Mode: 'single' (1명씩 직접 등록) or 'bulk' (일괄 등록)
  const [registerMode, setRegisterMode] = useState<'single' | 'bulk'>('single');

  // Single Add Teacher form states
  const [name, setName] = useState('');
  const [room, setRoom] = useState('본관 1교무실');
  const [customRoom, setCustomRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [subject, setSubject] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['1학년 담임']);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Add Textarea state
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultRoom, setBulkDefaultRoom] = useState('본관 1교무실');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Selected room for QR preview
  const [qrRoom, setQrRoom] = useState<string>('본관 1교무실');
  const [copiedLink, setCopiedLink] = useState(false);

  // Distinct rooms
  const distinctRooms = useMemo(() => {
    const set = new Set<string>(['본관 1교무실', '2학년 연구실', '진로진학상담실']);
    teachers.forEach((t) => {
      if (t.room) set.add(t.room);
    });
    return Array.from(set);
  }, [teachers]);

  // Set default qrRoom if none selected
  React.useEffect(() => {
    if (distinctRooms.length > 0 && !distinctRooms.includes(qrRoom)) {
      setQrRoom(distinctRooms[0]);
    }
  }, [distinctRooms, qrRoom]);

  // Student URL calculation
  const studentUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://school.app';
    return `${origin}/student?room=${encodeURIComponent(qrRoom)}`;
  }, [qrRoom]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (newTagInput.trim() && !selectedTags.includes(newTagInput.trim())) {
      setSelectedTags([...selectedTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  // Parse Bulk Text in Realtime
  const parsedBulkTeachers = useMemo(() => {
    if (!bulkText.trim()) return [];

    const lines = bulkText.split('\n');
    const result: Omit<Teacher, 'id'>[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes('/')) {
        parts = line.split('/');
      } else {
        parts = line.split(/\s+/);
      }

      parts = parts.map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;

      const teacherName = parts[0];
      const teacherRoom = parts[1] || bulkDefaultRoom;
      const teacherSubject = parts[2] || undefined;
      const teacherTags = parts[3] ? parts[3].split('|').map((t) => t.trim()) : undefined;

      if (teacherName) {
        result.push({
          name: teacherName,
          room: teacherRoom,
          subject: teacherSubject,
          tags: teacherTags,
        });
      }
    }

    return result;
  }, [bulkText, bulkDefaultRoom]);

  // Handle Single Add Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoom = (isCustomRoom ? customRoom : room).trim();
    const finalName = name.trim();

    if (!finalName) {
      alert('선생님 이름을 입력해주세요.');
      return;
    }
    if (!finalRoom) {
      alert('교무실 명칭을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.addTeacher({
        name: finalName,
        room: finalRoom,
        subject: subject.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      setName('');
      setSubject('');
      setSelectedTags(['1학년 담임']);
      if (isCustomRoom) {
        setRoom(finalRoom);
        setIsCustomRoom(false);
        setCustomRoom('');
      }
      setQrRoom(finalRoom);
    } catch (err) {
      console.error('Failed to add teacher:', err);
      alert('선생님 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Add Teachers
  const handleBulkSubmit = async () => {
    if (parsedBulkTeachers.length === 0) {
      alert('등록할 선생님 데이터가 없습니다. 텍스트를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const addedCount = await dbService.addTeachersBatch(parsedBulkTeachers);
      setBulkSuccessMsg(`🎉 총 ${addedCount}명의 선생님이 성공적으로 일괄 등록되었습니다!`);
      setBulkText('');
      setTimeout(() => setBulkSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to batch add teachers:', err);
      alert('일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillSample = () => {
    setBulkText(
`김민준\t본관 1교무실\t1학년 수학\t1학년 담임|수학과|교육과정위원회
이서연\t본관 1교무실\t국어 / 교무기획\t기획위원회|국어과
박지훈\t본관 1교무실\t영어\t1학년 담임|영어과
최유나\t본관 2교무실\t2학년 부장 / 과학\t부장교사|2학년 담임|과학과
정현우\t본관 2교무실\t사회 / 학생부\t학폭전담기구|사회과
강도윤\t3학년 연구실\t3학년 부장 / 수학\t부장교사|3학년 담임|수학과
윤지아\t3학년 연구실\t진로진학 / 역사\t3학년 담임|사회과
임서진\t진로진학상담실\t전문상담교사\t학폭전담기구|인사자문위원회`
    );
  };

  const handleDeleteTeacher = async (id: string, teacherName: string) => {
    if (window.confirm(`정말로 [${teacherName}] 선생님을 명단에서 삭제하시겠습니까?`)) {
      await dbService.deleteTeacher(id);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          👥 교직원 명단 & 소속 위원회·교과 관리
        </h2>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          학교 전체 선생님과 소속 교무실, 담당 학년/교과, 위원회(기획·교육과정·학폭전담 등) 태그를 등록하여 업무 쪽지 및 그룹 수합에 연동합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Teacher Registration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-white shadow-xl'
            }`}
          >
            {/* Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
                <h3 className="font-black text-lg">선생님 및 위원회 태그 등록</h3>
              </div>

              <div
                className={`flex p-1 rounded-xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <button
                  onClick={() => setRegisterMode('single')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    registerMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1명씩 직접 등록
                </button>
                <button
                  onClick={() => setRegisterMode('bulk')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    registerMode === 'bulk'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  명단 일괄 등록
                </button>
              </div>
            </div>

            {/* Single Add Form */}
            {registerMode === 'single' ? (
              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">
                      선생님 성함 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 김민준"
                      className={`w-full px-3.5 py-2 rounded-xl border text-sm font-black outline-none ${
                        isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">
                      담당 과목 / 보직
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="예: 1학년 수학, 교무기획부"
                      className={`w-full px-3.5 py-2 rounded-xl border text-sm font-medium outline-none ${
                        isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">
                    상주 교무실 / 연구실 <span className="text-rose-500">*</span>
                  </label>
                  {!isCustomRoom ? (
                    <div className="flex gap-2">
                      <select
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-sm font-black outline-none ${
                          isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        {distinctRooms.map((r) => (
                          <option key={r} value={r}>
                            📍 {r}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCustomRoom(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        + 새 교무실 추가
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customRoom}
                        onChange={(e) => setCustomRoom(e.target.value)}
                        placeholder="새 교무실 명칭 입력 (예: 제2외국어과실)"
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-sm font-black outline-none ${
                          isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomRoom(false)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border hover:bg-slate-100 transition cursor-pointer"
                      >
                        기존 목록 선택
                      </button>
                    </div>
                  )}
                </div>

                {/* Multi-tags for Committees & Roles */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-500 flex items-center justify-between">
                    <span>소속 위원회 & 교과 그룹 태그 (쪽지/수합 자동 분류)</span>
                    <span className="text-[11px] text-indigo-600 font-normal">복수 선택 가능</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_TAG_SUGGESTIONS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : isLight
                              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                              : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {tag}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="기타 위원회 직접 입력..."
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none ${
                        isLight ? 'bg-indigo-50/20 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold border transition cursor-pointer"
                    >
                      태그 추가
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? '등록 중...' : '선생님 및 위원회 등록 완료'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500">
                    엑셀/한글 복사 붙여넣기 (이름 [탭] 교무실 [탭] 과목 [탭] 위원회태그)
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    샘플 양식 불러오기
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="예: 김민준	본관 1교무실	1학년 수학	1학년 담임|수학과|기획위원회"
                  className={`w-full p-3.5 rounded-2xl border text-xs font-mono leading-relaxed outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />

                {bulkSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{bulkSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-400">
                    인식된 교직원: {parsedBulkTeachers.length}명
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={isSubmitting || parsedBulkTeachers.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? '일괄 등록 중...' : '일괄 등록 실행하기'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Roster List Table */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h4 className="font-black text-sm">등록된 전체 선생님 명단 ({teachers.length}명)</h4>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
              {teachers.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm">👤 {t.name} 선생님</span>
                      <span className="text-xs text-slate-500">({t.room})</span>
                      {t.subject && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {t.subject}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400 border border-indigo-100 dark:border-slate-700"
                          >
                            🏷️ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteTeacher(t.id, t.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="선생님 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: QR Placard Generator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
              <h3 className="font-black text-lg">교무실별 출입문 QR 생성</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">인쇄할 교무실 선택</label>
                <select
                  value={qrRoom}
                  onChange={(e) => setQrRoom(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-black outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                >
                  {distinctRooms.map((r) => (
                    <option key={r} value={r}>
                      📍 {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Code Center Display */}
              <div className="p-6 rounded-3xl bg-white text-slate-900 border border-slate-200 text-center shadow-inner space-y-3">
                <div className="text-xs font-black text-indigo-700 tracking-wider">
                  [{qrRoom}] 출입문 부착용 QR
                </div>
                <div className="flex justify-center p-3 bg-white rounded-2xl">
                  <QRCodeSVG value={studentUrl} size={180} level="H" includeMargin />
                </div>
                <div className="text-[11px] text-slate-400 font-mono break-all">{studentUrl}</div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => onOpenPlacard(qrRoom)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>A4 문앞 부착 안내판 인쇄하기</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? '복사됨!' : '링크 복사'}</span>
                  </button>

                  <button
                    onClick={() => onNavigateToStudentView(qrRoom)}
                    className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>학생 화면 열기</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
