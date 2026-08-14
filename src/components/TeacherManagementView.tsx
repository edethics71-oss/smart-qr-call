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
  AlertCircle
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, ThemeType } from '../types';

interface TeacherManagementViewProps {
  theme: ThemeType;
  teachers: Teacher[];
  onOpenPlacard: (room: string) => void;
  onNavigateToStudentView: (room: string) => void;
}

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  theme,
  teachers,
  onOpenPlacard,
  onNavigateToStudentView,
}) => {
  const isLight = theme === 'vibrant-palette';

  // Add teacher form states
  const [name, setName] = useState('');
  const [room, setRoom] = useState('본관 1교무실');
  const [customRoom, setCustomRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Avatar color generator based on index or name
  const getAvatarColor = (nameStr: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-teal-100 text-teal-700 border-teal-200',
    ];
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle Add Teacher
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
      });

      setName('');
      setSubject('');
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

  // Handle Delete Teacher
  const handleDeleteTeacher = async (id: string, teacherName: string) => {
    if (window.confirm(`정말로 [${teacherName}] 선생님을 명단에서 삭제하시겠습니까?`)) {
      await dbService.deleteTeacher(id);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          교직원 명단 관리 & 교무실 QR 생성
        </h2>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          교무실별 선생님 명단을 등록하고, 교무실 앞 문에 부착할 학생 방문 호출용 QR 코드를
          생성합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Teacher Registration & Roster (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Add Teacher Card */}
          <div
            id="add-teacher-card"
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
              <h3 className="font-black text-lg">새 선생님 등록</h3>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    선생님 성함 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-teacher-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김민준"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none font-medium transition ${
                      isLight
                        ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                        : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Subject / Role */}
                <div>
                  <label
                    className={`block text-xs font-bold mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    담당 과목 또는 직책 (선택)
                  </label>
                  <input
                    id="input-teacher-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예: 3학년 수학 / 진로부장"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none font-medium transition ${
                      isLight
                        ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white'
                        : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Room Selection */}
              <div>
                <label
                  className={`block text-xs font-bold mb-1 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  소속 교무실 / 연구실 <span className="text-rose-500">*</span>
                </label>
                {!isCustomRoom ? (
                  <div className="flex gap-2">
                    <select
                      id="select-room-input"
                      value={room}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setIsCustomRoom(true);
                        } else {
                          setRoom(e.target.value);
                        }
                      }}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm border font-bold outline-none transition cursor-pointer ${
                        isLight
                          ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 focus:border-indigo-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                      }`}
                    >
                      {distinctRooms.map((r) => (
                        <option key={r} value={r}>
                          📍 {r}
                        </option>
                      ))}
                      <option value="CUSTOM">➕ 새로운 교무실 직접 입력...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="input-custom-room"
                      type="text"
                      required
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      placeholder="예: 본관 3층 영어교과연구실"
                      className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm border outline-none font-medium transition ${
                        isLight
                          ? 'bg-indigo-50/40 border-indigo-200 text-slate-900 focus:border-indigo-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomRoom(false)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      기존 목록 선택
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-teacher"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? '등록 중...' : '교직원 명단에 추가하기'}</span>
              </button>
            </form>
          </div>

          {/* Teacher Roster List */}
          <div
            id="teacher-roster-list"
            className={`rounded-2xl border overflow-hidden transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                isLight
                  ? 'border-indigo-100 bg-indigo-50/40'
                  : 'border-slate-800 bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
                <h3 className="font-black text-base">등록된 교직원 명단</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isLight
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  총 {teachers.length}명
                </span>
              </div>
            </div>

            {teachers.length === 0 ? (
              <div
                className={`p-8 text-center text-sm ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                등록된 선생님이 없습니다. 위 양식에서 선생님을 등록해주세요.
              </div>
            ) : (
              <div
                className={`divide-y max-h-96 overflow-y-auto ${
                  isLight ? 'divide-indigo-100' : 'divide-slate-800'
                }`}
              >
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className={`p-4 flex items-center justify-between transition ${
                      isLight ? 'hover:bg-indigo-50/40' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm ${getAvatarColor(
                          teacher.name
                        )}`}
                      >
                        {teacher.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-black text-sm flex items-center gap-2">
                          <span className={isLight ? 'text-slate-900' : 'text-white'}>
                            {teacher.name} 선생님
                          </span>
                          {teacher.subject && (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                isLight
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {teacher.subject}
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-xs flex items-center gap-1 mt-0.5 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          <Building2 className="w-3 h-3 text-indigo-500" />
                          <span>{teacher.room}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        title="QR 코드 보기"
                        onClick={() => setQrRoom(teacher.room)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isLight
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        QR 보기
                      </button>
                      <button
                        title="삭제"
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR Code & Printable Door Placard (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div
            id="qr-generator-card"
            className={`p-6 rounded-2xl border text-center transition-all ${
              isLight
                ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <QrCode className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
              <h3 className="font-black text-lg">교무실 출입문 부착용 QR</h3>
            </div>

            {/* Target Room Selector for QR */}
            <div className="mb-5">
              <label
                className={`block text-xs font-bold mb-1 text-left ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                QR 생성 대상 교무실 선택:
              </label>
              <select
                id="select-qr-target-room"
                value={qrRoom}
                onChange={(e) => setQrRoom(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border outline-none cursor-pointer transition ${
                  isLight
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-800'
                    : 'bg-slate-950 border-slate-700 text-emerald-300'
                }`}
              >
                {distinctRooms.map((r) => (
                  <option key={r} value={r}>
                    📍 {r}
                  </option>
                ))}
              </select>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-5 rounded-2xl inline-block shadow-md mx-auto border-2 border-indigo-100">
              <QRCodeSVG
                value={studentUrl}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-4">
              <p className="font-black text-base text-indigo-600 dark:text-emerald-400">
                [{qrRoom}]
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                학생이 스마트폰 카메라로 QR을 스캔하면 이 교무실의 선생님 목록이 열립니다.
              </p>
            </div>

            {/* Action Buttons: Print Placard & Copy link & Test View */}
            <div className="grid grid-cols-1 gap-2.5 mt-6">
              {/* Print Door Placard Modal Trigger */}
              <button
                id="btn-print-door-placard"
                onClick={() => onOpenPlacard(qrRoom)}
                className="w-full py-3 px-4 rounded-xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>출력용 A4 교무실 부착판 인쇄하기</span>
              </button>

              {/* Copy URL */}
              <button
                id="btn-copy-student-url"
                onClick={handleCopyLink}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isLight
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedLink ? '학생 접속 주소 복사 완료!' : '학생 접속 링크 복사'}</span>
              </button>

              {/* Direct Open Student Screen */}
              <button
                id="btn-test-student-view"
                onClick={() => onNavigateToStudentView(qrRoom)}
                className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'text-indigo-600 hover:bg-indigo-50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>학생 화면 바로 체험해보기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
