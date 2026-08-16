import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wifi,
  MapPin,
  Download,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  UserCheck,
  Building2,
  Users,
  UserPlus
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { StudentAttendance, StudentRecord, ThemeType } from '../types';

interface AttendanceManagementViewProps {
  theme: ThemeType;
  onNavigateToRoster?: () => void;
}

export const AttendanceManagementView: React.FC<AttendanceManagementViewProps> = ({
  theme,
  onNavigateToRoster,
}) => {
  const isLight = theme === 'vibrant-palette';

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<number>(3);
  const [searchName, setSearchName] = useState<string>('');

  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [rosterStudents, setRosterStudents] = useState<StudentRecord[]>([]);
  const [toastMsg, setToastMsg] = useState('');

  // Subscribe to registered student roster
  useEffect(() => {
    const unsubRoster = dbService.subscribeStudents(
      (list) => {
        setRosterStudents(list);
      },
      selectedGrade,
      selectedClass
    );
    return () => unsubRoster();
  }, [selectedGrade, selectedClass]);

  // Subscribe to attendance records
  useEffect(() => {
    const unsubscribe = dbService.subscribeAttendance(
      (list) => {
        setRecords(list);
      },
      selectedDate,
      selectedGrade,
      selectedClass
    );
    return () => unsubscribe();
  }, [selectedDate, selectedGrade, selectedClass]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Combine registered roster with recorded attendance
  const studentRows = useMemo(() => {
    // If registered students exist for this class, use them; otherwise fallback to 25 placeholder seats
    let baseList = rosterStudents;
    if (baseList.length === 0) {
      baseList = Array.from({ length: 25 }, (_, i) => ({
        id: `temp-${i + 1}`,
        grade: selectedGrade,
        classNum: selectedClass,
        studentNumber: i + 1,
        name: `학생${i + 1}`,
      }));
    }

    return baseList.map((std) => {
      const key = `${selectedGrade}-${selectedClass}-${std.studentNumber}-${std.name}`;
      const rec = records.find(
        (r) =>
          r.grade === selectedGrade &&
          r.classNum === selectedClass &&
          (r.studentNumber === std.studentNumber || r.studentName === std.name)
      );

      return {
        grade: selectedGrade,
        classNum: selectedClass,
        number: std.studentNumber,
        name: std.name,
        studentKey: key,
        recordId: rec?.id,
        status: rec?.status || ('absent' as const),
        checkInTime: rec?.checkInTime,
        method: rec?.method,
        note: rec?.note,
        isRegistered: !std.id.startsWith('temp-'),
      };
    });
  }, [rosterStudents, records, selectedGrade, selectedClass]);

  // Filter by search
  const filteredStudents = useMemo(() => {
    if (!searchName.trim()) return studentRows;
    const q = searchName.toLowerCase();
    return studentRows.filter(
      (s) => s.name.toLowerCase().includes(q) || s.number.toString() === q
    );
  }, [studentRows, searchName]);

  // Statistics
  const stats = useMemo(() => {
    const total = studentRows.length;
    const present = studentRows.filter((s) => s.status === 'present').length;
    const late = studentRows.filter((s) => s.status === 'late').length;
    const excused = studentRows.filter((s) => s.status === 'excused').length;
    const unverified = studentRows.filter((s) => s.status === 'absent').length;
    const rate = Math.round(((present + late + excused) / (total || 1)) * 100);
    return { total, present, late, excused, unverified, rate };
  }, [studentRows]);

  // Change student status
  const handleStatusChange = async (
    student: (typeof studentRows)[0],
    newStatus: StudentAttendance['status']
  ) => {
    if (student.recordId) {
      await dbService.updateAttendanceStatus(student.recordId, newStatus);
    } else {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      await dbService.recordAttendance({
        studentKey: student.studentKey,
        grade: student.grade,
        classNum: student.classNum,
        studentNumber: student.number,
        studentName: student.name,
        date: selectedDate,
        checkInTime: timeStr,
        status: newStatus,
        method: 'manual',
      });
    }
    showToast(`[${student.number}번 ${student.name}] 출결 상태가 변경되었습니다.`);
  };

  // Change student note
  const handleNoteChange = async (student: (typeof studentRows)[0], note: string) => {
    if (student.recordId) {
      await dbService.updateAttendanceStatus(student.recordId, student.status, note);
    }
  };

  // One-click Mark All Present
  const handleMarkAllPresent = async () => {
    if (
      !window.confirm(
        `[${selectedGrade}학년 ${selectedClass}반] 전체 학생(${studentRows.length}명)을 '출석'으로 일괄 처리하시겠습니까?`
      )
    ) {
      return;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;

    for (const std of studentRows) {
      if (std.status === 'absent') {
        await dbService.recordAttendance({
          studentKey: std.studentKey,
          grade: std.grade,
          classNum: std.classNum,
          studentNumber: std.number,
          studentName: std.name,
          date: selectedDate,
          checkInTime: timeStr,
          status: 'present',
          method: 'manual',
          note: '담임 일괄 출석 처리',
        });
      }
    }
    showToast('전원 출석 처리가 완료되었습니다.');
  };

  // Download Excel / CSV (NEIS friendly format)
  const handleDownloadExcel = () => {
    let csv = `날짜,학년,반,번호,이름,출결상태,등교시각,인증방식,비고\n`;
    studentRows.forEach((s) => {
      const statusMap = {
        present: '출석',
        late: '지각',
        excused: '인정결석',
        absent: '미인증(결석)',
      };
      csv += `${selectedDate},${s.grade},${s.classNum},${s.number},${s.name},${
        statusMap[s.status]
      },${s.checkInTime || '-'},${s.method || '-'},"${s.note || ''}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출결_${selectedDate}_${selectedGrade}학년${selectedClass}반.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('나이스 연계용 엑셀(CSV) 다운로드가 시작되었습니다.');
  };

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
            <span>📋 아침 등교 및 교실 출결 관리</span>
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            학생 스마트폰 Wi-Fi / GPS 원터치 출석체크 현황을 실시간 확인하고 나이스(NEIS) 양식으로 다운로드합니다.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToRoster && (
            <button
              onClick={onNavigateToRoster}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>학생 명렬 등록·관리</span>
            </button>
          )}
          <button
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>전원 출석 일괄 처리</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>나이스(NEIS) 엑셀 다운로드</span>
          </button>
        </div>
      </div>

      {/* Selector & Filter Bar */}
      <div
        className={`p-4 rounded-3xl border flex flex-wrap gap-4 items-center justify-between transition ${
          isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border font-black outline-none ${
                isLight ? 'bg-indigo-50/40 border-indigo-200 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            />
          </div>

          {/* Grade Picker */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500">학년:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className={`px-3 py-1.5 rounded-xl border font-black outline-none ${
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

          {/* Class Picker */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500">학급:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
              className={`px-3 py-1.5 rounded-xl border font-black outline-none ${
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

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="학생 이름 또는 번호 검색..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium outline-none ${
              isLight ? 'bg-indigo-50/20 border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
            }`}
          />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-2xl border ${
            isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span>학급 총원</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {stats.total}명
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">등교율: {stats.rate}%</div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isLight ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-emerald-950/20 border-emerald-800 text-emerald-100'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span>정상 등교 완료</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.present}명
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">08:40 이전 인증</div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isLight ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-800 text-amber-100'
          }`}
        >
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>지각 / 인정결석</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {stats.late + stats.excused}명
          </div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">
            지각 {stats.late}명 / 인정 {stats.excused}명
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${
            isLight ? 'bg-rose-50/60 border-rose-200 text-rose-950' : 'bg-rose-950/20 border-rose-800 text-rose-100'
          }`}
        >
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between">
            <span>미인증 (결석 의심)</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
            {stats.unverified}명
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">미확인 학생</div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div
        className={`rounded-3xl border overflow-hidden transition-all ${
          isLight ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-800 bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base">
              [{selectedGrade}학년 {selectedClass}반] 학생 출결 명렬표
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400">
              {filteredStudents.length}명
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <th className="p-3.5 font-bold w-16 text-center">번호</th>
                <th className="p-3.5 font-bold w-28">성함</th>
                <th className="p-3.5 font-bold w-36">출결 상태</th>
                <th className="p-3.5 font-bold w-28">인증 시각</th>
                <th className="p-3.5 font-bold w-32">체크 방식</th>
                <th className="p-3.5 font-bold">비고 및 사유 입력</th>
                <th className="p-3.5 font-bold text-center w-48">상태 즉시 변경</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800'}`}>
              {filteredStudents.map((std) => (
                <tr
                  key={std.number}
                  className={`transition ${
                    isLight ? 'hover:bg-indigo-50/30' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="p-3.5 text-center font-bold text-slate-400">{std.number}</td>
                  <td className="p-3.5 font-black text-sm">{std.name}</td>
                  <td className="p-3.5">
                    {std.status === 'present' && (
                      <span className="px-2.5 py-1 rounded-lg font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3" />
                        <span>출석 완료</span>
                      </span>
                    )}
                    {std.status === 'late' && (
                      <span className="px-2.5 py-1 rounded-lg font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        <span>지각</span>
                      </span>
                    )}
                    {std.status === 'excused' && (
                      <span className="px-2.5 py-1 rounded-lg font-black bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1 w-fit">
                        <Sparkles className="w-3 h-3" />
                        <span>인정결석</span>
                      </span>
                    )}
                    {std.status === 'absent' && (
                      <span className="px-2.5 py-1 rounded-lg font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3" />
                        <span>미인증</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-slate-500 font-bold">
                    {std.checkInTime || '-'}
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {std.method === 'wifi' && (
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        <Wifi className="w-3 h-3" />
                        <span>학교 Wi-Fi</span>
                      </span>
                    )}
                    {std.method === 'gps' && (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <MapPin className="w-3 h-3" />
                        <span>교내 GPS</span>
                      </span>
                    )}
                    {std.method === 'manual' && (
                      <span className="text-slate-400 font-bold">선생님 수동</span>
                    )}
                    {!std.method && <span className="text-slate-300">-</span>}
                  </td>
                  <td className="p-3.5">
                    <input
                      type="text"
                      defaultValue={std.note || ''}
                      onBlur={(e) => handleNoteChange(std, e.target.value)}
                      placeholder="사유(보건실, 병원진료 등)..."
                      className={`w-full px-2.5 py-1 rounded-lg border text-xs outline-none ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStatusChange(std, 'present')}
                        className={`px-2 py-1 rounded-lg font-bold border text-[11px] transition cursor-pointer ${
                          std.status === 'present'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        출석
                      </button>
                      <button
                        onClick={() => handleStatusChange(std, 'late')}
                        className={`px-2 py-1 rounded-lg font-bold border text-[11px] transition cursor-pointer ${
                          std.status === 'late'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-50 hover:bg-amber-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        지각
                      </button>
                      <button
                        onClick={() => handleStatusChange(std, 'excused')}
                        className={`px-2 py-1 rounded-lg font-bold border text-[11px] transition cursor-pointer ${
                          std.status === 'excused'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 hover:bg-purple-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        인정
                      </button>
                      <button
                        onClick={() => handleStatusChange(std, 'absent')}
                        className={`px-2 py-1 rounded-lg font-bold border text-[11px] transition cursor-pointer ${
                          std.status === 'absent'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 hover:bg-rose-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        결석
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
