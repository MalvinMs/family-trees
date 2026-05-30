import { useState } from "react";

interface RelationModalProps {
  show: boolean;
  onClose: () => void;
  personA: string;
  personB: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  token: string | null;
  treeId: string;
  addRelationship: (token: string, data: any) => Promise<void>;
  isDarkMode: boolean;
  setAlertDialog: (dialog: any) => void;
}

export default function RelationModal({
  show,
  onClose,
  personA,
  personB,
  sourceHandle,
  targetHandle,
  token,
  treeId,
  addRelationship,
  isDarkMode,
  setAlertDialog,
}: RelationModalProps) {
  const [relationType, setRelationType] = useState<
    "parent" | "spouse" | "sibling" | "adopted"
  >("spouse");
  const [submittingRelation, setSubmittingRelation] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !treeId || !personA || !personB || submittingRelation) return;
    setSubmittingRelation(true);

    try {
      await addRelationship(token, {
        tree_id: treeId,
        person_a: personA,
        person_b: personB,
        relation_type: relationType,
        source_handle: sourceHandle,
        target_handle: targetHandle,
      });
      onClose();
    } catch (err: any) {
      setAlertDialog({
        show: true,
        title: "Error Creating Connection",
        message: err.message || "Failed to create connection",
      });
    } finally {
      setSubmittingRelation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl transition-all ${
          isDarkMode
            ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
            : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
        }`}
      >
        <h3
          className={`text-xl font-serif font-semibold mb-2 text-left ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}
        >
          Select Relationship Type
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-light text-left">
          Establish a graph connection link between these two family nodes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Connection Link
            </label>
            <select
              value={relationType}
              onChange={(e: any) => setRelationType(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
              }`}
            >
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="adopted">Adopted</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border transition-all text-xs font-semibold ${
                isDarkMode
                  ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingRelation}
              className={`px-5 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                  : "bg-[#1c1c1e] text-white hover:bg-slate-800"
              }`}
            >
              {submittingRelation && (
                <div
                  className={`animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent ${
                    isDarkMode ? "border-[#1c1c1e]" : "border-white"
                  }`}
                />
              )}
              {submittingRelation ? "Linking..." : "Add Relationship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
