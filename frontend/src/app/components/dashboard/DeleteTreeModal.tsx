import React from 'react';

interface DeleteTreeModalProps {
  show: boolean;
  onClose: () => void;
  treeToDelete: { name: string } | null;
  onConfirm: () => void;
  deleting: boolean;
}

export default function DeleteTreeModal({
  show,
  onClose,
  treeToDelete,
  onConfirm,
  deleting,
}: DeleteTreeModalProps) {
  if (!show || !treeToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left">
        <h3 className="text-2xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
          Erase Lineage Archive
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed font-light">
          Are you sure you want to permanently erase the family tree <strong className="text-slate-800 dark:text-white">"{treeToDelete.name}"</strong>? This action is completely irreversible and will permanently delete all documented ancestors, connections, audit logs, and custom fields from the database.
        </p>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting Archive...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
