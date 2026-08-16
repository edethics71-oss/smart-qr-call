import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  School,
  Save,
  X,
  Smartphone,
  QrCode
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { StudentRecord, ThemeType } from '../types';
import { VirtualStudentSimulatorModal } from './VirtualStudentSimulatorModal';
import { ClassQRPlacardModal } from './ClassQRPlacardModal';

interface StudentRosterManagementViewProps {
  theme: ThemeType;
}

export const StudentRosterManagementView: React.FC<StudentRosterManagementViewProps> = ({
  theme,
}) => {
  const isLight = theme === 'vibrant-palette';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mode: 'list' | 'single-add' | 'bulk-import' | 'edit'
  const [activeMode, setActiveMode] = useState<'list' | 'single-add' | 'bulk-import' | 'edit'>('list');

  // Single Add / Edit Form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formGrade, setFormGrade] = useState<number>(1);
  const [formClass, setFormClass] = useState<number>(3);
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<string>('M');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Bulk Import state
  const [bulkGrade, setBulkGrade] = useState<number>(1);
  const [bulkClass, setBulkClass] = useState<number>(3);
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkOverwrite, setBulkOverwrite] = useState<boolean>(false);
  const [bulkParsedPreview, setBulkParsedPreview] = useState<Omit<StudentRecord, 'id' | 'createdAt'>[]>([]);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>('');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Class QR Placard Modal state
  const [isClassPlacardOpen, setIsClassPlacardOpen] = useState<boolean>(false);
  const [placardGrade, setPlacardGrade] = useState<number>(1);
  const [placardClass, setPlacardClass] = useState<number>(3);

  // Subscribe to students
  useEffect(() => {
    const unsubscribe = dbService.subscribeStudents((list) => {
      setStudents(list);
    });
    return () => unsubscribe();
  }, []);

  // Parse bulk text whenever it changes
  useEffect(() => {
    if (!bulkText.trim()) {
      setBulkParsedPreview([]);
      return;
    }

    const lines = bulkText.split('\n');
    const parsed: Omit<StudentRecord, 'id' | 'createdAt'>[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check format 1: Tab separated or comma separated: "1\t김민준\t남" or "1, 김민준"
      // Check format 2: Space separated: "1 김민준" or "1번 김민준"
      // Check format 3: Just names per line: "김민준" (auto number)
      const parts = trimmed.split(/[\t,]+/).map((p) => p.trim()).filter(Boolean);

      let num = index + 1;
      let name = '';
      let gender = 'M';
      let notes = '';

      if (parts.length >= 2) {
        const numPart = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numPart)) {
          num = numPart;
          name = parts[1].replace(/[^가-힣a-zA-Z]/g, '').trim() || parts[1];
          if (parts[2]) {
            gender = parts[2].includes('여') || parts[2].toUpperCase() === 'F' ? 'F' : 'M';
          }
          if (parts[3]) notes = parts[3];
        } else {
          name = parts[0];
          if (parts[1]) notes = parts[1];
        }
      } else {
        const spaceParts = trimmed.split(/\s+/);
        if (spaceParts.length >= 2) {
          const numPart = parseInt(spaceParts[0].replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numPart)) {
            num = numPart;
            name = spaceParts[1];
            if (spaceParts[2]) notes = spaceParts.slice(2).join(' ');
          } else {
            name = spaceParts[0];
          }
        } else {
          name = trimmed;
        }
      }

      if (name) {
        parsed.push({
          grade: bulkGrade,
          classNum: bulkClass,
          studentNumber: num,
          name,
          gender,
          status: 'active',
          notes,
        });
      }
    });

    setBulkParsedPreview(parsed);
  }, [bulkText, bulkGrade, bulkClass]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedGrade !== 0 && s.grade !== selectedGrade) return false;
      if (selectedClass !== 0 && s.classNum !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          String(s.studentNumber).includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [students, selectedGrade, selectedClass, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const classCount = students.filter(
      (s) => s.grade === selectedGrade && s.classNum === selectedClass
    ).length;
    const gradeCount = students.filter((s) => s.grade === selectedGrade).length;
    const totalCount = students.length;
    return { classCount, gradeCount, totalCount };
  }, [students, selectedGrade, selectedClass]);

  // Handlers
  const handleStartAddSingle = () => {
    setEditingStudentId(null);
    setFormGrade(selectedGrade || 1);
    setFormClass(selectedClass || 1);
    const existingInClass = students.filter(
      (s) => s.grade === (selectedGrade || 1) && s.classNum === (selectedClass || 1)
    );
    setFormNumber(existingInClass.length > 0 ? Math.max(...existingInClass.map((s) => s.studentNumber)) + 1 : 1);
    setFormName('');
    setFormGender('M');
    setFormNotes('');
    setActiveMode('single-add');
  };

  const handleStartEdit = (student: StudentRecord) => {
    setEditingStudentId(student.id);
    setFormGrade(student.grade);
    setFormClass(student.classNum);
    setFormNumber(student.studentNumber);
    setFormName(student.name);
    setFormGender(student.gender || 'M');
    setFormNotes(student.notes || '');
    setActiveMode('edit');
  };

  const handleSaveSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('학생 성명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStudentId) {
        await dbService.updateStudent(editingStudentId, {
          grade: formGrade,
          classNum: formClass,
          studentNumber: formNumber,
          name: formName.trim(),
          gender: formGender,
          notes: formNotes.trim(),
        });
      } else {
        await dbService.addStudent({
          grade: formGrade,
          classNum: formClass,
          studentNumber: formNumber,
          name: formName.trim(),
          gender: formGender,
          status: 'active',
          notes: formNotes.trim(),
        });
      }
      setActiveMode('list');
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: StudentRecord) => {
    if (!confirm(`${student.grade}학년 ${student.classNum}반 ${student.studentNumber}번 ${student.name} 학생을 명렬에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await dbService.deleteStudent(student.id);
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleSaveBulkImport = async () => {
    if (bulkParsedPreview.length === 0) {
      alert('등록할 학생 데이터가 없습니다. 텍스트를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (bulkOverwrite) {
        await dbService.clearClassStudents(bulkGrade, bulkClass);
      }
      await dbService.bulkImportStudents(bulkParsedPreview);
      setBulkSuccessMsg(`🎉 ${bulkGrade}학년 ${bulkClass}반 학생 ${bulkParsedPreview.length}명이 성공적으로 등록되었습니다!`);
      setBulkText('');
      setTimeout(() => {
        setBulkSuccessMsg('');
        setActiveMode('list');
        setSelectedGrade(bulkGrade);
        setSelectedClass(bulkClass);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('일괄 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadRosterCSV = () => {
    let csv = `\uFEFF학년,반,번호,성명,성별,비고\n`;
    filteredStudents.forEach((s) => {
      csv += `${s.grade},${s.classNum},${s.studentNumber},"${s.name}","${s.gender === 'F' ? '여' : '남'}","${s.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `학교_학생명렬표_${selectedGrade}학년_${selectedClass}반_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = async () => {
    if (confirm('기본 샘플 학급 학생 명렬(1~3학년)로 초기화하시겠습니까?')) {
      await dbService.resetDefaultStudents();
      alert('기본 학생 명렬로 초기화되었습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & QUICK STATS                                          */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
              <span>학적 학생 명렬 등록 및 관리</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                총 {stats.totalCount}명 등록됨
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              엑셀/나이스 명렬 복사-붙여넣기로 1초 일괄 등록 • 출결 및 학생 호출 자동 연동
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPlacardGrade(selectedGrade || 1);
              setPlacardClass(selectedClass || 1);
              setIsClassPlacardOpen(true);
            }}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>담임 배부용 학급 QR 인쇄</span>
          </button>

          <button
            onClick={() => setActiveMode('bulk-import')}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              activeMode === 'bulk-import'
                ? 'bg-indigo-600 text-white'
                : isLight
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>엑셀·나이스 일괄 등록</span>
          </button>

          <button
            onClick={handleStartAddSingle}
            className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              activeMode === 'single-add'
                ? 'bg-indigo-600 text-white'
                : isLight
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>학생 1명 추가</span>
          </button>

          <button
            onClick={handleResetDefaults}
            title="기본 예시 명렬 리셋"
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              isLight
                ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODE 1: BULK IMPORT FROM EXCEL / NEIS                         */}
      {/* ------------------------------------------------------------- */}
      {activeMode === 'bulk-import' && (
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-md animate-in fade-in duration-200 ${
            isLight ? 'bg-white border-indigo-200 shadow-indigo-100/50' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black">
                엑셀 / 나이스(NEIS) 학급 명렬 일괄 등록
              </h3>
            </div>
            <button
              onClick={() => setActiveMode('list')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input controls */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 leading-relaxed text-slate-700 dark:text-slate-300">
                💡 <strong>엑셀이나 나이스 명렬표 복사-붙여넣기 팁:</strong><br />
                엑셀에서 <strong>[번호] [이름]</strong> 열을 복사하여 아래 상자에 그대로 붙여넣으세요.<br />
                (예: <code>1 강민준</code> 또는 <code>1, 강민준, 남, 반장</code> 모두 자동 인식)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    등록 대상 학년
                  </label>
                  <select
                    value={bulkGrade}
                    onChange={(e) => setBulkGrade(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                      isLight ? 'bg-white border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                    등록 대상 학급(반)
                  </label>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                      isLight ? 'bg-white border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
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

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  명렬 텍스트 붙여넣기 (Ctrl+V)
                </label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="1	강민준&#10;2	김도윤&#10;3	김서연&#10;4	김시우&#10;5	김지유..."
                  className={`w-full p-3 rounded-2xl border font-mono text-xs ${
                    isLight ? 'bg-indigo-50/30 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overwrite-check"
                  checked={bulkOverwrite}
                  onChange={(e) => setBulkOverwrite(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="overwrite-check" className="font-bold text-slate-600 dark:text-slate-400">
                  해당 학급({bulkGrade}학년 {bulkClass}반)의 기존 학생 명렬을 모두 비우고 새로 덮어쓰기
                </label>
              </div>

              {bulkSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold animate-pulse">
                  {bulkSuccessMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveBulkImport}
                  disabled={isSubmitting || bulkParsedPreview.length === 0}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>{bulkParsedPreview.length}명 일괄 등록 완료하기</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('list')}
                  className={`px-4 py-3 rounded-2xl font-bold border ${
                    isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700 text-slate-300'
                  }`}
                >
                  취소
                </button>
              </div>
            </div>

            {/* Right: Live Preview Table */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                <span>실시간 파싱 미리보기 ({bulkParsedPreview.length}명 인식됨)</span>
                <span className="text-[11px] text-indigo-600">
                  {bulkGrade}학년 {bulkClass}반
                </span>
              </div>

              <div
                className={`flex-1 rounded-2xl border overflow-y-auto max-h-[340px] text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                {bulkParsedPreview.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Upload className="w-8 h-8 mb-2 opacity-40" />
                    <p>왼쪽 상자에 엑셀 명렬 텍스트를 붙여넣으면<br />자동으로 인식된 학생 표가 여기에 나타납니다.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b text-[11px] font-bold text-slate-500">
                      <tr>
                        <th className="p-2.5 w-14">번호</th>
                        <th className="p-2.5">성명</th>
                        <th className="p-2.5 w-16">성별</th>
                        <th className="p-2.5">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {bulkParsedPreview.map((p, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/40">
                          <td className="p-2.5 font-bold text-indigo-600">{p.studentNumber}번</td>
                          <td className="p-2.5 font-black text-slate-800 dark:text-slate-200">{p.name}</td>
                          <td className="p-2.5 text-slate-500">{p.gender === 'F' ? '여' : '남'}</td>
                          <td className="p-2.5 text-slate-400">{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODE 2: SINGLE ADD / EDIT STUDENT MODAL/CARD                  */}
      {/* ------------------------------------------------------------- */}
      {(activeMode === 'single-add' || activeMode === 'edit') && (
        <form
          onSubmit={handleSaveSingleStudent}
          className={`rounded-3xl p-5 sm:p-6 border shadow-md animate-in fade-in duration-200 ${
            isLight ? 'bg-white border-indigo-200 shadow-indigo-100/50' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black">
                {editingStudentId ? '학생 정보 수정' : '새로운 학생 1명 추가 등록'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveMode('list')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                학년 <span className="text-rose-500">*</span>
              </label>
              <select
                value={formGrade}
                onChange={(e) => setFormGrade(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                학급(반) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formClass}
                onChange={(e) => setFormClass(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
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
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                출석번호 <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={45}
                required
                value={formNumber}
                onChange={(e) => setFormNumber(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                학생 성명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 김민준"
                className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                성별
              </label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value)}
                className={`w-full p-2.5 rounded-xl border font-bold text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                <option value="M">남학생</option>
                <option value="F">여학생</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                비고 / 직책 (선택)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="예: 반장, 부반장, 체육부장 등"
                className={`w-full p-2.5 rounded-xl border font-medium text-xs ${
                  isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
            <button
              type="button"
              onClick={() => setActiveMode('list')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700 text-slate-300'
              }`}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formName.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              <span>{editingStudentId ? '수정 내용 저장' : '학생 추가 완료'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FILTER CONTROLS & ROSTER TABLE                                */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-sm space-y-4 ${
          isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Grade & Class Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Grade Tabs */}
            <div className="flex rounded-xl p-1 border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedGrade(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedGrade === 0
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                전체 학년
              </button>
              {[1, 2, 3].map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>

            {/* Class Tabs */}
            <div className="flex items-center gap-1">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(Number(e.target.value))}
                className={`p-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-700'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <option value={0}>전체 반</option>
                {Array.from({ length: 7 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search & Download */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학생 성명 / 번호 / 비고 검색..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>

            <button
              onClick={handleDownloadRosterCSV}
              className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                isLight
                  ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">명렬 엑셀(CSV)</span>
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
              <tr>
                <th className="p-3 w-16 text-center">학적</th>
                <th className="p-3 w-16 text-center">번호</th>
                <th className="p-3">성명</th>
                <th className="p-3 w-16 text-center">성별</th>
                <th className="p-3">직책 / 비고</th>
                <th className="p-3 w-28 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    해당 조건의 등록된 학생이 없습니다. 상단의 <strong>[엑셀·나이스 일괄 등록]</strong>을 눌러 학생 명단을 추가해보세요!
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className={`transition ${
                      isLight ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="p-3 text-center font-bold text-slate-500">
                      {s.grade}-{s.classNum}
                    </td>
                    <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400">
                      {s.studentNumber}번
                    </td>
                    <td className="p-3 font-black text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {s.gender === 'F' ? '여' : '남'}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {s.notes ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          {s.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(s)}
                          title="수정"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          title="삭제"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Virtual Student Interactive Simulator Modal */}
      <VirtualStudentSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        theme={theme}
      />

      {/* Class QR Placard Modal */}
      {isClassPlacardOpen && (
        <ClassQRPlacardModal
          grade={placardGrade}
          classNum={placardClass}
          onClose={() => setIsClassPlacardOpen(false)}
        />
      )}
    </div>
  );
};
