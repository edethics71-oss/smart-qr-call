import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TeacherReceiverView } from './components/TeacherReceiverView';
import { TeacherManagementView } from './components/TeacherManagementView';
import { StudentMobileView } from './components/StudentMobileView';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import { PrintablePlacardModal } from './components/PrintablePlacardModal';
import { dbService } from './lib/firebase';
import {
  Bell,
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

export default function App() {
  // Helper to parse routing from current browser location
  const parseLocation = () => {
    if (typeof window === 'undefined') {
      return { path: '/teacher', params: new URLSearchParams() };
    }
    const pathname = window.location.pathname || '/teacher';
    const search = window.location.search;
    const hash = window.location.hash;

    // Check if path or hash or query specifies student
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

  // Teacher portal sub-view: 'receiver' | 'management'
  const [teacherSubTab, setTeacherSubTab] = useState<'receiver' | 'management'>('receiver');

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

  // Listen to browser popstate and hashchange (back/forward buttons or hash nav)
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

  // Determine current main view
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
      <Navbar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFirebaseGuide={() => setIsFirebaseGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isStudentView ? (
          /* ------------------------------------------------------------- */
          /* 2. STUDENT MOBILE VIEW (경로: /student)                      */
          /* ------------------------------------------------------------- */
          <StudentMobileView
            theme={theme}
            initialRoom={studentRoomParam}
            onNavigateToTeacher={() => handleNavigate('/teacher')}
          />
        ) : (
          /* ------------------------------------------------------------- */
          /* 1 & 3. TEACHER PORTAL SCREEN (경로: /teacher)                 */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            {/* Teacher Sub-tab Switcher Header */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b ${
                isLight ? 'border-indigo-100' : 'border-slate-800'
              }`}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className={isLight ? 'text-slate-900' : 'text-white'}>
                    교직원 전용 업무 포털
                  </span>
                </h1>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  교무실 앞 방문 학생 실시간 알림 수신 및 출입문 QR 명단을 관리합니다.
                </p>
              </div>

              {/* Two Primary Portal Tabs */}
              <div
                className={`flex items-center space-x-1.5 p-1.5 rounded-2xl border self-start sm:self-auto ${
                  isLight
                    ? 'bg-white border-indigo-100 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <button
                  id="tab-teacher-receiver-btn"
                  onClick={() => setTeacherSubTab('receiver')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    teacherSubTab === 'receiver'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>선생님 호출 수신하기</span>
                </button>

                <button
                  id="tab-teacher-management-btn"
                  onClick={() => setTeacherSubTab('management')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    teacherSubTab === 'management'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : isLight
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>명단 관리 및 QR 생성</span>
                </button>
              </div>
            </div>

            {/* Sub-view Rendering */}
            {teacherSubTab === 'receiver' ? (
              <TeacherReceiverView
                theme={theme}
                teachers={teachers}
                onOpenManagement={() => setTeacherSubTab('management')}
                onOpenPlacard={(room) => setPlacardRoom(room)}
              />
            ) : (
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
        <PrintablePlacardModal
          room={placardRoom}
          onClose={() => setPlacardRoom(null)}
        />
      )}

      {/* Firebase Setup & Deployment Guide Modal */}
      {isFirebaseGuideOpen && (
        <FirebaseGuideModal onClose={() => setIsFirebaseGuideOpen(false)} />
      )}
    </div>
  );
}
