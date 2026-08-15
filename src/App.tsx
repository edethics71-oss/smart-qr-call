import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TeacherReceiverView } from './components/TeacherReceiverView';
import { TeacherManagementView } from './components/TeacherManagementView';
import { TeacherToStudentDispatch } from './components/TeacherToStudentDispatch';
import { AttendanceManagementView } from './components/AttendanceManagementView';
import { TeacherWorkNotesView } from './components/TeacherWorkNotesView';
import { StudentMobileView } from './components/StudentMobileView';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import { PrintablePlacardModal } from './components/PrintablePlacardModal';
import { dbService } from './lib/firebase';
import {
  Bell,
  Send,
  UserCheck,
  Mail,
  QrCode,
  Smartphone,
  School,
  Settings,
  Users,
  Building2,
  Sparkles,
  Palette
} from 'lucide-react';
import type { Teacher, ThemeType } from './types';

export type TeacherPortalTab = 'receiver' | 'dispatch' | 'attendance' | 'worknotes' | 'management';

export default function App() {
  const parseLocation = () => {
    if (typeof window === 'undefined') {
      return { path: '/teacher', params: new URLSearchParams() };
    }
    const pathname = window.location.pathname || '/teacher';
    const search = window.location.search;
    const hash = window.location.hash;

    let effectivePath = pathname;
    let effectiveParams = new URLSearchParams(search);

    if (hash.startsWith('#/student') || hash.startsWith('#student')) {
      effectivePath = '/student';
      const hashQueryIndex = hash.indexOf('?');
      if (hashQueryIndex !== -1) {
        effectiveParams = new URLSearchParams(hash.substring(hashQueryIndex));
      }
    } else if (effectiveParams.get('view') === 'student') {
      effectivePath = '/student';
    }

    return { path: effectivePath, params: effectiveParams };
  };

  const initialLoc = parseLocation();
  const [currentPath, setCurrentPath] = useState<string>(initialLoc.path);
  const [searchParams, setSearchParams] = useState<URLSearchParams>(initialLoc.params);

  // Teacher portal sub-tabs
  const [teacherSubTab, setTeacherSubTab] = useState<TeacherPortalTab>('receiver');

  // Theme: 'vibrant-palette' | 'vibrant-dark'
  const [theme, setTheme] = useState<ThemeType>('vibrant-palette');

  // Teachers data
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Modals
  const [isFirebaseGuideOpen, setIsFirebaseGuideOpen] = useState<boolean>(false);
  const [placardRoom, setPlacardRoom] = useState<string | null>(null);

  // Subscribe to all teachers
  useEffect(() => {
    const unsubscribe = dbService.subscribeTeachers((list) => {
      setTeachers(list);
    });
    return () => unsubscribe();
  }, []);

  // Popstate / Hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const { path, params } = parseLocation();
      setCurrentPath(path);
      setSearchParams(params);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Navigation handler
  const handleNavigate = (path: string, search = '') => {
    const fullUrl = search ? `${path}?${search}` : path;
    window.history.pushState({}, '', fullUrl);
    setCurrentPath(path);
    setSearchParams(new URLSearchParams(search));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'vibrant-palette' ? 'vibrant-dark' : 'vibrant-palette'));
  };

  const isStudentView = currentPath.startsWith('/student');
  const studentRoomParam = searchParams.get('room') || '본관 1교무실';
  const isLight = theme === 'vibrant-palette';

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${
        isLight
          ? 'bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/50 text-slate-900'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Universal Navbar */}
      {!isStudentView && (
        <Navbar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className={isStudentView ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}>
        {isStudentView ? (
          /* ------------------------------------------------------------- */
          /* 1. STUDENT MOBILE VIEW (경로: /student) - 학생 전용 PWA        */
          /* ------------------------------------------------------------- */
          <StudentMobileView theme={theme} initialRoom={studentRoomParam} />
        ) : (
          /* ------------------------------------------------------------- */
          /* 2. TEACHER ALL-IN-ONE PORTAL SCREEN                           */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            {/* Teacher Sub-tab Switcher Header */}
            <div
              className={`flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b ${
                isLight ? 'border-indigo-100' : 'border-slate-800'
              }`}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className={isLight ? 'text-slate-900' : 'text-white'}>
                    스마트 교직원 종합 업무 포털
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-emerald-400">
                    EduPass Hub
                  </span>
                </h1>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  교무실 QR 호출 수신 • 학생 호출 및 공지 발송 • 아침 등교 출결 • 교직원 업무 쪽지 수합
                </p>
              </div>

              {/* 5 Primary Portal Tabs */}
              <div
                className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border self-start xl:self-auto ${
                  isLight
                    ? 'bg-white border-indigo-100 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <button
                  id="tab-teacher-receiver-btn"
                  onClick={() => setTeacherSubTab('receiver')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'receiver'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>문앞 호출 수신</span>
                </button>

                <button
                  id="tab-teacher-dispatch-btn"
                  onClick={() => setTeacherSubTab('dispatch')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'dispatch'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>학생 호출 & 전달사항</span>
                </button>

                <button
                  id="tab-teacher-attendance-btn"
                  onClick={() => setTeacherSubTab('attendance')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'attendance'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>등교 출결 관리</span>
                </button>

                <button
                  id="tab-teacher-worknotes-btn"
                  onClick={() => setTeacherSubTab('worknotes')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'worknotes'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>교직원 업무 쪽지 & 수합</span>
                </button>

                <button
                  id="tab-teacher-management-btn"
                  onClick={() => setTeacherSubTab('management')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherSubTab === 'management'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>명단·위원회 & QR</span>
                </button>
              </div>
            </div>

            {/* Sub-view Rendering */}
            {teacherSubTab === 'receiver' && (
              <TeacherReceiverView
                theme={theme}
                teachers={teachers}
                onOpenManagement={() => setTeacherSubTab('management')}
                onOpenPlacard={(room) => setPlacardRoom(room)}
                onQuickCallStudent={() => setTeacherSubTab('dispatch')}
              />
            )}

            {teacherSubTab === 'dispatch' && (
              <TeacherToStudentDispatch theme={theme} teachers={teachers} />
            )}

            {teacherSubTab === 'attendance' && (
              <AttendanceManagementView theme={theme} />
            )}

            {teacherSubTab === 'worknotes' && (
              <TeacherWorkNotesView theme={theme} teachers={teachers} />
            )}

            {teacherSubTab === 'management' && (
              <TeacherManagementView
                theme={theme}
                teachers={teachers}
                onOpenPlacard={(room) => setPlacardRoom(room)}
                onNavigateToStudentView={(room) =>
                  handleNavigate('/student', `room=${encodeURIComponent(room)}`)
                }
              />
            )}
          </div>
        )}
      </main>

      {/* Printable Door Placard Modal */}
      {placardRoom && (
        <PrintablePlacardModal room={placardRoom} onClose={() => setPlacardRoom(null)} />
      )}

      {/* Firebase Setup & Deployment Guide Modal */}
      {isFirebaseGuideOpen && (
        <FirebaseGuideModal onClose={() => setIsFirebaseGuideOpen(false)} />
      )}
    </div>
  );
}
