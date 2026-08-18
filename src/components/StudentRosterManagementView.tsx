import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  Sparkles,
  ArrowRight,
  School,
  Save,
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Layers,
  FileText,
  Filter,
  FileUp,
  FolderOpen
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
  // Default to All Grades (0), All Classes (0) so all registered students (e.g. 157) are immediately visible!
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mode: 'list' | 'single-add' | 'bulk-import' | 'edit'
  const [activeMode, setActiveMode] = useState<'list' | 'single-add' | 'bulk-import' | 'edit'>('list');

  // Single Add / Edit Form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formGrade, setFormGrade] = useState<number>(1);
  const [formClass, setFormClass] = useState<number>(1);
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<string>('M');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Bulk Import state
  const [bulkImportScope, setBulkImportScope] = useState<'all-classes' | 'single-class'>('all-classes');
  const [bulkGrade, setBulkGrade] = useState<number>(1);
  const [bulkClass, setBulkClass] = useState<number>(1);
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkOverwriteMode, setBulkOverwriteMode] = useState<'upsert' | 'clear-and-replace'>('upsert');
  const [bulkParsedPreview, setBulkParsedPreview] = useState<Omit<StudentRecord, 'id' | 'createdAt'>[]>([]);

  // Drag and Drop & File state
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileName: string;
    fileSize: string;
    studentCount: number;
    sheetName?: string;
  } | null>(null);

  // Completion Modal State
  const [completionResult, setCompletionResult] = useState<{
    totalImported: number;
    classSummary: { grade: number; classNum: number; count: number }[];
    targetGrade: number;
  } | null>(null);

  // In-app Custom Delete Confirmation Modal State (replaces blocked browser confirm)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const showToast = (text: string, isError: boolean = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Class QR Placard Modal state
  const [isClassPlacardOpen, setIsClassPlacardOpen] = useState<boolean>(false);
  const [placardGrade, setPlacardGrade] = useState<number>(1);
  const [placardClass, setPlacardClass] = useState<number>(1);

  // Subscribe to students
  useEffect(() => {
    const unsubscribe = dbService.subscribeStudents((list) => {
      setStudents(list);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------
  // INTELLIGENT MULTI-CLASS / SINGLE-CLASS EXCEL PARSER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!bulkText.trim()) {
      setBulkParsedPreview([]);
      return;
    }

    const lines = bulkText.split('\n');
    const parsed: Omit<StudentRecord, 'id' | 'createdAt'>[] = [];

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return;

      // Skip common Excel header lines if user copied headers
      if (
        (line.includes('학년') && line.includes('반')) ||
        (line.includes('번호') && line.includes('성명')) ||
        (line.includes('순번') && line.includes('이름')) ||
        line.startsWith('학번') ||
        line.startsWith('이름')
      ) {
        return;
      }

      // Split by tabs or commas or multiple spaces
      const tabOrCommaParts = line.split(/[\t,]+/).map((p) => p.trim()).filter(Boolean);

      let g = bulkGrade;
      let c = bulkClass;
      let num = index + 1;
      let name = '';
      let gender = 'M';
      let notes = '';

      if (bulkImportScope === 'all-classes') {
        // Mode A: Multi-class / All-classes import
        // Check 1: 5-digit / 4-digit student ID format like "10101", "10215", "1-1-01", "1-2-15"
        const studentIdMatch = line.match(/^(\d)[-_ ]?(\d{1,2})[-_ ]?(\d{1,2})\s+([가-힣a-zA-Z]+)(.*)$/);
        const fiveDigitMatch = line.match(/^(\d)(\d{2})(\d{2})\s+([가-힣a-zA-Z]+)(.*)$/);

        if (tabOrCommaParts.length >= 4 && !isNaN(parseInt(tabOrCommaParts[0], 10)) && !isNaN(parseInt(tabOrCommaParts[1], 10))) {
          // Columns: [학년], [반], [번호], [성명], [성별?], [비고?]
          g = parseInt(tabOrCommaParts[0].replace(/[^0-9]/g, ''), 10) || bulkGrade;
          c = parseInt(tabOrCommaParts[1].replace(/[^0-9]/g, ''), 10) || 1;
          num = parseInt(tabOrCommaParts[2].replace(/[^0-9]/g, ''), 10) || 1;
          name = tabOrCommaParts[3].replace(/[^가-힣a-zA-Z·\s]/g, '').trim() || tabOrCommaParts[3];
          if (tabOrCommaParts[4]) {
            gender = tabOrCommaParts[4].includes('여') || tabOrCommaParts[4].toUpperCase() === 'F' ? 'F' : 'M';
          }
          if (tabOrCommaParts[5]) notes = tabOrCommaParts[5];
        } else if (tabOrCommaParts.length >= 3 && !isNaN(parseInt(tabOrCommaParts[0], 10))) {
          // Columns: [반], [번호], [성명], [성별?], [비고?] (under bulkGrade)
          c = parseInt(tabOrCommaParts[0].replace(/[^0-9]/g, ''), 10) || 1;
          num = parseInt(tabOrCommaParts[1].replace(/[^0-9]/g, ''), 10) || 1;
          name = tabOrCommaParts[2].replace(/[^가-힣a-zA-Z·\s]/g, '').trim() || tabOrCommaParts[2];
          if (tabOrCommaParts[3]) {
            gender = tabOrCommaParts[3].includes('여') || tabOrCommaParts[3].toUpperCase() === 'F' ? 'F' : 'M';
          }
          if (tabOrCommaParts[4]) notes = tabOrCommaParts[4];
        } else if (studentIdMatch) {
          // Matched "1-1-01 홍길동" or "1 1 1 홍길동"
          g = parseInt(studentIdMatch[1], 10);
          c = parseInt(studentIdMatch[2], 10);
          num = parseInt(studentIdMatch[3], 10);
          name = studentIdMatch[4].trim();
          const rest = studentIdMatch[5]?.trim() || '';
          if (rest.includes('여') || rest.includes('F')) gender = 'F';
          notes = rest.replace(/[남여FM]/g, '').trim();
        } else if (fiveDigitMatch) {
          // Matched "10101 홍길동"
          g = parseInt(fiveDigitMatch[1], 10);
          c = parseInt(fiveDigitMatch[2], 10);
          num = parseInt(fiveDigitMatch[3], 10);
          name = fiveDigitMatch[4].trim();
          const rest = fiveDigitMatch[5]?.trim() || '';
          if (rest.includes('여') || rest.includes('F')) gender = 'F';
          notes = rest.replace(/[남여FM]/g, '').trim();
        } else {
          // Check for "1반 1번 홍길동" format
          const koreanMatch = line.match(/(?:(\d)학년\s*)?(\d{1,2})반\s*(\d{1,2})번?\s*([가-힣a-zA-Z]+)(.*)/);
          if (koreanMatch) {
            if (koreanMatch[1]) g = parseInt(koreanMatch[1], 10);
            c = parseInt(koreanMatch[2], 10);
            num = parseInt(koreanMatch[3], 10);
            name = koreanMatch[4].trim();
            const rest = koreanMatch[5]?.trim() || '';
            if (rest.includes('여') || rest.includes('F')) gender = 'F';
            notes = rest.replace(/[남여FM]/g, '').trim();
          } else {
            // Space separated fallback: "1 1 홍길동" -> [반, 번호, 이름]
            const spaceParts = line.split(/\s+/);
            if (spaceParts.length >= 3 && !isNaN(parseInt(spaceParts[0], 10)) && !isNaN(parseInt(spaceParts[1], 10))) {
              c = parseInt(spaceParts[0], 10);
              num = parseInt(spaceParts[1], 10);
              name = spaceParts[2];
              if (spaceParts[3]) {
                gender = spaceParts[3].includes('여') || spaceParts[3].toUpperCase() === 'F' ? 'F' : 'M';
              }
              if (spaceParts[4]) notes = spaceParts.slice(4).join(' ');
            }
          }
        }
      } else {
        // Mode B: Single Class import (Uses bulkGrade & bulkClass)
        g = bulkGrade;
        c = bulkClass;

        if (tabOrCommaParts.length >= 2) {
          const numPart = parseInt(tabOrCommaParts[0].replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numPart)) {
            num = numPart;
            name = tabOrCommaParts[1].replace(/[^가-힣a-zA-Z·\s]/g, '').trim() || tabOrCommaParts[1];
            if (tabOrCommaParts[2]) {
              gender = tabOrCommaParts[2].includes('여') || tabOrCommaParts[2].toUpperCase() === 'F' ? 'F' : 'M';
            }
            if (tabOrCommaParts[3]) notes = tabOrCommaParts[3];
          } else {
            name = tabOrCommaParts[0];
            if (tabOrCommaParts[1]) notes = tabOrCommaParts[1];
          }
        } else {
          const spaceParts = line.split(/\s+/);
          if (spaceParts.length >= 2) {
            const numPart = parseInt(spaceParts[0].replace(/[^0-9]/g, ''), 10);
            if (!isNaN(numPart)) {
              num = numPart;
              name = spaceParts[1];
              if (spaceParts[2]) {
                gender = spaceParts[2].includes('여') || spaceParts[2].toUpperCase() === 'F' ? 'F' : 'M';
                notes = spaceParts.slice(3).join(' ');
              }
            } else {
              name = spaceParts[0];
            }
          } else {
            name = line;
          }
        }
      }

      if (name && name.length >= 1) {
        parsed.push({
          grade: g > 0 ? g : 1,
          classNum: c > 0 ? c : 1,
          studentNumber: num > 0 ? num : index + 1,
          name,
          gender,
          status: 'active',
          notes,
        });
      }
    });

    setBulkParsedPreview(parsed);
  }, [bulkText, bulkImportScope, bulkGrade, bulkClass]);

  // Breakdown of preview by class
  const previewClassSummary = useMemo(() => {
    const map = new Map<string, { grade: number; classNum: number; count: number }>();
    bulkParsedPreview.forEach((p) => {
      const key = `${p.grade}-${p.classNum}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { grade: p.grade, classNum: p.classNum, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.grade !== b.grade ? a.grade - b.grade : a.classNum - b.classNum
    );
  }, [bulkParsedPreview]);

  // Filtered Students List for Main Table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedGrade !== 0 && s.grade !== selectedGrade) return false;
      if (selectedClass !== 0 && s.classNum !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullKey = `${s.grade}학년 ${s.classNum}반 ${s.studentNumber}번 ${s.name}`;
        return (
          fullKey.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          String(s.studentNumber).includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [students, selectedGrade, selectedClass, searchQuery]);

  // Dynamic Available Grades and Classes based on data
  const availableGrades = useMemo(() => {
    const gradesSet = new Set<number>([1, 2, 3]);
    students.forEach((s) => {
      if (s.grade && s.grade > 0) gradesSet.add(s.grade);
    });
    return Array.from(gradesSet).sort((a, b) => a - b);
  }, [students]);

  const availableClasses = useMemo(() => {
    const classesSet = new Set<number>([1, 2, 3, 4, 5, 6, 7]);
    students.forEach((s) => {
      if (selectedGrade === 0 || s.grade === selectedGrade) {
        if (s.classNum && s.classNum > 0) classesSet.add(s.classNum);
      }
    });
    return Array.from(classesSet).sort((a, b) => a - b);
  }, [students, selectedGrade]);

  // Statistics per grade and class for tabs
  const gradeCounts = useMemo(() => {
    const total = students.length;
    const counts: Record<number, number> = {};
    availableGrades.forEach((g) => {
      counts[g] = students.filter((s) => s.grade === g).length;
    });
    return { total, counts };
  }, [students, availableGrades]);

  const classCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    availableClasses.forEach((c) => {
      counts[c] = students.filter(
        (s) => (selectedGrade === 0 || s.grade === selectedGrade) && s.classNum === c
      ).length;
    });
    return counts;
  }, [students, selectedGrade, availableClasses]);

  // -------------------------------------------------------------
  // DRAG AND DROP & EXCEL FILE PROCESSING
  // -------------------------------------------------------------
  const processExcelOrCsvFile = async (file: File) => {
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const formattedSize = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        let aggregatedText = '';
        let primarySheetName = workbook.SheetNames[0] || 'Sheet1';

        // Read all sheets in the workbook
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (worksheet) {
            // Convert to tab-separated rows
            const csvData = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            if (csvData.trim()) {
              aggregatedText += csvData.trim() + '\n';
            }
          }
        });

        if (aggregatedText.trim()) {
          setBulkText(aggregatedText.trim());
          setUploadedFileInfo({
            fileName,
            fileSize: formattedSize,
            studentCount: aggregatedText.split('\n').filter(Boolean).length,
            sheetName: workbook.SheetNames.length > 1 ? `총 ${workbook.SheetNames.length}개 시트` : primarySheetName,
          });
        } else {
          alert('엑셀 파일에 읽을 수 있는 데이터가 없습니다.');
        }
      } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const text = await file.text();
        if (text.trim()) {
          setBulkText(text.trim());
          setUploadedFileInfo({
            fileName,
            fileSize: formattedSize,
            studentCount: text.split('\n').filter(Boolean).length,
          });
        }
      } else {
        alert('지원되는 엑셀(.xlsx, .xls) 또는 텍스트(.csv, .txt) 파일을 드래그해주세요.');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert('파일을 읽는 중 오류가 발생했습니다. 올바른 엑셀 파일인지 확인해주세요.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processExcelOrCsvFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processExcelOrCsvFile(file);
      e.target.value = ''; // reset
    }
  };

  // Download Sample Excel (.xlsx) File
  const handleDownloadExcelSample = () => {
    const wb = XLSX.utils.book_new();

    if (bulkImportScope === 'all-classes') {
      const data = [
        ['학년', '반', '번호', '성명', '성별', '비고'],
        [1, 1, 1, '강민준', '남', '반장'],
        [1, 1, 2, '김도윤', '남', ''],
        [1, 1, 3, '김서연', '여', '부반장'],
        [1, 2, 1, '박서준', '남', '반장'],
        [1, 2, 2, '서유주', '여', ''],
        [1, 3, 1, '홍길동', '남', '체육부장'],
        [1, 3, 2, '안유진', '여', '반장'],
        [1, 4, 1, '이지은', '여', ''],
        [1, 5, 1, '최도현', '남', ''],
        [1, 6, 1, '한예슬', '여', ''],
        [1, 7, 1, '정우성', '남', ''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '전체학급명렬표');
      XLSX.writeFile(wb, `학교_전체반_학생명렬_일괄등록_양식_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const data = [
        ['번호', '성명', '성별', '비고'],
        [1, '강민준', '남', '반장'],
        [2, '김도윤', '남', ''],
        [3, '김서연', '여', '부반장'],
        [4, '김시우', '남', ''],
        [5, '김지유', '여', ''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `${bulkGrade}학년_${bulkClass}반`);
      XLSX.writeFile(wb, `학교_${bulkGrade}학년_${bulkClass}반_학생명렬_양식.xlsx`);
    }
  };

  // Handlers for Single Add / Edit
  const handleStartAddSingle = () => {
    setEditingStudentId(null);
    setFormGrade(selectedGrade > 0 ? selectedGrade : 1);
    setFormClass(selectedClass > 0 ? selectedClass : 1);
    const existingInClass = students.filter(
      (s) => s.grade === (selectedGrade > 0 ? selectedGrade : 1) && s.classNum === (selectedClass > 0 ? selectedClass : 1)
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
      setSelectedGrade(formGrade);
      setSelectedClass(formClass);
      setActiveMode('list');
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = (student: StudentRecord) => {
    setDeleteModal({
      isOpen: true,
      title: `${student.grade}학년 ${student.classNum}반 ${student.studentNumber}번 ${student.name} 삭제`,
      description: `정말로 [${student.name}] 학생을 명렬표에서 삭제하시겠습니까?`,
      confirmText: '학생 삭제',
      isDanger: true,
      onConfirm: async () => {
        try {
          await dbService.deleteStudent(student.id);
          showToast(`🗑️ ${student.name} 학생이 삭제되었습니다.`);
        } catch (err) {
          console.error(err);
          showToast('❌ 삭제 처리 중 오류가 발생했습니다.', true);
        } finally {
          setDeleteModal(null);
        }
      },
    });
  };

  const handleClearGrade = (grade: number) => {
    const count = gradeCounts.counts[grade] || 0;
    setDeleteModal({
      isOpen: true,
      title: `${grade}학년 학생 전체 삭제`,
      description: `${grade}학년에 등록된 학생 ${count}명을 모두 삭제하시겠습니까?\n(1학년 등 타 학년 학생 데이터는 안전하게 유지됩니다)`,
      confirmText: `${grade}학년 전체 삭제`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await dbService.clearGradeStudents(grade);
          showToast(`🧹 ${grade}학년 학생 ${count}명이 모두 삭제되었습니다.`);
        } catch (err) {
          console.error(err);
          showToast('❌ 학년 삭제 중 오류가 발생했습니다.', true);
        } finally {
          setDeleteModal(null);
        }
      },
    });
  };

  const handleClearSampleGrades = () => {
    const g2 = gradeCounts.counts[2] || 0;
    const g3 = gradeCounts.counts[3] || 0;
    const totalSample = g2 + g3;
    setDeleteModal({
      isOpen: true,
      title: '2~3학년 샘플 학생 일괄 정리',
      description: `현재 2학년(${g2}명)과 3학년(${g3}명)에 남아있는 샘플 학생 총 ${totalSample}명을 모두 삭제하시겠습니까?\n입력하신 1학년 학생 명렬은 안전하게 그대로 유지됩니다.`,
      confirmText: '샘플 학생 일괄 삭제',
      isDanger: true,
      onConfirm: async () => {
        try {
          await dbService.clearGradeStudents(2);
          await dbService.clearGradeStudents(3);
          showToast(`🧹 2~3학년 샘플 학생 ${totalSample}명이 깨끗이 정리되었습니다!`);
        } catch (err) {
          console.error(err);
          showToast('❌ 샘플 학생 정리 중 오류가 발생했습니다.', true);
        } finally {
          setDeleteModal(null);
        }
      },
    });
  };

  // Save Bulk Import & Show Completion Dialog
  const handleSaveBulkImport = async () => {
    if (bulkParsedPreview.length === 0) {
      showToast('등록할 학생 데이터가 없습니다. 엑셀 파일을 올려주세요.', true);
      return;
    }

    setIsSubmitting(true);
    try {
      const isClearAndReplace = bulkOverwriteMode === 'clear-and-replace';
      await dbService.bulkImportStudents(bulkParsedPreview, {
        overwriteExisting: true,
        clearTargetClassesFirst: isClearAndReplace,
      });

      // Prepare completion summary
      const firstTargetGrade = bulkParsedPreview[0]?.grade || bulkGrade;
      setCompletionResult({
        totalImported: bulkParsedPreview.length,
        classSummary: previewClassSummary,
        targetGrade: firstTargetGrade,
      });

      setBulkText('');
      setUploadedFileInfo(null);
      showToast(`🎉 ${bulkParsedPreview.length}명의 학생이 성공적으로 등록되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('일괄 등록에 실패했습니다. 형식 오류를 확인해주세요.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close Completion Modal and Navigate to List
  const handleAcknowledgeCompletion = () => {
    if (completionResult) {
      if (completionResult.classSummary.length === 1) {
        setSelectedGrade(completionResult.targetGrade || 0);
        setSelectedClass(completionResult.classSummary[0].classNum);
      } else {
        setSelectedGrade(0); // View all grades
        setSelectedClass(0); // View all classes so user sees all students!
      }
    }
    setCompletionResult(null);
    setActiveMode('list');
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
    link.download = `학교_학생명렬표_${selectedGrade > 0 ? selectedGrade + '학년_' : '전체_'}${selectedClass > 0 ? selectedClass + '반_' : '전체반_'}${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📥 명렬표 CSV 파일이 다운로드되었습니다.');
  };

  const handleResetDefaults = () => {
    setDeleteModal({
      isOpen: true,
      title: '기본 샘플 학급 명렬 초기화',
      description: '테스트용 기본 샘플 학생 명렬(1~3학년)로 초기화하시겠습니까? 현재 입력된 명렬이 덮어씌워질 수 있습니다.',
      confirmText: '기본값 초기화',
      isDanger: false,
      onConfirm: async () => {
        try {
          await dbService.resetDefaultStudents();
          setSelectedGrade(0);
          setSelectedClass(0);
          showToast('✨ 기본 샘플 학생 명렬로 초기화되었습니다.');
        } catch (err) {
          console.error(err);
          showToast('❌ 초기화 중 오류가 발생했습니다.', true);
        } finally {
          setDeleteModal(null);
        }
      },
    });
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black">학적 학생 명렬 등록 및 관리</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                총 {students.length}명 등록됨
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              엑셀 파일(.xlsx) 드래그&드롭 또는 복사·붙여넣기로 1초 일괄 등록 • 출결 및 학생 실시간 호출 자동 연동
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Bulk Import Trigger Button */}
          <button
            id="bulk-import-excel-btn"
            onClick={() => {
              setBulkImportScope('all-classes');
              setActiveMode('bulk-import');
            }}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
              activeMode === 'bulk-import'
                ? 'bg-indigo-700 text-white shadow-indigo-600/40 ring-2 ring-indigo-400'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-600/30'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📥 엑셀 일괄 등록 (드래그&드롭 / 복사)</span>
          </button>

          <button
            onClick={() => {
              setPlacardGrade(selectedGrade > 0 ? selectedGrade : 1);
              setPlacardClass(selectedClass > 0 ? selectedClass : 1);
              setIsClassPlacardOpen(true);
            }}
            className={`px-3.5 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            title="학생들이 교무실 방문 시 스캔할 학급 QR 안내판"
          >
            <QrCode className="w-4 h-4" />
            <span>학급 QR 인쇄</span>
          </button>

          <button
            onClick={handleStartAddSingle}
            className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border ${
              activeMode === 'single-add'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : isLight
                ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>학생 1명 추가</span>
          </button>

          <button
            onClick={handleResetDefaults}
            title="기본 예시 명렬 리셋"
            className={`p-2.5 rounded-2xl border transition cursor-pointer ${
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
      {/* MODE 1: BULK IMPORT FROM EXCEL WITH DRAG & DROP               */}
      {/* ------------------------------------------------------------- */}
      {activeMode === 'bulk-import' && (
        <div
          id="bulk-import-section"
          className={`rounded-3xl p-5 sm:p-7 border shadow-xl animate-in fade-in duration-200 ${
            isLight ? 'bg-white border-indigo-200 shadow-indigo-100/50' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <span>엑셀(.xlsx) 파일 드래그&드롭 / 나이스 학생 명렬 일괄 등록</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    드래그앤드롭 지원
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  엑셀 파일을 아래 영역에 마우스로 끌어다 놓거나(Drag&Drop), 엑셀에서 복사한 내용을 붙여넣으세요.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDownloadExcelSample}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="엑셀 표준 서식 파일 다운로드"
              >
                <Download className="w-3.5 h-3.5" />
                <span>표준 양식(.xlsx) 다운로드</span>
              </button>

              <button
                onClick={() => setActiveMode('list')}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scope Selector: All-Classes vs Single-Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setBulkImportScope('all-classes')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                bulkImportScope === 'all-classes'
                  ? isLight
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20 text-indigo-900'
                    : 'bg-indigo-950/60 border-indigo-600 ring-2 ring-indigo-600/30 text-white'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                  <span>모든 반 전체 일괄 등록 (추천)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                    1반~7반 동시
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                  전체 학급(1반, 2반, 3반...) 명단이 담긴 엑셀 파일을 드롭하면 자동으로 반별 분배 등록됩니다.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBulkImportScope('single-class')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                bulkImportScope === 'single-class'
                  ? isLight
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/20 text-indigo-900'
                    : 'bg-indigo-950/60 border-indigo-600 ring-2 ring-indigo-600/30 text-white'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Users className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-black text-xs sm:text-sm">특정 1개 반만 등록</div>
                <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                  선택한 특정 학년 및 학급(예: 1학년 3반)의 명단만 단독으로 등록합니다.
                </p>
              </div>
            </button>
          </div>

          {/* Context Options Bar */}
          {bulkImportScope === 'all-classes' ? (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-black text-slate-700 dark:text-slate-300">
                  기본 적용 학년:
                </label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(Number(e.target.value))}
                  className={`p-1.5 rounded-xl border font-bold text-xs ${
                    isLight ? 'bg-white border-indigo-200 text-indigo-900' : 'bg-slate-800 border-slate-700 text-white'
                  }`}
                >
                  <option value={1}>1학년</option>
                  <option value={2}>2학년</option>
                  <option value={3}>3학년</option>
                </select>
                <span className="text-[11px] text-slate-500">
                  (엑셀 파일에 학년 열이 포함되어 있으면 각 학년으로 자동 인식됩니다)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 mb-4 text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">
                    학년:
                  </label>
                  <select
                    value={bulkGrade}
                    onChange={(e) => setBulkGrade(Number(e.target.value))}
                    className={`p-1.5 rounded-xl border font-bold text-xs ${
                      isLight ? 'bg-white border-indigo-200' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 mr-1.5">
                    반:
                  </label>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(Number(e.target.value))}
                    className={`p-1.5 rounded-xl border font-bold text-xs ${
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
            </div>
          )}

          {/* DRAG & DROP ZONE (드래그앤드롭 영역) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 mb-5 ${
              isDraggingOver
                ? 'border-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/80 scale-[1.01] shadow-lg ring-4 ring-indigo-500/20'
                : uploadedFileInfo
                ? isLight
                  ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                  : 'border-emerald-700/60 bg-emerald-950/30 hover:bg-emerald-950/50'
                : isLight
                ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300'
                : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 hover:border-indigo-500'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".xlsx, .xls, .csv, .tsv, .txt"
              className="hidden"
            />

            {uploadedFileInfo ? (
              <div className="space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-black text-sm sm:text-base text-slate-800 dark:text-white flex items-center justify-center gap-2">
                  <span>{uploadedFileInfo.fileName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    {uploadedFileInfo.fileSize}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {uploadedFileInfo.sheetName ? `${uploadedFileInfo.sheetName} • ` : ''}
                  성공적으로 엑셀 내용을 로드했습니다. 아래 파싱 결과를 확인 후 완료 버튼을 눌러주세요.
                </p>
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    다른 엑셀 파일로 교체하려면 클릭하거나 다시 드래그하세요
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className={`w-14 h-14 rounded-3xl mx-auto flex items-center justify-center transition shadow-md ${
                  isDraggingOver
                    ? 'bg-indigo-600 text-white animate-bounce'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                }`}>
                  <FileUp className="w-7 h-7" />
                </div>
                <div className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                  {isDraggingOver ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">
                      📥 여기에 엑셀 파일을 놓아주세요!
                    </span>
                  ) : (
                    <span>📁 엑셀 파일(.xlsx, .xls, .csv)을 여기에 끌어다 놓으세요 (드래그 & 드롭)</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  컴퓨터에 있는 나이스/학교 학생 명렬표 엑셀 파일을 마우스로 끌어오거나 클릭하여 선택하면 즉시 분석됩니다.
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>내 컴퓨터에서 파일 선택하기</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Direct Text Paste Box (7 cols) */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-black text-slate-700 dark:text-slate-300">
                    또는 엑셀 데이터 직접 붙여넣기 (Ctrl + V)
                  </label>
                  {bulkText && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkText('');
                        setUploadedFileInfo(null);
                      }}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>내용 비우기</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    bulkImportScope === 'all-classes'
                      ? `[엑셀에서 전체 반 명단을 복사하여 그대로 붙여넣으세요]\n\n예시 1 (열 형식):\n1\t1\t1\t강민준\t남\t반장\n1\t1\t2\t김도윤\t남\n1\t2\t1\t박서준\t남\t반장\n1\t3\t1\t홍길동\t남\t체육부장\n\n예시 2 (학번 형식):\n10101 강민준\n10102 김도윤\n10201 박서준`
                      : `[엑셀에서 번호와 이름을 복사하여 붙여넣으세요]\n\n1\t강민준\t남\t반장\n2\t김도윤\t남\n3\t김서연\t여\t부반장\n4\t김시우\t남`
                  }
                  className={`w-full p-3.5 rounded-2xl border font-mono text-xs leading-relaxed outline-none transition ${
                    isLight
                      ? 'bg-slate-50/60 focus:bg-white border-indigo-200 focus:border-indigo-500 ring-2 ring-transparent focus:ring-indigo-100'
                      : 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-400'
                  }`}
                />
              </div>

              {/* Overwrite Option */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="overwrite-mode-check"
                  checked={bulkOverwriteMode === 'clear-and-replace'}
                  onChange={(e) =>
                    setBulkOverwriteMode(e.target.checked ? 'clear-and-replace' : 'upsert')
                  }
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <label
                  htmlFor="overwrite-mode-check"
                  className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {bulkImportScope === 'all-classes'
                    ? '해당 학년/학급의 기존 명단을 모두 삭제하고 이번 엑셀 명단으로 완전히 덮어쓰기'
                    : `해당 학급(${bulkGrade}학년 ${bulkClass}반)의 기존 학생 명단을 모두 비우고 새로 덮어쓰기`}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveBulkImport}
                  disabled={isSubmitting || bulkParsedPreview.length === 0}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    총 {bulkParsedPreview.length}명 (
                    {previewClassSummary.length}개 학급) 일괄 등록 완료하기
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('list')}
                  className={`px-5 py-3.5 rounded-2xl font-bold border cursor-pointer ${
                    isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  취소
                </button>
              </div>
            </div>

            {/* Right: Live Preview Table & Class Breakdown (5 cols) */}
            <div className="lg:col-span-5 flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>실시간 파싱 결과 ({bulkParsedPreview.length}명 인식)</span>
                </span>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {previewClassSummary.length}개 학급 감지됨
                </span>
              </div>

              {/* Class Badges Preview */}
              {previewClassSummary.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {previewClassSummary.map((sum) => (
                    <span
                      key={`${sum.grade}-${sum.classNum}`}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 shadow-xs"
                    >
                      {sum.grade}-{sum.classNum}반: <span className="text-slate-900 dark:text-white">{sum.count}명</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Table Preview */}
              <div
                className={`flex-1 rounded-2xl border overflow-y-auto max-h-[340px] text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                {bulkParsedPreview.length === 0 ? (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Upload className="w-8 h-8 mb-2 opacity-40 text-indigo-500" />
                    <p className="font-bold text-slate-600 dark:text-slate-400">
                      엑셀 파일을 드래그앤드롭하거나 명렬을 붙여넣으세요.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      반, 번호, 이름이 자동으로 분석되어 표로 정리됩니다.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-200/90 dark:bg-slate-800 border-b text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2 w-16 text-center">학급</th>
                        <th className="p-2 w-14 text-center">번호</th>
                        <th className="p-2">성명</th>
                        <th className="p-2 w-14 text-center">성별</th>
                        <th className="p-2">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {bulkParsedPreview.map((p, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/40">
                          <td className="p-2 text-center font-bold text-slate-600 dark:text-slate-300">
                            {p.grade}-{p.classNum}
                          </td>
                          <td className="p-2 text-center font-black text-indigo-600 dark:text-indigo-400">
                            {p.studentNumber}번
                          </td>
                          <td className="p-2 font-black text-slate-900 dark:text-slate-200">
                            {p.name}
                          </td>
                          <td className="p-2 text-center text-slate-500">
                            {p.gender === 'F' ? '여' : '남'}
                          </td>
                          <td className="p-2 text-slate-400">{p.notes || '-'}</td>
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
      {/* COMPLETION SUCCESS MODAL (등록 완료 안내 모달)                   */}
      {/* ------------------------------------------------------------- */}
      {completionResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border text-center space-y-5 ${
              isLight ? 'bg-white border-emerald-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                등록 완료
              </span>
              <h3 className="text-xl font-black mt-2">
                학생 명렬 등록이 성공적으로 완료되었습니다!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                총 <strong className="text-emerald-600 dark:text-emerald-400">{completionResult.totalImported}명</strong>의 학생 데이터가 시스템에 안전하게 저장되었습니다.
              </p>
            </div>

            {/* Class Breakdown Badges with Direct QR Placard Open Button */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>등록된 학급별 학생 수 & QR 배부:</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  버튼 터치 시 QR 즉시 표시
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {completionResult.classSummary.map((c) => (
                  <div
                    key={`${c.grade}-${c.classNum}`}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.grade}학년 {c.classNum}반
                      </span>
                      <span className="ml-2 font-black text-indigo-600 dark:text-indigo-400">
                        {c.count}명 등록
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPlacardGrade(c.grade);
                        setPlacardClass(c.classNum);
                        setIsClassPlacardOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{c.classNum}반 QR 열기</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleAcknowledgeCompletion}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>📋 등록된 학생 명렬표 바로 확인하기</span>
              </button>
              <button
                onClick={() => setCompletionResult(null)}
                className={`px-4 py-3.5 rounded-2xl font-bold text-xs border cursor-pointer ${
                  isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                추가 등록하기
              </button>
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
      {/* FILTER CONTROLS & COMPREHENSIVE ROSTER TABLE                  */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-sm space-y-4 ${
          isLight ? 'bg-white border-indigo-100' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Top Filter Controls: Grade Tabs & Class Selector & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Grade Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl p-1 border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setSelectedGrade(0)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  selectedGrade === 0
                    ? 'bg-indigo-600 text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>전체 학년</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {gradeCounts.total}
                </span>
              </button>
              {availableGrades.map((g) => {
                const cnt = gradeCounts.counts[g] || 0;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                      selectedGrade === g
                        ? 'bg-indigo-600 text-white shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{g}학년</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedGrade === g ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick 2~3 Grade Sample Cleanup Button */}
            {((gradeCounts.counts[2] || 0) > 0 || (gradeCounts.counts[3] || 0) > 0) && (
              <button
                type="button"
                onClick={handleClearSampleGrades}
                className="px-3 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 transition cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-xs"
                title="2학년과 3학년에 있는 샘플 학생을 한 번에 정리합니다 (1학년 데이터는 안전하게 보존)"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>🧹 2~3학년 샘플 학생 일괄 삭제 ({((gradeCounts.counts[2] || 0) + (gradeCounts.counts[3] || 0))}명)</span>
              </button>
            )}

            {/* Selected Grade Full Clear Button */}
            {selectedGrade > 0 && (gradeCounts.counts[selectedGrade] || 0) > 0 && (
              <button
                type="button"
                onClick={() => handleClearGrade(selectedGrade)}
                className="px-3 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition cursor-pointer text-xs font-bold flex items-center gap-1.5"
                title={`${selectedGrade}학년 학생 전체를 삭제합니다`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{selectedGrade}학년 전체 삭제 ({gradeCounts.counts[selectedGrade]}명)</span>
              </button>
            )}
          </div>

          {/* Search & Download Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학생 성명 / 번호 / 비고 검색..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleDownloadRosterCSV}
              className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                isLight
                  ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title="현재 조회중인 명렬표를 엑셀(CSV) 파일로 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">엑셀(CSV) 다운로드</span>
            </button>
          </div>
        </div>

        {/* 1반 ~ 7반 Class Pill Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedClass(0)}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedClass === 0
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>전체 반 보기</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/20">
                {filteredStudents.length}명
              </span>
            </button>

            {availableClasses.map((c) => {
              const count = classCounts[c] || 0;
              const isSelected = selectedClass === c;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                      : count > 0
                      ? isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600'
                      : isLight
                      ? 'bg-slate-50 border-slate-200/60 text-slate-400 hover:bg-slate-100'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span>{c}반</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Print QR for Current Selected Class */}
          <button
            type="button"
            onClick={() => {
              setPlacardGrade(selectedGrade > 0 ? selectedGrade : 1);
              setPlacardClass(selectedClass > 0 ? selectedClass : 1);
              setIsClassPlacardOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95 shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>
              {selectedGrade > 0 ? selectedGrade : 1}학년 {selectedClass > 0 ? selectedClass : 1}반 QR 안내판 열기
            </span>
          </button>
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
                  <td colSpan={6} className="p-8 sm:p-12 text-center text-slate-400">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`max-w-lg mx-auto p-6 rounded-3xl border-2 border-dashed transition space-y-4 ${
                        isDraggingOver
                          ? 'border-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/80 scale-[1.01] shadow-lg ring-4 ring-indigo-500/20'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-800 bg-slate-900/40'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 mx-auto flex items-center justify-center shadow-xs">
                        <Users className="w-7 h-7" />
                      </div>

                      <div>
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">
                          {selectedClass > 0
                            ? `${selectedGrade > 0 ? selectedGrade + '학년 ' : ''}${selectedClass}반에 등록된 학생이 없습니다.`
                            : students.length === 0
                            ? '현재 등록된 전체 학생 명렬이 비어있습니다.'
                            : '해당 조건의 등록된 학생이 없습니다.'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          엑셀 파일(.xlsx)을 <strong>이곳으로 마우스로 끌어다 놓으시거나(Drag&Drop)</strong>, 아래 버튼을 눌러 명단을 등록해보세요!
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkGrade(selectedGrade > 0 ? selectedGrade : 1);
                            setBulkClass(selectedClass > 0 ? selectedClass : 1);
                            setBulkImportScope(selectedClass > 0 ? 'single-class' : 'all-classes');
                            setActiveMode('bulk-import');
                            setTimeout(() => {
                              document.getElementById('bulk-import-section')?.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>📥 {selectedClass > 0 ? `${selectedClass}반에 엑셀로 명단 넣기` : '엑셀 일괄 등록 열기'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetDefaults}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                          title="테스트용 1~3학년 기본 샘플 학생 명렬을 즉시 생성합니다."
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>✨ 기본 샘플 학생(1~3학년) 1초 복원</span>
                        </button>

                        {selectedClass > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedClass(0)}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition"
                          >
                            전체 반 목록 보기
                          </button>
                        )}
                      </div>
                    </div>
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
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
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

      {/* In-app Custom Delete Confirmation Dialog (replaces blocked browser confirm) */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {deleteModal.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed mb-6">
              {deleteModal.description}
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={deleteModal.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition cursor-pointer ${
                  deleteModal.isDanger !== false
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                {deleteModal.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold ${
              toastMessage.isError
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                : isLight
                ? 'bg-slate-900 text-white border-slate-800 shadow-slate-900/30'
                : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
