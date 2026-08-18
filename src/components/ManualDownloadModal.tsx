import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  Copy,
  Check,
  X,
  FileText,
  Building2,
  Users,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import type { ThemeType } from '../types';

interface ManualDownloadModalProps {
  onClose: () => void;
  theme?: ThemeType;
}

export const MANUAL_TEXT_CONTENT = `# 🏫 스마트 학교 교무·학생 소통 시스템 종합 활용 매뉴얼

=======================================================
📌 [기본 접속 정보]
- 웹 접속 주소 (URL): https://smart-qr-call.vercel.app
- 지원 기기: 교단 선진화 PC, 교사 개인 노트북/태블릿, 학생 스마트폰 (별도 앱 설치 없이 링크 클릭 및 QR 스캔으로 즉시 실행)
=======================================================

-------------------------------------------------------
PART 1. 운영 시나리오별 관리자 가이드
-------------------------------------------------------

[시나리오 1] 한 부서(예: 1학년부)만 시범 도입할 경우
- 흐름: 1학년 부장/대표 교사 -> 1학년 담임 교사들 -> 1학년 학생들
1. 대표 교사 준비 단계:
   가. [교직원 명단 & 위원회·교과] 탭 -> [엑셀 / 텍스트 일괄 등록]으로 1학년부 소속 교사 명단 일괄 등록
   나. [교무실 방문 호출] 탭 -> [🚪 교무실 문 부착용 QR 생성·인쇄] 클릭 후 '1학년 교무실' A4 안내판 출력하여 출입문 부착
   다. URL(https://smart-qr-call.vercel.app)을 1학년 담임 교사 단톡방/메신저로 배부
2. 담임교사 단계:
   - 전달받은 링크 접속 -> [학생 명렬 현황] 탭 -> [엑셀 / 텍스트 일괄 등록]으로 담당 학급(1~7반) 명단 등록

[시나리오 2] 학교 전체(전교)가 전면 도입할 경우
- 흐름: 총괄 관리자(정보부/교무부) -> 각 부서·학년부·교과협의회 -> 전교 담임 및 학생
1. 총괄 관리자 단계:
   가. [교직원 명단 & 위원회·교과] 탭 -> 전교원 성명, 부서, 위원회, 담당 교과 일괄 등록
   나. 각 건물/교무실(본관 1·2교무실, 학년 교무실, 특별실 등) 출입문 QR 안내판 일괄 출력 및 부착
2. 부서 및 교과 교사 단계:
   - [교직원 명단 & 위원회·교과] 탭에서 본인 정보(소속 위원회, 업무, 내선번호, 자리배치) 확인 및 수정

[시나리오 3] 지필평가 / 시험 출제 기간 출입 통제 모드
1. 상태 변경:
   - 교사는 [교무실 방문 호출] 상단에서 상태를 [🚫 시험 출제중(출입금지)] 또는 [집중업무중]으로 원클릭 설정
2. 학생 안내 및 비대면 호출:
   - 교무실 문을 닫고, 문앞 부착 QR코드를 스캔하여 "선생님 성함"과 "용건"을 비대면 접수
3. 교사 응대:
   - PC 화면에 맑은 차임벨과 함께 방문 요청 팝업 수신 -> [복도로 나가기] / [방문 승인] / [비대면 메모 답변] 선택 처리

-------------------------------------------------------
PART 2. 담임교사 실무 매뉴얼
-------------------------------------------------------

1. 학급 학생 명렬 등록 (학기 초 1회)
   - [학생 명렬 현황] 탭 -> [엑셀 / 텍스트 일괄 등록] -> 나이스/엑셀 명단 복사·붙여넣기 후 등록 (1~7반 지원)

2. 아침 출결 관리 (매일 아침 조회 시간)
   - [등교 출결 관리] 탭 -> 담당 학급 선택 -> 결석/지각/조퇴/인정결 사유 입력 -> [출결 현황 엑셀 다운로드]로 보관/나이스 입력

3. 학생 실시간 호출 및 알림장 전달
   - [학생 호출 & 전달사항] 탭 -> 대상 학생 선택 후 호출 장소 및 사유 입력하여 전송
   - 학생 화면에 실시간 팝업/진동 알림 -> 학생 [확인했습니다] 클릭 시 교사 화면에 '확인 완료' 갱신
   - [전체 공지 발송]으로 내일 준비물/가정통신문 공지 게재

4. 교직원 쪽지 및 설문 수합
   - [교직원 업무 쪽지 & 수합] 탭 -> 교사/부서/위원회 선택 후 업무 쪽지 및 의견 수합

-------------------------------------------------------
PART 3. 학생용 이용 매뉴얼 (가정통신문 / 학급 안내용)
-------------------------------------------------------

1. 학생 최초 등록 (1분 완료)
   - 링크(https://smart-qr-call.vercel.app) 접속 -> [학생 모바일 뷰] 선택
   - 학년(1~3학년) / 반(1~7반) / 번호 / 이름 입력 후 [로그인 / 등록]
   - (권장) 브라우저 [홈 화면에 추가]로 앱처럼 사용

2. 선생님 호출 및 공지사항 확인
   - 호출 수신 시 화면에 팝업 알림 표시 -> [확인했습니다] 버튼 터치
   - 메인 화면에서 담임선생님이 등록하신 오늘의 알림장/준비물 확인

3. 교무실 방문 시 QR 코드 호출 방법
   - 교무실 출입문 앞 [QR 안내판] 카메라로 스캔
   - 찾아뵐 선생님 성함 선택 -> 방문 목적(질문/과제/상담 등) 선택 후 [선생님 호출하기] 터치
   - 문밖에서 잠시 대기

-------------------------------------------------------
💡 자주 묻는 질문 (FAQ)
-------------------------------------------------------
Q. 학생들에게 별도 앱 설치가 필요한가요?
A. 웹 표준(PWA) 기반이므로 앱 설치 없이 링크 클릭 및 QR 스캔으로 즉시 작동합니다.

Q. 전출입 학생이나 명단 수정은 어떻게 하나요?
A. [학생 명렬 현황] 탭에서 언제든 학생 추가, 수정, 삭제가 가능합니다.
`;

