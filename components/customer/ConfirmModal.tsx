"use client";

interface Props {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-[320px] w-full mx-4 p-6">
        <p className="text-sm font-semibold text-center text-[var(--color-secondary)]">
          {message}
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onConfirm}
            className="flex-1 bg-[var(--color-primary)] text-white text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
          >
            تأكيد
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-[var(--color-border)] text-[var(--color-secondary)] text-sm font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
