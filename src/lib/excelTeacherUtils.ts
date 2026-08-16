import * as XLSX from 'xlsx';
import type { Teacher } from '../types';

export const EXCEL_COLUMNS = [
  { header: '성명*', key: 'name', width: 12, example: '김민준' },
  { header: '교무실/근무처*', key: 'room', width: 16, example: '본관 1교무실' },
  { header: '담당교과', key: 'subject', width: 14, example: '수학' },
  { header: '소속부서', key: 'department', width: 16, example: '1학년부' },
  { header: '담당학년', key: 'grade', width: 10, example: '1' },
  { header: '담당반', key: 'classNum', width: 10, example: '3' },
  { header: '담임/직책', key: 'homeroomRole', width: 18, example: '1학년 3반 담임' },
  { header: '담당업무', key: 'duty', width: 22, example: '1학년 학년운영 및 수학 수업' },
  { header: '소속위원회', key: 'committees', width: 30, example: '기획위원회, 교육과정위원회' },
  { header: '내선번호', key: 'extension', width: 12, example: '101' },
  { header: '비고', key: 'notes', width: 16, example: '수학과 대표' },
];

export const SAMPLE_TEACHERS_DATA = [
  {
    name: '김민준',
    room: '본관 1교무실',
    subject: '수학',
    department: '1학년부',
    grade: '1',
    classNum: '3',
    homeroomRole: '1학년 3반 담임',
    duty: '1학년 학년운영 및 수학 수업',
    committees: '기획위원회, 교육과정위원회',
    extension: '101',
    notes: '수학과 대표',
  },
  {
    name: '이서연',
    room: '본관 1교무실',
    subject: '국어',
    department: '교무기획부',
    grade: '',
    classNum: '',
    homeroomRole: '교무기획부장 (비담임)',
    duty: '교무기획 총괄 및 학사일정 관리',
    committees: '기획위원회, 인사자문위원회, 교육과정위원회',
    extension: '102',
    notes: '부장교사',
  },
  {
    name: '박지훈',
    room: '본관 1교무실',
    subject: '영어',
    department: '1학년부',
    grade: '1',
    classNum: '1',
    homeroomRole: '1학년 1반 담임',
    duty: '1학년 영어 및 나이스 학적 관리',
    committees: '학폭전담기구, 선도위원회',
    extension: '103',
    notes: '',
  },
  {
    name: '최유나',
    room: '2학년 연구실',
    subject: '과학',
    department: '2학년부',
    grade: '2',
    classNum: '1',
    homeroomRole: '2학년 부장 / 2-1 담임',
    duty: '2학년 총괄 및 과학 실험실 관리',
    committees: '기획위원회, 교권보호위원회, 교육과정위원회',
    extension: '201',
    notes: '부장교사',
  },
  {
    name: '정현우',
    room: '2학년 연구실',
    subject: '사회',
    department: '학생안전부',
    grade: '',
    classNum: '',
    homeroomRole: '학생안전부장 (비담임)',
    duty: '학생 생활지도 및 학교폭력 예방',
    committees: '학폭전담기구, 선도위원회, 교권보호위원회',
    extension: '202',
    notes: '부장교사',
  },
  {
    name: '강도윤',
    room: '3학년 연구실',
    subject: '한국사',
    department: '3학년부',
    grade: '3',
    classNum: '1',
    homeroomRole: '3학년 부장 / 3-1 담임',
    duty: '3학년 입시지도 및 진학 상담',
    committees: '기획위원회, 인사자문위원회',
    extension: '301',
    notes: '부장교사',
  },
  {
    name: '임서진',
    room: '진로진학상담실',
    subject: '진로상담',
    department: '진로진학상담부',
    grade: '',
    classNum: '',
    homeroomRole: '진로진학상담부장',
    duty: '학생 진로 및 Wee클래스 전문상담',
    committees: '학폭전담기구, 교육과정위원회, 인사자문위원회',
    extension: '401',
    notes: '',
  },
  {
    name: '송지호',
    room: '예체능교무실',
    subject: '체육',
    department: '체육보건부',
    grade: '2',
    classNum: '3',
    homeroomRole: '2학년 3반 담임',
    duty: '체육행사 기획 및 학교스포츠클럽',
    committees: '선도위원회, 교직원장학협의회',
    extension: '501',
    notes: '',
  },
];

export const COMMITTEE_RECOMMENDATIONS = [
  { name: '기획위원회', desc: '학교 교육 비전 및 주요 정책 수립' },
  { name: '교육과정위원회', desc: '학교 교육과정 편성·운영 및 교과서 선정' },
  { name: '인사자문위원회', desc: '교원 인사 및 보직 추천 자문' },
  { name: '교권보호위원회', desc: '교원의 교육활동 보호 및 분쟁 조정' },
  { name: '학폭전담기구', desc: '학교폭력 사안 접수 및 조사' },
  { name: '선도위원회', desc: '학생 생활지도 및 선도 규정 심의' },
  { name: '교직원장학협의회', desc: '수업 연구 및 장학 활동 협의' },
  { name: '정보보안위원회', desc: '개인정보 보호 및 정보보안 관리' },
];

