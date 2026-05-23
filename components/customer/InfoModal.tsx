"use client";

interface Props {
  isOpen:  boolean;
  icon:    string;
  message: string;
  onClose: () => void;
}

export default function InfoModal({ isOpen, icon, message, onClose }: Props) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white rounded-3xl p-6 flex flex-col items-center gap-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-5xl">{icon}</span>
        <p className="text-base font-black text-[#1A1A1A] text-center leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-sm font-black text-white active:scale-[0.98] transition-transform"
          style={{ background: "#FF6000" }}
        >
          حسناً
        </button>
      </div>
    </div>
  );
}
