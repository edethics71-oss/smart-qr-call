import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, CheckCircle2, Sparkles, ExternalLink, Copy, Check, Globe, HelpCircle } from 'lucide-react';
import { getPublicStudentUrl } from '../lib/urlUtils';

interface StudentQuickQrModalProps {
  onClose: () => void;
  onOpenSimulator?: () => void;
}

export const StudentQuickQrModal: React.FC<StudentQuickQrModalProps> = ({ onClose, onOpenSimulator }) => {
  const [useDevDomain, setUseDevDomain] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState<boolean>(true);

  const studentUrl = getPublicStudentUrl(undefined, useDevDomain);

  const handleCopy = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 text-center relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>스마트폰 학생 접속 전용 QR</span>
        </div>

        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            학생 화면 바로 열기
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            스마트폰 카메라로 비추거나 새 탭으로 열어 테스트하실 수 있습니다.
          </p>
        </div>

        {/* Domain Toggle */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setUseDevDomain(false)}
            className={`flex-1 py-1.5 rounded-lg transition ${
              !useDevDomain
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🌐 일반 공유 QR (ais-pre)
          </button>
          <button
            type="button"
            onClick={() => setUseDevDomain(true)}
            className={`flex-1 py-1.5 rounded-lg transition ${
              useDevDomain
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            💻 개발자 전용 QR (ais-dev)
          </button>
        </div>

        {/* Big Crisp QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 shadow-inner">
          <QRCodeSVG value={studentUrl} size={200} level="H" includeMargin />
        </div>

        {/* URL Box & Action Buttons */}
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-mono break-all text-left flex items-center justify-between gap-2">
            <span className="truncate">{studentUrl}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
              title="주소 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={studentUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>PC 새 창으로 열기</span>
            </a>

            {onOpenSimulator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSimulator();
                }}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>화면 속 스마트폰 폰 열기</span>
              </button>
            )}
          </div>
        </div>

        {/* Troubleshooting Notice */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1.5 text-xs">
          <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>스마트폰 스캔 시 에러가 뜨는 이유 & 해결:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-0.5">
            <li>
              <strong>일반 공유 QR (ais-pre)</strong>: AI Studio 우측 상단의 <strong>[Share (공유)]</strong> 버튼을 아직 누르지 않은 경우 스마트폰에서 &quot;찾을 수 없음&quot;이 뜰 수 있습니다.
            </li>
            <li>
              <strong>개발자 전용 QR (ais-dev)</strong>: 스마트폰 브라우저에 구글 로그인(제작자 계정)이 되어 있지 않으면 403 에러가 뜹니다.
            </li>
            <li>
              👉 <strong>가장 빠른 테스트 방법</strong>: 위 <strong>[PC 새 창으로 열기]</strong>나 <strong>[화면 속 스마트폰 열기]</strong>를 누르시면 스마트폰과 100% 동일하게 실시간 알림을 테스트하실 수 있습니다!
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs cursor-pointer hover:opacity-90 transition shadow-md"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

