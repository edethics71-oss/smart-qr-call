import React from 'react';
import {
  Bell,
  QrCode,
  Smartphone,
  BookOpen,
  Volume2,
  Database,
  CheckCircle2,
  Sparkles,
  School,
  Sun,
  Palette
} from 'lucide-react';
import { playAlertChime } from '../utils/audio';
import { isFirebaseConfigured } from '../lib/firebase';
import type { ThemeType } from '../types';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  theme: ThemeType;
  onToggleTheme: () => void;
  onOpenFirebaseGuide: () => void;
  onOpenQuickQr?: () => void;
  onOpenSimulator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  theme,
  onToggleTheme,
  onOpenFirebaseGuide,
  onOpenQuickQr,
  onOpenSimulator,
}) => {
  const isStudent = currentPath.startsWith('/student');
  const isLight = theme === 'vibrant-palette';

  return (
    <header
      id="app-navbar"
      className={`border-b transition-colors duration-200 sticky top-0 z-40 backdrop-blur-md ${
        isLight
          ? 'bg-white/90 border-indigo-100 text-slate-900 shadow-sm'
          : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-lg'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('/teacher')}
            className={`p-2.5 rounded-2xl flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
              isLight
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-200'
                : 'bg-indigo-600 text-white shadow-indigo-950'
            }`}
          >
            <School className="w-5 h-5" />
          </button>
          <div>
            <div
              onClick={() => onNavigate('/teacher')}
              className="cursor-pointer font-black text-lg tracking-tight flex items-center gap-2"
            >
              <span className={isLight ? 'text-slate-900' : 'text-white'}>
                담임 업무 지원
              </span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200/80'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}
              >
                EduPass
              </span>
            </div>
            <p
              className={`text-xs hidden sm:block ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              학생 호출 · 전달사항 · 출결 관리 · 업무 쪽지 지원 포털
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Quick Sound Test */}
          <button
            id="nav-audio-test-btn"
            title="호출 알림 벨소리 테스트"
            onClick={() => playAlertChime()}
            className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Theme switcher */}
          <button
            id="nav-theme-toggle-btn"
            title={`테마 전환 (현재: ${
              isLight ? '비비드 팔레트 (라이트)' : '다크 바이런트'
            })`}
            onClick={onToggleTheme}
            className={`p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-100'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-500" />
          </button>

          {/* Firebase Status & Guide Trigger */}
          <button
            id="nav-firebase-guide-btn"
            onClick={onOpenFirebaseGuide}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              isFirebaseConfigured
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
                : isLight
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse shadow-sm'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900 animate-pulse'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isFirebaseConfigured ? 'Firebase 연결됨' : 'Firebase 가이드 (.env)'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
