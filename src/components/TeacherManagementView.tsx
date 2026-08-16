import React, { useState, useMemo, useRef } from 'react';
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
  Tag,
  Search,
  Upload,
  Layers,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  FileDown,
  Edit2,
  X,
  Phone,
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import { getPublicStudentUrl } from '../lib/urlUtils';
import {
  downloadTeacherExcelTemplate,
  downloadTeacherCsvTemplate,
  exportTeachersToExcel,
  parseTeacherExcelFile,
  parseTeacherClipboardText,
  COMMITTEE_RECOMMENDATIONS,
} from '../lib/excelTeacherUtils';
import type { Teacher, ThemeType } from '../types';

interface TeacherManagementViewProps {
  theme: ThemeType;
  teachers: Teacher[];
  onOpenPlacard: (room: string) => void;
  onNavigateToStudentView: (room: string) => void;
}

const DEFAULT_COMMITTEE_LIST = [
  '기획위원회',
  '교육과정위원회',
  '인사자문위원회',
  '교권보호위원회',
  '학폭전담기구',
  '선도위원회',
  '교직원장학협의회',
  '정보보안위원회',
  '학교운영위원회',
];

const DEFAULT_SUBJECT_LIST = [
  '국어',
  '수학',
  '영어',
  '과학',
  '사회',
  '한국사',
  '도덕/윤리',
  '체육',
  '음악',
  '미술',
  '기술가정',
  '정보',
  '한문/제2외국어',
  '진로상담',
  '보건',
  '특수',
  '사서',
];

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  theme,
  teachers,
  onOpenPlacard,
  onNavigateToStudentView,
}) => {
  const isLight = theme === 'vibrant-palette';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main Active Sub-tab: 'excel-import' | 'single-add' | 'committee-view' | 'qr-placard'
  const [activeTab, setActiveTab] = useState<'excel-import' | 'single-add' | 'committee-view' | 'qr-placard'>('excel-import');

  // Excel / Bulk Import state
  const [importSource, setImportSource] = useState<'file' | 'clipboard'>('file');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parsedTeachers, setParsedTeachers] = useState<Omit<Teacher, 'id'>[]>([]);
  const [clipboardText, setClipboardText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Single Add / Edit Teacher state
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('본관 1교무실');
  const [customRoom, setCustomRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('1학년부');
  const [grade, setGrade] = useState<string>('1');
  const [classNum, setClassNum] = useState<string>('1');
  const [homeroomRole, setHomeroomRole] = useState('1학년 1반 담임');
  const [duty, setDuty] = useState('');
  const [extension, setExtension] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCommittees, setSelectedCommittees] = useState<string[]>(['기획위원회']);
  const [newCommitteeInput, setNewCommitteeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterCommittee, setFilterCommittee] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');

  // QR Placard room
  const [qrRoom, setQrRoom] = useState<string>('본관 1교무실');
  const [copiedLink, setCopiedLink] = useState(false);

  // Distinct rooms
  const distinctRooms = useMemo(() => {
    const set = new Set<string>(['본관 1교무실', '2학년 연구실', '3학년 연구실', '진로진학상담실', '예체능교무실']);
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

  // Distinct departments
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
      if (t.tags) {
        t.tags.forEach((tag) => {
          if (tag.endsWith('부') || tag.endsWith('실')) set.add(tag);
        });
      }
    });
    return Array.from(set);
  }, [teachers]);

  // Distinct committees
  const distinctCommittees = useMemo(() => {
    const set = new Set<string>(DEFAULT_COMMITTEE_LIST);
    teachers.forEach((t) => {
      if (t.committees) {
        t.committees.forEach((c) => set.add(c));
      }
      if (t.tags) {
        t.tags.forEach((tag) => {
          if (tag.includes('위원회') || tag.includes('기구') || tag.includes('협의회')) {
            set.add(tag);
          }
        });
      }
    });
    return Array.from(set);
  }, [teachers]);

  // Distinct subjects
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.subject) set.add(t.subject);
    });
    return Array.from(set);
  }, [teachers]);

  // Public Student URL calculation
  const studentUrl = useMemo(() => {
    return getPublicStudentUrl(qrRoom);
  }, [qrRoom]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchRoom = t.room?.toLowerCase().includes(q);
        const matchSubject = t.subject?.toLowerCase().includes(q);
        const matchDept = t.department?.toLowerCase().includes(q);
        const matchRole = t.homeroomRole?.toLowerCase().includes(q);
        const matchDuty = t.duty?.toLowerCase().includes(q);
        const matchCommittee = t.committees?.some((c) => c.toLowerCase().includes(q));
        const matchTag = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!matchName && !matchRoom && !matchSubject && !matchDept && !matchRole && !matchDuty && !matchCommittee && !matchTag) {
          return false;
        }
      }

      // Filter Room
      if (filterRoom !== 'all' && t.room !== filterRoom) return false;

      // Filter Department
      if (filterDepartment !== 'all') {
        const matchDept = t.department === filterDepartment || t.tags?.includes(filterDepartment);
        if (!matchDept) return false;
      }

      // Filter Committee
      if (filterCommittee !== 'all') {
        const matchComm = t.committees?.includes(filterCommittee) || t.tags?.includes(filterCommittee);
        if (!matchComm) return false;
      }

      // Filter Subject
      if (filterSubject !== 'all' && t.subject !== filterSubject) return false;

      return true;
    });
  }, [teachers, searchQuery, filterRoom, filterDepartment, filterCommittee, filterSubject]);

  // Committee stats calculation (how many teachers in each committee)
  const committeeStats = useMemo(() => {
    return distinctCommittees.map((comm) => {
      const count = teachers.filter(
        (t) => t.committees?.includes(comm) || t.tags?.includes(comm)
      ).length;
      return { name: comm, count };
    });
  }, [distinctCommittees, teachers]);

  // -------------------------------------------------------------
  // Excel / File Upload Handlers
  // -------------------------------------------------------------
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);
    setUploadedFileName(file.name);
    try {
      const parsed = await parseTeacherExcelFile(file);
      if (parsed.length === 0) {
        alert('엑셀 파일에서 유효한 선생님 데이터를 찾지 못했습니다. 템플릿 양식을 확인해주세요.');
      } else {
        setParsedTeachers(parsed);
      }
    } catch (err) {
      console.error('Failed to parse excel file:', err);
      alert('엑셀 파일 파싱 중 오류가 발생했습니다. .xlsx, .xls, .csv 형식인지 확인해주세요.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleClipboardParse = () => {
    if (!clipboardText.trim()) {
      alert('복사한 텍스트를 입력해주세요.');
      return;
    }
    const parsed = parseTeacherClipboardText(clipboardText);
    if (parsed.length === 0) {
      alert('인식 가능한 교직원 데이터가 없습니다. 엑셀에서 복사 후 붙여넣어주세요.');
    } else {
      setParsedTeachers(parsed);
      setUploadedFileName('클립보드 복사 데이터');
    }
  };

  const handleExecuteBatchSave = async () => {
    if (parsedTeachers.length === 0) {
      alert('저장할 선생님 데이터가 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (importMode === 'replace') {
        await dbService.replaceTeachersBatch(parsedTeachers);
        setImportSuccessMsg(`🎉 기존 명단을 교체하고 총 ${parsedTeachers.length}명의 교직원을 완벽하게 등록했습니다!`);
      } else {
        await dbService.addTeachersBatch(parsedTeachers);
        setImportSuccessMsg(`🎉 기존 명단에 총 ${parsedTeachers.length}명의 교직원을 성공적으로 추가했습니다!`);
      }
      setParsedTeachers([]);
      setClipboardText('');
      setUploadedFileName('');
      setTimeout(() => setImportSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Batch save error:', err);
      alert('일괄 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Single Add / Edit Teacher Handler
  // -------------------------------------------------------------
  const toggleCommittee = (comm: string) => {
    if (selectedCommittees.includes(comm)) {
      setSelectedCommittees(selectedCommittees.filter((c) => c !== comm));
    } else {
      setSelectedCommittees([...selectedCommittees, comm]);
    }
  };

  const handleAddCustomCommittee = () => {
    if (newCommitteeInput.trim() && !selectedCommittees.includes(newCommitteeInput.trim())) {
      setSelectedCommittees([...selectedCommittees, newCommitteeInput.trim()]);
      setNewCommitteeInput('');
    }
  };

  const handleStartEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setRoom(teacher.room || '본관 1교무실');
    setSubject(teacher.subject || '');
    setDepartment(teacher.department || '1학년부');
    setGrade(teacher.grade ? String(teacher.grade) : '');
    setClassNum(teacher.classNum ? String(teacher.classNum) : '');
    setHomeroomRole(teacher.homeroomRole || '');
    setDuty(teacher.duty || '');
    setExtension(teacher.extension || '');
    setNotes(teacher.notes || '');

    const comms: string[] = teacher.committees ? [...teacher.committees] : [];
    if (teacher.tags) {
      teacher.tags.forEach((tag) => {
        if (tag.includes('위원회') || tag.includes('기구') || tag.includes('협의회')) {
          if (!comms.includes(tag)) comms.push(tag);
        }
      });
    }
    setSelectedCommittees(comms);
    setActiveTab('single-add');
  };

  const handleCancelEdit = () => {
    setEditingTeacherId(null);
    setName('');
    setSubject('');
    setDuty('');
    setExtension('');
    setNotes('');
    setSelectedCommittees(['기획위원회']);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim();
    const finalRoom = (isCustomRoom ? customRoom : room).trim();

    if (!finalName) {
      alert('선생님 성함을 입력해주세요.');
      return;
    }
    if (!finalRoom) {
      alert('교무실 명칭을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const numGrade = grade && !isNaN(Number(grade)) ? Number(grade) : undefined;
      const numClass = classNum && !isNaN(Number(classNum)) ? Number(classNum) : undefined;

      // Build tags
      const tags: string[] = [];
      if (numGrade && numClass) {
        tags.push(`${numGrade}학년 담임`);
        tags.push(`${numGrade}학년 ${numClass}반 담임`);
      } else if (numGrade) {
        tags.push(`${numGrade}학년 담임`);
      }
      if (department) tags.push(department);
      if (subject) tags.push(subject.endsWith('과') ? subject : `${subject}과`);
      if (homeroomRole && homeroomRole.includes('부장')) tags.push('부장교사');
      selectedCommittees.forEach((c) => {
        if (!tags.includes(c)) tags.push(c);
      });

      const teacherPayload: Omit<Teacher, 'id' | 'createdAt'> = {
        name: finalName,
        room: finalRoom,
        subject: subject.trim() || undefined,
        department: department.trim() || undefined,
        grade: numGrade,
        classNum: numClass,
        homeroomRole: homeroomRole.trim() || undefined,
        duty: duty.trim() || undefined,
        committees: selectedCommittees.length > 0 ? selectedCommittees : undefined,
        extension: extension.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (editingTeacherId) {
        await dbService.updateTeacher(editingTeacherId, teacherPayload);
        alert(`[${finalName}] 선생님 정보가 수정되었습니다.`);
        handleCancelEdit();
      } else {
        await dbService.addTeacher(teacherPayload);
        alert(`[${finalName}] 선생님이 성공적으로 등록되었습니다.`);
        setName('');
        setSubject('');
        setDuty('');
        setExtension('');
        setNotes('');
      }
    } catch (err) {
      console.error('Failed to save teacher:', err);
      alert('선생님 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: string, teacherName: string) => {
    if (window.confirm(`정말로 [${teacherName}] 선생님을 명단에서 삭제하시겠습니까?`)) {
      await dbService.deleteTeacher(id);
    }
  };

  const handleResetToDefault = async () => {
    if (
      window.confirm(
        '모든 교직원 명단을 기본 표준 샘플 명단(8명, 위원회·교과 포함)으로 초기화하시겠습니까?'
      )
    ) {
      await dbService.resetTeachersToDefault();
      alert('기본 샘플 교직원 명단으로 복원되었습니다.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Main Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-indigo-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>👥 교직원 명단 & 소속 위원회·교과 관리</span>
            </h2>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            엑셀 양식을 다운로드하여 전교직원 및 위원회·교과를 한 번에 일괄 등록하고, 쪽지 수합 및 업무에 실시간 연동합니다.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Excel Template */}
          <button
            onClick={downloadTeacherExcelTemplate}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition"
            title="소속위원회와 담당교과가 포함된 엑셀 서식 파일(.xlsx) 다운로드"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📥 엑셀 양식 다운로드 (.xlsx)</span>
          </button>

          {/* Download CSV Template */}
          <button
            onClick={downloadTeacherCsvTemplate}
            className="px-3 py-2.5 rounded-2xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            title="CSV 형식 양식 다운로드"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>CSV 양식</span>
          </button>

          {/* Export Current Roster */}
          <button
            onClick={() => exportTeachersToExcel(teachers)}
            className="px-3 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            title="현재 등록된 교직원 전체 명단을 엑셀 파일로 백업"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>현재 명단 엑셀 내보내기</span>
          </button>

          {/* Reset to Default */}
          <button
            onClick={handleResetToDefault}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="기본 샘플 교직원 명단으로 복원"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-4 rounded-3xl border ${
            isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">등록 전체 교직원</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
            {teachers.length}
            <span className="text-xs font-bold text-slate-400 ml-1">명</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-3xl border ${
            isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">소속 위원회</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {distinctCommittees.length}
            <span className="text-xs font-bold text-slate-400 ml-1">개 위원회</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-3xl border ${
            isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">개설 교과목</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">
            {distinctSubjects.length}
            <span className="text-xs font-bold text-slate-400 ml-1">개 교과</span>
          </div>
        </div>

        <div
          className={`p-4 rounded-3xl border ${
            isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">교무실 / 연구실</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {distinctRooms.length}
            <span className="text-xs font-bold text-slate-400 ml-1">개 소속실</span>
          </div>
        </div>
      </div>

      {/* Primary Sub Tabs */}
      <div
        className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <button
          onClick={() => setActiveTab('excel-import')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'excel-import'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>📊 엑셀 일괄 등록 & 양식 입력</span>
        </button>

        <button
          onClick={() => {
            handleCancelEdit();
            setActiveTab('single-add');
          }}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'single-add'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{editingTeacherId ? '✏️ 선생님 정보 수정' : '➕ 1명씩 직접 등록'}</span>
        </button>

        <button
          onClick={() => setActiveTab('committee-view')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'committee-view'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>🏛️ 소속 위원회 & 교과별 현황판</span>
        </button>

        <button
          onClick={() => setActiveTab('qr-placard')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'qr-placard'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>🚪 교무실 출입문 QR 안내판</span>
        </button>
      </div>

      {/* Global Success Notification */}
      {importSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-black flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>{importSuccessMsg}</span>
          </div>
          <button onClick={() => setImportSuccessMsg('')} className="text-emerald-700 font-bold text-xs hover:underline cursor-pointer">
            닫기
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* 1. EXCEL IMPORT TAB */}
      {/* ============================================================= */}
      {activeTab === 'excel-import' && (
        <div className="space-y-6">
          <div
            className={`p-6 sm:p-8 rounded-3xl border ${
              isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
            }`}
          >
            {/* Step Guides */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">교직원 명단 & 위원회 엑셀 일괄 등록</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    양식 다운로드 ➜ 엑셀 작성 ➜ 파일 드래그 업로드 ➜ 원클릭 저장 (기존 명단 자동 연동)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadTeacherExcelTemplate}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>양식 다운로드 (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Input Method Selector (File vs Clipboard) */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">입력 방식:</span>
                <button
                  type="button"
                  onClick={() => setImportSource('file')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    importSource === 'file'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isLight
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  📁 엑셀/CSV 파일 업로드
                </button>
                <button
                  type="button"
                  onClick={() => setImportSource('clipboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    importSource === 'clipboard'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isLight
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  📋 표 복사 붙여넣기 (Ctrl+V)
                </button>
              </div>

              {/* File Dropzone */}
              {importSource === 'file' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : isLight
                      ? 'border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50'
                      : 'border-slate-700 bg-slate-950/50 hover:bg-slate-950'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                        {uploadedFileName || '작성한 엑셀 파일 (.xlsx, .xls, .csv)을 여기에 끌어다 놓으세요'}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        또는 여기를 클릭하여 컴퓨터에서 파일을 선택하세요.
                      </p>
                    </div>
                    {isProcessingFile && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mt-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>엑셀 데이터를 스마트 파싱하고 있습니다...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Clipboard Area */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500">
                      엑셀이나 구글 스프레드시트, 한글 표에서 교직원 목록을 복사(Ctrl+C)한 후 여기에 붙여넣기(Ctrl+V)하세요:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setClipboardText(
                          `김민준\t본관 1교무실\t수학\t1학년부\t1\t3\t1학년 3반 담임\t수학과 대표\t기획위원회, 교육과정위원회\t101\n이서연\t본관 1교무실\t국어\t교무기획부\t\t\t교무기획부장\t교무총괄\t기획위원회, 인사자문위원회\t102\n박지훈\t본관 1교무실\t영어\t1학년부\t1\t1\t1학년 1반 담임\t나이스 학적\t학폭전담기구, 선도위원회\t103`
                        )
                      }
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      샘플 텍스트 넣기
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={clipboardText}
                    onChange={(e) => setClipboardText(e.target.value)}
                    placeholder="성명 [탭] 교무실 [탭] 교과 [탭] 소속부서 [탭] 학년 [탭] 반 [탭] 담임직책 [탭] 담당업무 [탭] 소속위원회 [탭] 내선번호"
                    className={`w-full p-4 rounded-2xl border text-xs font-mono outline-none ${
                      isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                    }`}
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleClipboardParse}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer"
                    >
                      텍스트 분석 및 표 변환 ➜
                    </button>
                  </div>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedTeachers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <h4 className="font-black text-sm">
                        인식된 교직원 데이터 미리보기 ({parsedTeachers.length}명)
                      </h4>
                    </div>

                    {/* Import Mode Options */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                        />
                        <span>기존 명단에 추가</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-rose-600 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>기존 명단 교체 (새로 등록)</span>
                      </label>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`sticky top-0 font-black ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-200'}`}>
                        <tr>
                          <th className="p-3">성명</th>
                          <th className="p-3">교무실/근무처</th>
                          <th className="p-3">담당교과</th>
                          <th className="p-3">소속부서</th>
                          <th className="p-3">담임/직책</th>
                          <th className="p-3">담당업무</th>
                          <th className="p-3">소속 위원회</th>
                          <th className="p-3">내선</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedTeachers.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              {t.name}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{t.room}</td>
                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {t.subject || '-'}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{t.department || '-'}</td>
                            <td className="p-3 font-medium">{t.homeroomRole || (t.grade ? `${t.grade}학년 담임` : '-')}</td>
                            <td className="p-3 text-slate-500">{t.duty || '-'}</td>
                            <td className="p-3">
                              {t.committees && t.committees.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {t.committees.map((c, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-slate-500">{t.extension || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setParsedTeachers([])}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      미리보기 취소
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteBatchSave}
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? '저장 중...'
                          : `총 ${parsedTeachers.length}명 교직원 ${importMode === 'replace' ? '명단 전체 교체 등록' : '일괄 추가 저장'}`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. SINGLE ADD / EDIT TAB */}
      {/* ============================================================= */}
      {activeTab === 'single-add' && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border transition-all ${
            isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
              <h3 className="font-black text-lg">
                {editingTeacherId ? `[${name}] 선생님 정보 수정` : '새로운 선생님 및 위원회 등록'}
              </h3>
            </div>
            {editingTeacherId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>수정 취소</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveTeacher} className="space-y-6">
            {/* Row 1: Name, Room, Subject, Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">
                  상주 교무실 / 연구실 <span className="text-rose-500">*</span>
                </label>
                {!isCustomRoom ? (
                  <div className="flex gap-1.5">
                    <select
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${
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
                      className="px-2.5 py-2 rounded-xl text-[11px] font-bold border hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      +직접
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      placeholder="새 교무실 명칭"
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                        isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomRoom(false)}
                      className="px-2.5 py-2 rounded-xl text-[11px] font-bold border hover:bg-slate-100 transition cursor-pointer"
                    >
                      목록
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">
                  담당 교과 (과목)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="예: 수학, 국어, 과학, 진로상담"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">
                  소속 부서
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 1학년부, 교무기획부, 학생안전부"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Row 2: Grade, Class, Role, Duty, Extension */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">담당 학년 (비담임 빈칸)</label>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="1, 2, 3"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">담당 반</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={classNum}
                  onChange={(e) => setClassNum(e.target.value)}
                  placeholder="1 ~ 12"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">담임 / 직책명</label>
                <input
                  type="text"
                  value={homeroomRole}
                  onChange={(e) => setHomeroomRole(e.target.value)}
                  placeholder="예: 1학년 3반 담임, 교무부장"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">담당 업무 분장</label>
                <input
                  type="text"
                  value={duty}
                  onChange={(e) => setDuty(e.target.value)}
                  placeholder="예: 나이스 학적, 평가계, 방송"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-500">교내 내선번호</label>
                <input
                  type="text"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                  placeholder="예: 101, 031-123-4567"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                    isLight ? 'bg-indigo-50/20 border-indigo-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
              </div>
            </div>

            {/* Committee Tag Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>소속 위원회 선택 (업무 쪽지 & 수합 자동 그룹 연동)</span>
                <span className="text-[11px] text-indigo-600 font-normal">복수 선택 가능</span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_COMMITTEE_LIST.map((comm) => {
                  const isSelected = selectedCommittees.includes(comm);
                  return (
                    <button
                      key={comm}
                      type="button"
                      onClick={() => toggleCommittee(comm)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <span>{isSelected ? '✓' : '+'}</span>
                      <span>{comm}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Committee Add */}
              <div className="flex gap-2 pt-1 max-w-md">
                <input
                  type="text"
                  value={newCommitteeInput}
                  onChange={(e) => setNewCommitteeInput(e.target.value)}
                  placeholder="기타 위원회 직접 입력..."
                  className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none ${
                    isLight ? 'bg-indigo-50/20 border-slate-200' : 'bg-slate-950 border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddCustomCommittee}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold border transition cursor-pointer"
                >
                  태그 추가
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {editingTeacherId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting
                  ? '저장 중...'
                  : editingTeacherId
                  ? '선생님 정보 수정 완료'
                  : '선생님 및 소속 위원회 등록 완료'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. COMMITTEE & SUBJECT MATRIX TAB */}
      {/* ============================================================= */}
      {activeTab === 'committee-view' && (
        <div className="space-y-6">
          <div
            className={`p-6 sm:p-8 rounded-3xl border ${
              isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black tracking-tight">학교 소속 위원회별 구성원 현황판</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 위원회 배지를 클릭하면 해당 위원회에 소속된 교직원 명단을 즉시 필터링하여 확인합니다.
                </p>
              </div>
              <button
                onClick={() => setFilterCommittee('all')}
                className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                필터 초기화
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {committeeStats.map((c) => {
                const isSelected = filterCommittee === c.name;
                return (
                  <div
                    key={c.name}
                    onClick={() => setFilterCommittee(isSelected ? 'all' : c.name)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : isLight
                        ? 'bg-indigo-50/30 hover:bg-indigo-50 border-indigo-100 text-slate-900'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">{c.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-black ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400'
                        }`}
                      >
                        {c.count}명
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {COMMITTEE_RECOMMENDATIONS.find((rec) => rec.name === c.name)?.desc ||
                        '소속 위원회 교직원 그룹'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. QR PLACARD TAB */}
      {/* ============================================================= */}
      {activeTab === 'qr-placard' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-6 space-y-4">
            <div
              className={`p-6 rounded-3xl border ${
                isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-indigo-600 dark:text-emerald-400" />
                <h3 className="font-black text-lg">교무실별 출입문 안내판 QR 생성</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-500">인쇄할 교무실 선택</label>
                  <select
                    value={qrRoom}
                    onChange={(e) => setQrRoom(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-black outline-none ${
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

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>[{qrRoom}] 상주 선생님 ({teachers.filter((t) => t.room === qrRoom).length}명):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {teachers
                      .filter((t) => t.room === qrRoom)
                      .map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 text-xs font-bold"
                        >
                          👤 {t.name} ({t.subject || '담임'})
                        </span>
                      ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => onOpenPlacard(qrRoom)}
                    className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>A4 출입문 부착 안내판 인쇄하기</span>
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

          <div className="md:col-span-6 flex justify-center">
            <div className="p-6 rounded-3xl bg-white text-slate-900 border border-slate-200 text-center shadow-lg space-y-3 max-w-sm w-full">
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-indigo-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>[{qrRoom}] 출입문 부착용 QR 코드</span>
              </div>
              <div className="flex justify-center p-3 bg-white rounded-2xl">
                <QRCodeSVG value={studentUrl} size={190} level="H" includeMargin />
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-mono break-all text-left">
                <div className="text-[10px] text-indigo-600 font-bold mb-0.5">📱 학생 접속 URL:</div>
                {studentUrl}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                스마트폰 카메라로 스캔 시 학생 화면으로 즉시 연결됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. MASTER ROSTER TABLE & SEARCH/FILTER SECTION */}
      {/* ============================================================= */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all ${
          isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        {/* Table Top Controls: Search and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-lg">
              전체 교직원 명단 현황 ({filteredTeachers.length} / {teachers.length}명)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 교과, 위원회 검색..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700'
                }`}
              />
            </div>

            {/* Room Filter */}
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700'
              }`}
            >
              <option value="all">전체 교무실</option>
              {distinctRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Committee Filter */}
            <select
              value={filterCommittee}
              onChange={(e) => setFilterCommittee(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-700'
              }`}
            >
              <option value="all">전체 위원회</option>
              {distinctCommittees.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 mt-4">
          <table className="w-full text-left text-xs">
            <thead className={`font-black ${isLight ? 'bg-slate-50 text-slate-700' : 'bg-slate-950 text-slate-300'}`}>
              <tr>
                <th className="p-3.5">교사 성명</th>
                <th className="p-3.5">교무실</th>
                <th className="p-3.5">담당 교과</th>
                <th className="p-3.5">소속 부서 / 학년</th>
                <th className="p-3.5">담임 / 직책</th>
                <th className="p-3.5">담당 업무</th>
                <th className="p-3.5">소속 위원회</th>
                <th className="p-3.5">내선</th>
                <th className="p-3.5 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTeachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  {/* Name */}
                  <td className="p-3.5 font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {t.name.slice(0, 1)}
                    </div>
                    <span>{t.name}</span>
                  </td>

                  {/* Room */}
                  <td className="p-3.5 text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                      📍 {t.room}
                    </span>
                  </td>

                  {/* Subject */}
                  <td className="p-3.5 font-black text-indigo-600 dark:text-indigo-400">
                    {t.subject ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                        {t.subject}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Department */}
                  <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                    {t.department || (t.grade ? `${t.grade}학년부` : '-')}
                  </td>

                  {/* Homeroom / Role */}
                  <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                    {t.homeroomRole || (t.grade && t.classNum ? `${t.grade}학년 ${t.classNum}반 담임` : '비담임')}
                  </td>

                  {/* Duty */}
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">{t.duty || '-'}</td>

                  {/* Committees */}
                  <td className="p-3.5">
                    {t.committees && t.committees.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.committees.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800"
                          >
                            🏷️ {c}
                          </span>
                        ))}
                      </div>
                    ) : t.tags && t.tags.some((tag) => tag.includes('위원회')) ? (
                      <div className="flex flex-wrap gap-1">
                        {t.tags
                          .filter((tag) => tag.includes('위원회'))
                          .map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800"
                            >
                              🏷️ {c}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>

                  {/* Extension */}
                  <td className="p-3.5 font-mono text-slate-500">
                    {t.extension ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {t.extension}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(t.id, t.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTeachers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              조건에 일치하는 선생님이 없습니다. 검색어나 필터를 변경해보세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
