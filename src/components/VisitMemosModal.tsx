import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  Search,
  Clock,
  User,
  Building2,
  Trash2,
  Phone,
  CheckCircle2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { Call, ThemeType } from '../types';

interface VisitMemosModalProps {
  theme: ThemeType;
  calls: Call[];
  onClose: () => void;
  onQuickCallStudent?: (studentName: string) => void;
}

export const VisitMemosModal: React.FC<VisitMemosModalProps> = ({
  theme,
  calls,
  onClose,
  onQuickCallStudent,
}) => {
  const isLight = theme === 'vibrant-palette';
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('ALL');

  // Filter only calls that have visit memos
  const memoCalls = useMemo(() => {
    return calls.filter((c) => c.hasMemo && (c.memoContent || c.reason));
  }, [calls]);

  // Extract distinct rooms from memos
  const distinctRooms = useMemo(() => {
    const set = new Set<string>();
    memoCalls.forEach((m) => {
      if (m.room) set.add(m.room);
    });
    return Array.from(set);
  }, [memoCalls]);

  // Filtered memos
  const filteredMemos = useMemo(() => {
    return memoCalls.filter((m) => {
      if (roomFilter !== 'ALL' && m.room !== roomFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.studentName.toLowerCase().includes(q);
        const matchTeacher = m.teacherName.toLowerCase().includes(q);
        const matchContent = (m.memoContent || m.reason || '').toLowerCase().includes(q);
        if (!matchName && !matchTeacher && !matchContent) return false;
      }
      return true;
    });
  }, [memoCalls, roomFilter, searchQuery]);

  const handleDeleteMemo = async (id: string, name: string) => {
    if (window.confirm(`[${name}] 학생의 방문 메모를 삭제하시겠습니까?`)) {
      await dbService.deleteCall(id);
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-3xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight
            ? 'bg-white border-indigo-100 text-slate-900'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isLight ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-800 bg-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>학생 방문 메모 수신함</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                  총 {memoCalls.length}건
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                교무실 방문 시 부재중으로 학생이 남긴 용건 및 메모 목록입니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div
          className={`p-4 border-b flex flex-wrap gap-3 items-center justify-between text-xs ${
            isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/80 bg-slate-950/40'
          }`}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학생 이름, 선생님, 메모 내용 검색..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl border outline-none font-medium ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                  : 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Room filter */}
          <div className="flex items-center gap-2">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400 font-bold'}>교무실:</span>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border font-bold outline-none cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <option value="ALL">전체 교무실</option>
              {distinctRooms.map((r) => (
                <option key={r} value={r}>
                  📍 {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Memo List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredMemos.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold">남겨진 방문 메모가 없습니다.</p>
              <p className="text-xs text-slate-400">
                선생님이 부재중일 때 학생이 QR을 통해 메모를 남기면 이곳에 자동으로 쌓입니다.
              </p>
            </div>
          ) : (
            filteredMemos.map((memo) => (
              <div
                key={memo.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-indigo-100 hover:border-indigo-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600 shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-indigo-600 dark:text-emerald-400">
                      👤 {memo.studentName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                        isLight
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      🎯 {memo.teacherName} 선생님 앞
                    </span>
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{memo.room}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(memo.createdAt)} {formatTime(memo.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Memo Content */}
                <div
                  className={`p-3 rounded-xl text-xs font-medium leading-relaxed my-2.5 ${
                    isLight
                      ? 'bg-indigo-50/40 text-slate-800 border border-indigo-100/60'
                      : 'bg-slate-900/60 text-slate-200 border border-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{memo.memoContent || memo.reason}</p>
                </div>

                {/* Footer details & Action */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    {memo.studentContact && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span>연락처: {memo.studentContact}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onQuickCallStudent && (
                      <button
                        onClick={() => {
                          onQuickCallStudent(memo.studentName);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                      >
                        <span>📢 학생에게 지금 오라고 호출하기</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMemo(memo.id, memo.studentName)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="메모 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <span className="text-slate-400">
            💡 용건 확인 후 [학생에게 지금 오라고 호출하기]를 누르면 즉시 학생 호출 화면으로 연결됩니다.
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl font-bold border transition cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
            }`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
