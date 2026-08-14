import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download, School, Sparkles, Smartphone, Bell, CheckCircle } from 'lucide-react';

interface PrintablePlacardModalProps {
  room: string;
  onClose: () => void;
}

export const PrintablePlacardModal: React.FC<PrintablePlacardModalProps> = ({
  room,
  onClose,
}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://school.app';
  const studentUrl = `${origin}/student?room=${encodeURIComponent(room)}`;

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
            <h3 className="font-bold text-lg">교무실 출입문 A4 부착 안내판 인쇄</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>바로 인쇄하기</span>
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
          id="printable-door-sign"
          className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 border-4 border-slate-900 shadow-xl text-center space-y-6 max-w-lg mx-auto print:m-0 print:w-full print:shadow-none"
        >
          {/* School Badge Header */}
          <div className="flex items-center justify-center gap-2 text-indigo-800 font-black text-sm tracking-wider uppercase border-b-2 border-indigo-600 pb-3">
            <School className="w-5 h-5 text-indigo-600" />
            <span>스마트 학교 방문 접수처 (EduPass)</span>
          </div>

          {/* Room Title */}
          <div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
              방문 출입 안내
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {room}
            </h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              선생님을 찾아오신 학생은 아래 QR 코드를 스캔해주세요.
            </p>
          </div>

          {/* Big QR Code */}
          <div className="p-4 bg-slate-50 rounded-3xl inline-block border-2 border-indigo-200 shadow-inner">
            <QRCodeSVG value={studentUrl} size={240} level="H" />
          </div>

          {/* 3 Step Instruction */}
          <div className="grid grid-cols-3 gap-2 text-left pt-2 border-t border-slate-200">
            <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">1. QR 스캔</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">카메라로 QR 스캔 후 선생님 선택</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">2. 호출 신호</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">선생님 PC로 실시간 알림 전송</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <div className="font-black text-xs text-indigo-800">3. 입실/메모</div>
              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">수락 시 입실 또는 부재 시 메모</div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 font-medium">
            ※ 교무실 문을 두드리기 전에 먼저 QR로 호출해주시기 바랍니다.
          </div>
        </div>
      </div>
    </div>
  );
};
