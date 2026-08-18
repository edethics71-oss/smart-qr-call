import React, { useState } from 'react';
import {
  RefreshCw,
  X,
  AlertTriangle,
  Users,
  GraduationCap,
  Bell,
  CheckCircle2,
  Trash2,
  Sparkles
} from 'lucide-react';
import { dbService } from '../lib/firebase';
import type { ThemeType } from '../types';

interface CleanSlateResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeType;
  onSuccessToast: (msg: string) => void;
}

export const CleanSlateResetModal: React.FC<CleanSlateResetModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSuccessToast,
}) => {
  const isLight = theme === 'vibrant-palette';
  const [resetOption, setResetOption] = useState<'all' | 'students_only'>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    setIsProcessing(true);
    try {
      const keepTeachers = resetOption === 'students_only';
      await dbService.resetCleanSlate(keepTeachers);
      onSuccessToast(
        keepTeachers
          ? '🧹 학생 명렬과 호출·출결 데이터가 원점으로 초기화되었습니다 (선생님 명단 유지).'
          : '✨ 교직원 및 학생 명렬, 호출·출결 데이터 전체가 원점(0명)으로 깨끗하게 초기화되었습니다!'
      );
      onClose();
    } catch (err) {
      console.error(err);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                새 학년도 / 원점 데이터 초기화 설정
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                배포 앱에서 가짜·샘플 데이터를 모두 비우고 실제 학교 데이터를 새로 셋팅합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="my-5 space-y-3">
          <div
            onClick={() => setResetOption('all')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
              resetOption === 'all'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                : isLight
                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
            }`}
          >
            <input
              type="radio"
              name="resetOption"
              checked={resetOption === 'all'}
              onChange={() => setResetOption('all')}
              className="mt-1 accent-indigo-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  전체 원점 초기화 (클린 셋팅 추천)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-indigo-600 text-white">
                  새 학교 시작
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                샘플 교직원, 학생 명렬표, 방문 호출, 전달사항, 출결 기록 전체를 <strong>0건(완전한 백지 상태)</strong>으로 비웁니다. 선생님 명단부터 엑셀로 깔끔하게 등록할 수 있습니다.
              </p>
            </div>
          </div>

          <div
            onClick={() => setResetOption('students_only')}
            className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
              resetOption === 'students_only'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                : isLight
                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
            }`}
          >
            <input
              type="radio"
              name="resetOption"
              checked={resetOption === 'students_only'}
              onChange={() => setResetOption('students_only')}
              className="mt-1 accent-indigo-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  학생 명렬 및 호출 기록만 초기화
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  교직원 유지
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                현재 등록된 교직원(선생님) 정보는 그대로 남겨두고, 학생 명렬표와 호출·출결 기록만 깨끗이 비웁니다.
              </p>
            </div>
          </div>
        </div>

        {/* Notice Box */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            초기화 후에는 <strong>[교직원 명단]</strong> 탭과 <strong>[학적 학생 명렬]</strong> 탭에서 우리 학교 실제 엑셀 파일을 드래그하여 바로 등록하실 수 있습니다.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            취소
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecuteReset}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isProcessing ? '초기화 진행 중...' : '선택한 항목 원점 초기화 실행'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