export const ManualDownloadModal: React.FC<ManualDownloadModalProps> = ({
  onClose,
  theme = 'vibrant-palette',
}) => {
  const isLight = theme === 'vibrant-palette';
  const [activeTab, setActiveTab] = useState<'all' | 'scenario1' | 'scenario2' | 'scenario3' | 'teacher' | 'student'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  // Download as text file (.txt)
  const handleDownloadTxt = () => {
    const blob = new Blob([MANUAL_TEXT_CONTENT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `학교_스마트_교무_학생_소통시스템_활용매뉴얼.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download as markdown file (.md)
  const handleDownloadMd = () => {
    const blob = new Blob([MANUAL_TEXT_CONTENT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `학교_스마트_교무_학생_소통시스템_활용매뉴얼.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy full manual to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(MANUAL_TEXT_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className={`w-full max-w-4xl rounded-3xl p-5 sm:p-7 shadow-2xl border transition-all my-auto max-h-[92vh] flex flex-col ${
          isLight ? 'bg-white border-indigo-100 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
        }`}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">시스템 종합 활용 매뉴얼</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
                  v2.0 최신판
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                운영 시나리오(1개 부서 시범 vs 전교 도입), 시험기간 통제, 담임교사 실무 및 학생 안내 가이드
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick Action Download Buttons */}
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="텍스트 파일(.txt)로 내 컴퓨터에 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.txt 다운로드</span>
            </button>

            <button
              onClick={handleDownloadMd}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="마크다운 문서(.md)로 다운로드"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>.md 다운로드</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="A4 규격으로 바로 인쇄 또는 PDF 저장"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">인쇄/PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-100 dark:border-slate-800 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📋 전체 매뉴얼 보기
          </button>
          <button
            onClick={() => setActiveTab('scenario1')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'scenario1'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏢 시나리오 1 (1개 부서 시범도입)
          </button>
          <button
            onClick={() => setActiveTab('scenario2')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'scenario2'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🌐 시나리오 2 (학교 전체 전면도입)
          </button>
          <button
            onClick={() => setActiveTab('scenario3')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'scenario3'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🚫 시나리오 3 (시험 출제기간 통제)
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'teacher'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🧑‍🏫 담임교사용 실무
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isLight ? 'bg-slate-100 text-slate-600 hover:bg-indigo-50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📱 학생용 안내
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6 text-sm">
          {/* Quick URL Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[11px] font-black">URL</span>
              <span className="font-mono text-xs font-bold text-indigo-900 dark:text-indigo-200">
                https://smart-qr-call.vercel.app
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 transition flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '매뉴얼 복사완료!' : '매뉴얼 전문 복사'}</span>
              </button>
            </div>
          </div>

          {/* Section: Scenario 1 */}
          {(activeTab === 'all' || activeTab === 'scenario1') && (
            <div className="p-4 rounded-2xl border bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                <Building2 className="w-5 h-5" />
                <h3>[시나리오 1] 한 개 부서(예: 1학년부)만 시범 도입할 경우</h3>
              </div>
              <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">
                  1. 대표 교사(1학년 부장님)의 준비 단계:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>상단 <strong>[교직원 명단 & 위원회·교과]</strong> 탭 클릭 ➔ <strong>[엑셀 / 텍스트 일괄 등록]</strong>으로 1학년부 선생님 명단을 등록합니다.</li>
                  <li><strong>[교무실 방문 호출]</strong> 탭 ➔ <strong>[🚪 교무실 문 부착용 QR 생성·인쇄]</strong> 클릭 후 <span className="font-bold text-indigo-600">[1학년 교무실]</span> A4 안내판을 출력하여 출입문에 부착합니다.</li>
                  <li>웹 주소(<code className="bg-indigo-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">https://smart-qr-call.vercel.app</code>)를 1학년 담임 선생님 단톡방에 공유합니다.</li>
                </ul>
                <p className="font-bold text-slate-900 dark:text-white pt-1">
                  2. 각 학급 담임 선생님 단계:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>전달받은 링크 접속 ➔ <strong>[학생 명렬 현황]</strong> 탭 ➔ <strong>[엑셀 / 텍스트 일괄 등록]</strong>으로 담당 학급(1~7반) 명단을 등록합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Section: Scenario 2 */}
          {(activeTab === 'all' || activeTab === 'scenario2') && (
            <div className="p-4 rounded-2xl border bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-base">
                <Users className="w-5 h-5" />
                <h3>[시나리오 2] 학교 전체(전교)가 전면 도입할 경우</h3>
              </div>
              <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">
                  1. 총괄 관리자(정보부/교무부)의 단계:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li><strong>[교직원 명단 & 위원회·교과]</strong> 탭에서 전교원의 성명, 소속 부서, 위원회, 담당 교과를 엑셀로 일괄 등록합니다.</li>
                  <li>본관 1·2교무실, 신관, 학년 교무실, 특별실(상담실, 체육관 등)의 출입문 부착용 QR 안내판을 일괄 출력하여 부착합니다.</li>
                </ul>
                <p className="font-bold text-slate-900 dark:text-white pt-1">
                  2. 각 부서 및 교과 교사 단계:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>선생님들은 명단 탭에서 본인 정보(소속 위원회, 업무, 자리 번호, 내선번호)를 확인하고 최신 상태로 유지합니다.</li>
                  <li>부서별/위원회별 공지 및 의견 수합 시 <strong>[교직원 업무 쪽지 & 수합]</strong> 기능을 활용합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Section: Scenario 3 */}
          {(activeTab === 'all' || activeTab === 'scenario3') && (
            <div className="p-4 rounded-2xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <h3>[시나리오 3] 지필평가 / 시험 출제 기간 출입 통제 모드</h3>
              </div>
              <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white">
                  시험 출제 및 인쇄 기간 학생들의 무단 교무실 출입 방지 & 비대면 호출:
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li><strong>상태 설정:</strong> 교무실 화면 상단에서 본인 상태를 <span className="font-bold text-rose-600">[🚫 시험 출제중(출입금지)]</span>으로 원클릭 전환합니다.</li>
                  <li><strong>비대면 요청 접수:</strong> 교무실 문을 닫고, 학생들은 문앞 부착 QR코드를 스캔하여 "선생님 성함"과 "방문 목적"을 남깁니다.</li>
                  <li><strong>알림 및 응대:</strong> 선생님 PC에 맑은 차임벨과 함께 팝업이 뜨며, [복도로 나가기] 또는 [비대면 메모 회신]으로 안전하게 응대합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Section: Teacher Manual */}
          {(activeTab === 'all' || activeTab === 'teacher') && (
            <div className="p-4 rounded-2xl border bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-base">
                <GraduationCap className="w-5 h-5" />
                <h3>🧑‍🏫 담임교사 실무 매뉴얼</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">1. 학급 명렬 등록 (학기초 1회)</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    [학생 명렬 현황] ➔ [엑셀/텍스트 일괄 등록]에서 나이스 명단을 붙여넣으면 1~7반 전체 학생이 즉시 등록됩니다.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">2. 아침 등교 출결 관리</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    [등교 출결 관리] ➔ 학급 선택 ➔ 미출석자 상태(결석/지각/조퇴 등)와 사유 입력 ➔ [엑셀 다운로드]로 나이스 입력 보고서 보관.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">3. 학생 실시간 호출 & 알림장</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    [학생 호출 & 전달사항] ➔ 학생 선택 후 호출 장소 전송 ➔ 학생 수신 시 '확인 완료' 자동 체크. 전체 공지 발송 가능.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">4. 교직원 쪽지 & 업무 수합</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    [교직원 업무 쪽지 & 수합] ➔ 교사/부서/위원회 선택 후 긴급 연락 및 설문·의견 수합 기능 제공.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Student Manual */}
          {(activeTab === 'all' || activeTab === 'student') && (
            <div className="p-4 rounded-2xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-base">
                <Sparkles className="w-5 h-5" />
                <h3>📱 학생용 이용 매뉴얼 (가정통신문 / 안내용)</h3>
              </div>
              <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li><strong>학생 최초 등록:</strong> 링크 접속 ➔ [학생 모바일 뷰] ➔ 학년/반(1~7반)/번호/이름 입력 후 로그인. (브라우저에서 '홈 화면에 추가' 추천)</li>
                  <li><strong>선생님 호출 알림:</strong> 선생님이 호출하시면 화면에 알림창이 뜨며, 확인 후 <span className="font-bold text-emerald-600">[확인했습니다]</span> 버튼을 누릅니다.</li>
                  <li><strong>교무실 방문 시:</strong> 출입문 QR 안내판을 카메라로 스캔 ➔ 선생님 성함 터치 ➔ 방문 목적 선택 후 호출을 요청합니다.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            * 텍스트 파일(.txt) 또는 마크다운(.md)으로 다운로드하여 선생님들께 바로 메신저로 전송하실 수 있습니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTxt}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>📥 매뉴얼 파일 다운로드 (.txt)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
