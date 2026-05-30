interface ConfirmDialogState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface AlertDialogState {
  show: boolean;
  title: string;
  message: string;
}

interface ConfirmAlertDialogProps {
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  alertDialog: AlertDialogState;
  setAlertDialog: React.Dispatch<React.SetStateAction<AlertDialogState>>;
}

export default function ConfirmAlertDialog({
  confirmDialog,
  setConfirmDialog,
  alertDialog,
  setAlertDialog,
}: ConfirmAlertDialogProps) {
  return (
    <>
      {/* Reusable Custom Confirm Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left transition-all scale-100">
            <h3 className="text-xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-light">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog((prev) => ({ ...prev, show: false }))
                }
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#2c2c2e] text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog((prev) => ({ ...prev, show: false }));
                }}
                className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                Break Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Custom Alert Modal */}
      {alertDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left transition-all scale-100">
            <h3 className="text-xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
              {alertDialog.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-light">
              {alertDialog.message}
            </p>
            <div className="flex items-center justify-end mt-6">
              <button
                type="button"
                onClick={() =>
                  setAlertDialog((prev) => ({ ...prev, show: false }))
                }
                className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
