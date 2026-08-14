import React, { useState } from 'react';
import {
  X,
  Database,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Code,
  Globe,
  GitBranch,
  Rocket,
  Info
} from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';

interface FirebaseGuideModalProps {
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ onClose }) => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const envSnippet = `# .env.local (프로젝트 루트에 생성)
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"`;

  const rulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 교무실 스마트 방문 접수 보안 규칙
    // 학생의 비로그인 호출 및 메모 생성을 허용하고, 무단 삭제는 차단합니다.
    match /{document=**} {
      allow read, create, update: if true;
      allow delete: if false;
    }
  }
}`;

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Firebase 설정 & 배포 가이드</h2>
              <p className="text-xs text-slate-400">
                코딩이 처음이신 선생님도 5분만에 클라우드 데이터베이스를 연결할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Indicator */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            isFirebaseConfigured
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {isFirebaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Info className="w-5 h-5 text-amber-400" />
            )}
            <span>
              {isFirebaseConfigured
                ? '현재 Firebase Cloud Firestore와 성공적으로 연결되어 실시간 작동 중입니다!'
                : '현재 [로컬 동기화 모드]로 작동 중입니다. 실시간 클라우드 DB 연결을 위해 아래 1~3단계를 진행해주세요.'}
            </span>
          </div>
        </div>

        {/* Step 1: Firebase Project Creation */}
        <div className="space-y-3 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center gap-2 font-bold text-base text-indigo-400">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
              1
            </span>
            <span>Firebase 무료 프로젝트 생성</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            1.{' '}
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline inline-flex items-center gap-1 font-bold"
            >
              Firebase 콘솔 <ExternalLink className="w-3 h-3" />
            </a>
            에 구글 계정으로 로그인 후 <strong>[프로젝트 추가]</strong>를 누릅니다.
            <br />
            2. 좌측 메뉴에서 <strong>[빌드] → [Firestore Database]</strong>를 선택하고 [데이터베이스 만들기]를 클릭합니다.
          </p>
        </div>

        {/* Step 2: Firestore Security Rules */}
        <div className="space-y-3 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-indigo-400">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <span>Firestore 보안 규칙(Rules) 복사 및 적용</span>
            </div>
            <button
              onClick={() => copyToClipboard(rulesSnippet, setCopiedRules)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRules ? '복사됨!' : '규칙 복사'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            Firestore의 <strong>[규칙(Rules)]</strong> 탭에 아래 보안 규칙을 붙여넣고 [게시(Publish)]를 누릅니다:
          </p>
          <pre className="bg-slate-950 p-3 rounded-xl text-xs font-mono text-emerald-300 border border-slate-800 overflow-x-auto">
            {rulesSnippet}
          </pre>
        </div>

        {/* Step 3: Environment Variables */}
        <div className="space-y-3 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-indigo-400">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <span>환경변수 (.env.local) 등록</span>
            </div>
            <button
              onClick={() => copyToClipboard(envSnippet, setCopiedEnv)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? '복사됨!' : '환경변수 복사'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed pl-8">
            Firebase 프로젝트 설정(⚙️)의 [내 앱]에서 웹 앱(<code>&lt;/&gt;</code>)을 등록하고 나온 6개 키를
            프로젝트 루트의 <code>.env.local</code>에 추가합니다:
          </p>
          <pre className="bg-slate-950 p-3 rounded-xl text-xs font-mono text-slate-200 border border-slate-800 overflow-x-auto">
            {envSnippet}
          </pre>
        </div>

        {/* Step 4: Vercel & GitHub Deployment */}
        <div className="space-y-3 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="flex items-center gap-2 font-bold text-base text-indigo-400">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
              4
            </span>
            <span>GitHub 커밋 및 Vercel 자동 배포</span>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed pl-8 space-y-1">
            <p>1. 코드를 GitHub 저장소에 Push합니다.</p>
            <p>2. Vercel(vercel.com)에 로그인 후 해당 레포지토리를 Import합니다.</p>
            <p>
              3. Vercel 배포 설정 화면의 <strong>[Environment Variables]</strong>에 위 6개 환경변수를 그대로 등록 후 [Deploy]를 누르면 배포 완료됩니다!
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
