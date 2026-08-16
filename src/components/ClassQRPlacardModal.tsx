import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, School, Sparkles, Smartphone, CheckCircle, Award } from 'lucide-react';
import { getStudentClassQrUrl } from '../lib/urlUtils';

interface ClassQRPlacardModalProps {
  grade: number;
  classNum: number;
  onClose: () => void;
}

export const ClassQRPlacardModal: React.FC<ClassQRPlacardModalProps> = ({
  grade,
  classNum,
  onClose,
}) => {
  const classUrl = useMemo(() => getStudentClassQrUrl(grade, classNum), [grade, classNum]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg">담임 배부용 학급 QR 안내판 인쇄</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>안내판 인쇄하기 (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area (Stylized as White A4 Paper) */}
        <div
          id="printable-class-sign"
          className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 border-4 border-indigo-600 shadow-xl text-center space-y-6 max-w-lg mx-auto print:m-0 print:w-full print:shadow-none"
        >
          {/* School Badge Header */}
          <div className="flex items-center justify-center gap-2 text-indigo-800 font-black text-sm tracking-wider uppercase border-b-2 border-indigo-200 pb-3">
            <School className="w-5 h-5 text-indigo-600" />
            <span>스마트 학교 알림 & 호출 시스템 (EduPass)</span>
          </div>

          {/* Room Title */}
          <div>
            <span className="text-xs font-black text-white bg-indigo-600 px-3.5 py-1 rounded-full shadow-sm">
              우리 반 전용 스마트 출입·알림 QR
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {grade}학년 {classNum}반
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
              스마트폰 카메라로 아래 QR을 비추면 <strong>[{grade}학년 {classNum}반]</strong>으로 자동 세팅됩니다.
            </p>
          </div>

          {/* Big QR Code */}
          <div className="p-4 bg-slate-50 rounded-3xl inline-block border-2 border-indigo-200 shadow-inner">
            <QRCodeSVG value={classUrl} size={220} level="H" includeMargin />
          </div>

          {/* Direct Link Text */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono break-all text-left">
            <span className="text-[10px] text-indigo-600 font-bold block mb-0.5">🔗 학급 전용 접속 주소:</span>
            {classUrl}
          </div>

          {/* 3 Step Instruction */}
          <div className="grid grid-cols-3 gap-2 text-left pt-2 border-t border-slate-200">
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">1. QR 스캔</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">카메라로 비추면 학년·반 자동 설정</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">2. 번호·이름</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">내 번호와 이름만 입력하면 끝!</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">3. 실시간 수신</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">선생님 호출, 출결, 공지 바로 확인</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-1 font-medium">
            ※ 교실 게시판 또는 책상 위에 부착하여 사용하시면 편리합니다.
          </div>
        </div>
      </div>
    </div>
  );
};
