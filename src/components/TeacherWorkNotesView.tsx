import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Users,
  Vote,
  FileSpreadsheet,
  Download,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  Filter,
  MessageSquare
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Teacher, TeacherWorkNote, WorkNoteType, WorkNoteResponse, ThemeType } from '../types';

interface TeacherWorkNotesViewProps {
  theme: ThemeType;
  teachers: Teacher[];
}

export const TeacherWorkNotesView: React.FC<TeacherWorkNotesViewProps> = ({ theme, teachers }) => {
  const isLight = theme === 'vibrant-palette';

  const [notes, setNotes] = useState<TeacherWorkNote[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Current logged in teacher persona for replying
  const [currentTeacherName, setCurrentTeacherName] = useState<string>(
    teachers[0]?.name || '김민준'
  );
  const currentTeacherObj = useMemo(() => {
    return teachers.find((t) => t.name === currentTeacherName) || teachers[0];
  }, [teachers, currentTeacherName]);

  // Form states for creating a new work note
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<WorkNoteType>('data_aggregate');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['1학년 담임']);
  const [deadline, setDeadline] = useState('오늘 16:30까지');
  const [aggregateLabel, setAggregateLabel] = useState('필요 물품 및 수량 (또는 인원)');
  const [customVoteOption1, setCustomVoteOption1] = useState('찬성 (원안 동의)');
  const [customVoteOption2, setCustomVoteOption2] = useState('반대 (재검토 요청)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Quick reply input states for active note
  const [replyText, setReplyText] = useState('');
  const [replyVote, setReplyVote] = useState('');

  // Available committee / department tags extracted from teachers + common groups
  const availableGroups = useMemo(() => {
    const set = new Set<string>([
      '전교직원',
      '1학년 담임',
      '2학년 담임',
      '3학년 담임',
      '부장교사',
      '기획위원회',
      '교육과정위원회',
      '인사자문위원회',
      '교권보호위원회',
      '학폭전담기구',
      '선도위원회',
      '수학과',
      '국어과',
      '영어과',
      '과학과',
      '사회과',
    ]);
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
      if (t.subject) set.add(t.subject.endsWith('과') ? t.subject : `${t.subject}과`);
      t.committees?.forEach((c) => set.add(c));
      t.tags?.forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [teachers]);

  useEffect(() => {
    const unsubscribe = dbService.subscribeWorkNotes((list) => {
      setNotes(list);
      if (list.length > 0 && !selectedNoteId) {
        setSelectedNoteId(list[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedNoteId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || notes[0];
  }, [notes, selectedNoteId]);

  const toggleGroup = (group: string) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== group));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  // Handle Create Work Note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('쪽지 제목과 내용을 입력해주세요.');
      return;
    }
    if (selectedGroups.length === 0) {
      alert('수신할 그룹 또는 위원회를 최소 1개 이상 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = await dbService.addWorkNote({
        senderId: currentTeacherObj?.id || 't-1',
        senderName: currentTeacherObj?.name || '김민준',
        senderRole: currentTeacherObj?.tags?.[0] || currentTeacherObj?.room || '교사',
        title: title.trim(),
        content: content.trim(),
        noteType,
        targetGroups: selectedGroups,
        deadline: deadline.trim() || undefined,
        aggregateFieldLabel: noteType === 'data_aggregate' ? aggregateLabel.trim() : undefined,
        voteOptions:
          noteType === 'vote'
            ? [customVoteOption1.trim(), customVoteOption2.trim()]
            : undefined,
      });

      showToast('💌 업무 쪽지 및 수합 요청이 성공적으로 발송되었습니다!');
      setTitle('');
      setContent('');
      setActiveTab('list');
      setSelectedNoteId(newId);
    } catch (err) {
      console.error(err);
      alert('쪽지 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Teacher Submit Response
  const handleSubmitResponse = async (valueStr?: string, isDoneFlag = true) => {
    if (!selectedNote) return;

    const key = currentTeacherName;
    await dbService.respondWorkNote(selectedNote.id, key, {
      teacherId: currentTeacherObj?.id,
      teacherName: currentTeacherName,
      role: currentTeacherObj?.tags?.[0] || currentTeacherObj?.room,
      isDone: isDoneFlag,
      value: valueStr !== undefined ? valueStr : replyText,
      updatedAt: Date.now(),
    });

    showToast(`[${currentTeacherName}] 선생님의 제출/응답이 기록되었습니다.`);
    setReplyText('');
  };

  // Handle Delete Note
  const handleDeleteNote = async (id: string) => {
    if (window.confirm('이 업무 쪽지를 삭제하시겠습니까?')) {
      await dbService.deleteWorkNote(id);
      showToast('쪽지가 삭제되었습니다.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedNote) return;

    let csv = `수신교사,역할,완료여부,응답/수합내용,제출시각\n`;
    const responsesList = Object.values(selectedNote.responses || {}) as WorkNoteResponse[];
    responsesList.forEach((r) => {
      const timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-';
      csv += `"${r.teacherName}","${r.role || ''}","${r.isDone ? '완료' : '미완료'}","${r.value || ''}","${timeStr}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `수합결과_${selectedNote.title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('엑셀(CSV) 다운로드가 완료되었습니다.');
  };

  // Calculation for progress
  const responseCount = Object.keys(selectedNote?.responses || {}).length;
  const doneCount = (Object.values(selectedNote?.responses || {}) as WorkNoteResponse[]).filter((r) => r.isDone).length;
  const progressPercent = Math.min(100, Math.round((doneCount / Math.max(responseCount || 1, 6)) * 100));

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>💌 교직원 업무 쪽지 & 실시간 수합 보드</span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            학년·교과·위원회별 업무 전달, 구입 물품 수합, 찬반 투표, 학급 처리 완료 여부를 한눈에 집계합니다.
          </p>
        </div>

        {/* Current User Switcher & Tab buttons */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <span className="text-slate-400">내 계정:</span>
            <select
              value={currentTeacherName}
              onChange={(e) => setCurrentTeacherName(e.target.value)}
              className="bg-transparent font-black outline-none cursor-pointer text-indigo-600 dark:text-emerald-400"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.room})
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              쪽지함 & 수합 보드
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 쪽지·수합 작성</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Work Notes List & Real-time Aggregation Board */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Note List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                도착한 업무 쪽지 목록 ({notes.length})
              </span>
            </div>

            {notes.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center text-xs text-slate-400 ${
                  isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
                }`}
              >
                진행 중인 업무 쪽지가 없습니다. 우측 상단 [새 쪽지·수합 작성]을 눌러보세요.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer ${
                    selectedNoteId === note.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/30'
                      : isLight
                      ? 'bg-white border-indigo-100 hover:border-indigo-300 text-slate-900'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                          selectedNoteId === note.id
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400'
                        }`}
                      >
                        {note.noteType === 'data_aggregate' && '📊 물품/인원 수합'}
                        {note.noteType === 'vote' && '🗳️ 찬반/안건 투표'}
                        {note.noteType === 'class_check' && '✅ 학급 완료 체크'}
                        {note.noteType === 'notice' && '📢 일반 업무 공지'}
                      </span>
                    </div>

                    {note.deadline && (
                      <span
                        className={`text-[10px] font-bold ${
                          selectedNoteId === note.id ? 'text-indigo-100' : 'text-amber-600'
                        }`}
                      >
                        ⏳ {note.deadline}
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-sm line-clamp-1">{note.title}</h4>
                  <p
                    className={`mt-1 line-clamp-2 leading-relaxed ${
                      selectedNoteId === note.id ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    {note.content}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span>
                      발신: {note.senderName} ({note.senderRole})
                    </span>
                    <span className="font-black">
                      수신: {note.targetGroups.slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Selected Note Detail & Aggregation Board (7 cols) */}
          <div className="lg:col-span-7">
            {selectedNote ? (
              <div
                className={`p-6 rounded-3xl border space-y-6 transition-all ${
                  isLight
                    ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-white shadow-xl'
                }`}
              >
                {/* Note Header */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {selectedNote.targetGroups.map((g, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400 border border-indigo-100 dark:border-slate-700"
                          >
                            🎯 {g}
                          </span>
                        ))}
                        {selectedNote.deadline && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200">
                            마감: {selectedNote.deadline}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black">{selectedNote.title}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="쪽지 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className={`mt-4 p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                      isLight ? 'bg-indigo-50/30 border border-indigo-100' : 'bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{selectedNote.content}</p>
                  </div>
                </div>

                {/* Interactive Action Box for viewing teacher (김민준 선생님) */}
                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? 'bg-indigo-50/60 border-indigo-200' : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black mb-2 flex items-center justify-between text-indigo-700 dark:text-emerald-400">
                    <span>✍️ [{currentTeacherName}] 선생님의 처리 및 응답</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      입력 즉시 아래 수합 표에 자동 반영됩니다
                    </span>
                  </div>

                  {/* If Data Aggregate Type */}
                  {selectedNote.noteType === 'data_aggregate' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`예: ${selectedNote.aggregateFieldLabel || '수합할 내용 입력...'}`}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                        }`}
                      />
                      <button
                        onClick={() => handleSubmitResponse(replyText)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition cursor-pointer"
                      >
                        수합 제출
                      </button>
                    </div>
                  )}

                  {/* If Vote Type */}
                  {selectedNote.noteType === 'vote' && (
                    <div className="flex gap-2">
                      {(selectedNote.voteOptions || ['찬성', '반대']).map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSubmitResponse(opt)}
                          className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-black bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white transition shadow-sm cursor-pointer"
                        >
                          🗳️ {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* If Class Check Type */}
                  {selectedNote.noteType === 'class_check' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitResponse('전달 및 조치 완료')}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>우리 반 학생 전달 및 처리 완료 체크</span>
                      </button>
                    </div>
                  )}

                  {/* If General Notice */}
                  {selectedNote.noteType === 'notice' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitResponse('확인 완료')}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>쪽지 내용 확인 완료</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Real-time Response & Aggregation Table */}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-indigo-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-black text-sm">실시간 수합 및 응답 집계 현황</h4>
                    </div>

                    <button
                      onClick={handleExportCSV}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>엑셀(CSV) 다운로드</span>
                    </button>
                  </div>

                  {/* Response Table */}
                  <div className="rounded-2xl border overflow-hidden border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-slate-500">
                          <th className="p-3 font-bold w-24">선생님</th>
                          <th className="p-3 font-bold w-24">소속/역할</th>
                          <th className="p-3 font-bold w-24 text-center">완료 상태</th>
                          <th className="p-3 font-bold">수합 및 응답 내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Object.entries(selectedNote.responses || {}).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">
                              아직 제출된 응답이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          (Object.entries(selectedNote.responses || {}) as [string, WorkNoteResponse][]).map(([key, res]) => (
                            <tr key={key}>
                              <td className="p-3 font-black">{res.teacherName || key}</td>
                              <td className="p-3 text-slate-500">{res.role || '-'}</td>
                              <td className="p-3 text-center">
                                {res.isDone ? (
                                  <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                                    제출 완료
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 text-[10px]">
                                    미제출
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                {res.value || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-sm text-slate-400">
                선택된 쪽지가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Create New Work Note */}
      {activeTab === 'create' && (
        <div
          className={`max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl border transition-all ${
            isLight
              ? 'bg-white border-indigo-100 text-slate-900 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-white shadow-xl'
          }`}
        >
          <form onSubmit={handleCreateNote} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-indigo-50 dark:border-slate-800">
              <Plus className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
              <h3 className="font-black text-xl">새 업무 쪽지 및 수합 요청 작성</h3>
            </div>

            {/* Note Type Selector */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">쪽지 목적 및 양식 선택</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'data_aggregate', label: '📊 구입물품/인원 수합', desc: '표 형태 텍스트 입력' },
                  { type: 'vote', label: '🗳️ 찬반/안건 투표', desc: '원클릭 투표 버튼' },
                  { type: 'class_check', label: '✅ 학급 완료 체크', desc: '전달 완료 확인' },
                  { type: 'notice', label: '📢 일반 업무 전달', desc: '단순 확인용' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setNoteType(item.type as WorkNoteType)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      noteType === item.type
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-black text-xs">{item.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Groups / Committees Selection (Multi-tags) */}
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500">
                수신 그룹 / 위원회 선택 (복수 선택 가능) <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableGroups.map((group) => {
                  const isSelected = selectedGroups.includes(group);
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : isLight
                          ? 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {isSelected && '✓ '} {group}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1 text-slate-500">
                  쪽지 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2학기 교구 및 학습준비물 구입 희망 수합"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">제출 마감 일시</label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="예: 오늘 16:30까지"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-500">
                상세 안내 내용 <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="선생님들께서 확인하고 수합할 상세 지침을 적어주세요."
                className={`w-full p-3.5 rounded-2xl border text-sm font-medium leading-relaxed outline-none ${
                  isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                }`}
              />
            </div>

            {/* Type Specific Fields */}
            {noteType === 'data_aggregate' && (
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">수합 항목 라벨</label>
                <input
                  type="text"
                  value={aggregateLabel}
                  onChange={(e) => setAggregateLabel(e.target.value)}
                  placeholder="예: 물품명 및 수량 (또는 희망 장소)"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>
            )}

            {noteType === 'vote' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">투표 선택지 1</label>
                  <input
                    type="text"
                    value={customVoteOption1}
                    onChange={(e) => setCustomVoteOption1(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">투표 선택지 2</label>
                  <input
                    type="text"
                    value={customVoteOption2}
                    onChange={(e) => setCustomVoteOption2(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium outline-none ${
                      isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-5 py-3 rounded-2xl text-xs font-bold border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? '발송 중...' : '선택 그룹에 업무 쪽지 및 수합 발송하기'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