/**
 * 엑셀 양식 (.xlsx) 다운로드 생성
 */
export function downloadTeacherExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Data Sheet (교직원 명단 입력)
  const rows = [
    EXCEL_COLUMNS.map((c) => c.header),
    ...SAMPLE_TEACHERS_DATA.map((d) => [
      d.name,
      d.room,
      d.subject,
      d.department,
      d.grade,
      d.classNum,
      d.homeroomRole,
      d.duty,
      d.committees,
      d.extension,
      d.notes,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column width
  ws['!cols'] = EXCEL_COLUMNS.map((c) => ({ wch: c.width }));

  XLSX.utils.book_append_sheet(wb, ws, '교직원명단입력');

  // 2. Guide Sheet (입력 가이드 및 추천 위원회/교과 목록)
  const guideRows = [
    ['[교직원 명단 & 위원회·교과 일괄 등록 양식 가이드]'],
    [''],
    ['1. 필수 입력 항목: [성명*], [교무실/근무처*]'],
    ['2. 소속위원회 입력: 쉼표(,)나 슬래시(/), 파이프(|)로 구분하여 입력하시면 자동으로 위원회 태그로 분류됩니다.'],
    ['   예시: 기획위원회, 교육과정위원회, 인사자문위원회'],
    ['3. 담당학년/담당반: 담임선생님의 경우 숫자만 입력 (비담임은 빈칸)'],
    ['4. 입력 완료 후 이 엑셀 파일을 그대로 [교직원 명단 엑셀 등록] 화면에 드래그하거나 선택하여 업로드하세요.'],
    [''],
    ['[학교 주요 추천 위원회 목록 참고]'],
    ['위원회 명칭', '주요 역할'],
    ...COMMITTEE_RECOMMENDATIONS.map((c) => [c.name, c.desc]),
  ];

  const guideWs = XLSX.utils.aoa_to_sheet(guideRows);
  guideWs['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, guideWs, '작성방법및위원회목록');

  // Write file
  XLSX.writeFile(wb, '교직원_명단_소속위원회_교과관리_입력양식.xlsx');
}

/**
 * CSV 양식 다운로드
 */
export function downloadTeacherCsvTemplate(): void {
  const headers = EXCEL_COLUMNS.map((c) => `"${c.header}"`).join(',');
  const sampleRows = SAMPLE_TEACHERS_DATA.map((d) =>
    [
      d.name,
      d.room,
      d.subject,
      d.department,
      d.grade,
      d.classNum,
      d.homeroomRole,
      d.duty,
      `"${d.committees}"`,
      d.extension,
      d.notes,
    ].join(',')
  ).join('\n');

  const csvContent = '\uFEFF' + headers + '\n' + sampleRows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', '교직원_명단_소속위원회_양식.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 현재 시스템의 교직원 목록을 엑셀로 내보내기 (.xlsx)
 */
export function exportTeachersToExcel(teachers: Teacher[]): void {
  const wb = XLSX.utils.book_new();

  const rows = [
    EXCEL_COLUMNS.map((c) => c.header),
    ...teachers.map((t) => [
      t.name,
      t.room || '본관 1교무실',
      t.subject || '',
      t.department || '',
      t.grade ? String(t.grade) : '',
      t.classNum ? String(t.classNum) : '',
      t.homeroomRole || (t.grade && t.classNum ? `${t.grade}학년 ${t.classNum}반 담임` : '비담임'),
      t.duty || '',
      t.committees && t.committees.length > 0
        ? t.committees.join(', ')
        : (t.tags || []).filter((tag) => tag.includes('위원회') || tag.includes('기구')).join(', '),
      t.extension || '',
      t.notes || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = EXCEL_COLUMNS.map((c) => ({ wch: c.width }));

  XLSX.utils.book_append_sheet(wb, ws, '교직원명단');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `교직원_명단_현황_${today}.xlsx`);
}

/**
 * 엑셀 파일 (.xlsx, .xls, .csv) 파싱
 */
export async function parseTeacherExcelFile(file: File): Promise<Omit<Teacher, 'id'>[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (rawRows.length === 0) return [];

  return parseRawRowsToTeachers(rawRows);
}

/**
 * 클립보드 텍스트 파싱
 */
export function parseTeacherClipboardText(text: string): Omit<Teacher, 'id'>[] {
  if (!text.trim()) return [];

  const lines = text.split('\n');
  const rawRows: string[][] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let cells: string[] = [];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else if (line.includes(',')) {
      cells = line.split(',');
    } else if (line.includes('|')) {
      cells = line.split('|');
    } else {
      cells = line.split(/\s+/);
    }
    rawRows.push(cells.map((c) => c.trim()));
  }

  return parseRawRowsToTeachers(rawRows);
}

/**
 * 2차원 배열 데이터를 Teacher 객체 리스트로 매핑 및 검증
 */
function parseRawRowsToTeachers(rawRows: any[][]): Omit<Teacher, 'id'>[] {
  if (rawRows.length === 0) return [];

  let headerRowIndex = -1;
  let headerColMap: Record<string, number> = {};

  // Find header row by keywords
  for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
    const row = rawRows[r] || [];
    const joined = row.map((cell) => String(cell || '').trim()).join(' ');

    if (joined.includes('성명') || joined.includes('이름') || joined.includes('교사명')) {
      headerRowIndex = r;
      row.forEach((cell: any, cIdx: number) => {
        const h = String(cell || '').trim().replace('*', '');
        if (h.includes('성명') || h.includes('이름')) headerColMap['name'] = cIdx;
        else if (h.includes('교무실') || h.includes('근무') || h.includes('연구실') || h.includes('실')) headerColMap['room'] = cIdx;
        else if (h.includes('교과') || h.includes('과목')) headerColMap['subject'] = cIdx;
        else if (h.includes('부서') || h.includes('소속부')) headerColMap['department'] = cIdx;
        else if (h.includes('학년')) headerColMap['grade'] = cIdx;
        else if (h.includes('반') && !h.includes('담임')) headerColMap['classNum'] = cIdx;
        else if (h.includes('담임') || h.includes('직책') || h.includes('보직')) headerColMap['homeroomRole'] = cIdx;
        else if (h.includes('업무') || h.includes('분장')) headerColMap['duty'] = cIdx;
        else if (h.includes('위원회') || h.includes('소속위')) headerColMap['committees'] = cIdx;
        else if (h.includes('내선') || h.includes('전화') || h.includes('연락처')) headerColMap['extension'] = cIdx;
        else if (h.includes('비고') || h.includes('메모')) headerColMap['notes'] = cIdx;
      });
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const result: Omit<Teacher, 'id'>[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    if (row.length === 0) continue;

    // Extract by detected header map, or default index positions
    const getVal = (key: string, defaultIdx: number): string => {
      const idx = headerColMap[key] !== undefined ? headerColMap[key] : defaultIdx;
      return idx >= 0 && row[idx] !== undefined ? String(row[idx]).trim() : '';
    };

    const name = getVal('name', 0);
    if (!name || name.startsWith('#') || name === '성명' || name === '이름') continue;

    const room = getVal('room', 1) || '본관 1교무실';
    const subject = getVal('subject', 2) || undefined;
    const department = getVal('department', 3) || undefined;
    const gradeStr = getVal('grade', 4);
    const classStr = getVal('classNum', 5);
    const homeroomRole = getVal('homeroomRole', 6) || undefined;
    const duty = getVal('duty', 7) || undefined;
    const rawCommittees = getVal('committees', 8);
    const extension = getVal('extension', 9) || undefined;
    const notes = getVal('notes', 10) || undefined;

    const grade = gradeStr && !isNaN(Number(gradeStr)) ? Number(gradeStr) : undefined;
    const classNum = classStr && !isNaN(Number(classStr)) ? Number(classStr) : undefined;

    // Parse committees (split by comma, slash, semicolon, pipe)
    const committees: string[] = [];
    if (rawCommittees) {
      rawCommittees
        .split(/[,/|;]+/)
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => {
          if (!committees.includes(c)) committees.push(c);
        });
    }

    // Build comprehensive tags for search & work note aggregation
    const tags: string[] = [];
    if (grade && classNum) {
      tags.push(`${grade}학년 담임`);
      tags.push(`${grade}학년 ${classNum}반 담임`);
    } else if (grade) {
      tags.push(`${grade}학년 담임`);
    }

    if (department) tags.push(department);
    if (subject) tags.push(subject.endsWith('과') ? subject : `${subject}과`);
    if (homeroomRole && homeroomRole.includes('부장')) tags.push('부장교사');

    committees.forEach((c) => {
      if (!tags.includes(c)) tags.push(c);
    });

    result.push({
      name,
      room,
      subject,
      department,
      grade,
      classNum,
      homeroomRole:
        homeroomRole || (grade && classNum ? `${grade}학년 ${classNum}반 담임` : undefined),
      duty,
      committees: committees.length > 0 ? committees : undefined,
      extension,
      notes,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: Date.now(),
    });
  }

  return result;
}
