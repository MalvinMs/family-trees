

interface CreateTreeModalProps {
  show: boolean;
  onClose: () => void;
  newTreeName: string;
  onNameChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
}

export default function CreateTreeModal({
  show,
  onClose,
  newTreeName,
  onNameChange,
  onSubmit,
  creating,
}: CreateTreeModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-2xl relative text-left">
        <h3 className="text-2xl font-serif font-semibold text-slate-800 dark:text-white mb-2">
          Document New Lineage
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-light leading-relaxed">
          Provide a name for this genealogical archive. You will be able to configure dynamic schema custom fields inside the canvas workspace.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tree / Family Surname Name
            </label>
            <input
              type="text"
              required
              value={newTreeName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Trah Kartowidjojo Javanese Dynasty"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Creating Archive...' : 'Create Lineage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
