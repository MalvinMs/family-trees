import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Settings,
  Trash2,
  Sun,
  Moon,
  X,
  History,
  Users,
  Download,
  Menu,
  Sparkles,
  Pencil,
  Layers,
  Activity,
  ArrowRight,
  Search,
  Check,
} from "lucide-react";
import type { Tree } from "../../../../store/treeStore";
import type { LayoutAlgorithmType } from "../../../utils/layoutUtils";

interface WorkspaceHeaderProps {
  activeTree: Tree | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: any;
  token: string | null;
  onOpenSearch: () => void;
  onOpenPersonModal: () => void;
  onOpenFieldModal: () => void;
  onOpenShareModal: () => void;
  onOpenHistoryDrawer: () => void;
  onOpenDeleteModal: () => void;
  handleTriggerAutoLayout: (algorithm: LayoutAlgorithmType) => void;
  handleExport: (format: "json" | "gedcom") => void;
  updateTree: (token: string, id: string, data: any) => Promise<any>;
}

export default function WorkspaceHeader({
  activeTree,
  isDarkMode,
  toggleTheme,
  user,
  token,
  onOpenSearch,
  onOpenPersonModal,
  onOpenFieldModal,
  onOpenShareModal,
  onOpenHistoryDrawer,
  onOpenDeleteModal,
  handleTriggerAutoLayout,
  handleExport,
  updateTree,
}: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isEditingTreeName, setIsEditingTreeName] = useState(false);
  const [treeNameInput, setTreeNameInput] = useState("");
  const [savingTreeName, setSavingTreeName] = useState(false);
  const [showAutoArrangeMenu, setShowAutoArrangeMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleSaveTreeName = async () => {
    if (!token || !activeTree || !treeNameInput.trim() || savingTreeName) return;
    setSavingTreeName(true);
    try {
      await updateTree(token, activeTree.id, { name: treeNameInput.trim() });
      setIsEditingTreeName(false);
    } catch (err) {
      console.error("Failed to rename family tree:", err);
    } finally {
      setSavingTreeName(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pointer-events-none">
      {/* Desktop Navbar View */}
      <div className="hidden md:flex items-center justify-between w-full pointer-events-none">
        <div
          className={`flex items-center justify-between w-full md:w-auto gap-3 pointer-events-auto backdrop-blur border px-4 py-2.5 rounded-xl shadow-xl ${
            isDarkMode
              ? "bg-slate-900/90 border-white/10 text-white"
              : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-white/5"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-left group">
              {isEditingTreeName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={treeNameInput}
                    onChange={(e) => setTreeNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTreeName();
                      if (e.key === "Escape") setIsEditingTreeName(false);
                    }}
                    autoFocus
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-1 w-64 ${
                      isDarkMode
                        ? "bg-slate-950 border-white/15 text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2] focus:ring-offset-slate-900"
                        : "bg-[#faf9f6] border-slate-300 text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f] focus:ring-offset-white"
                    }`}
                  />
                  <button
                    onClick={handleSaveTreeName}
                    disabled={savingTreeName}
                    className="p-1 rounded bg-[#7b8e7f]/20 hover:bg-[#7b8e7f]/30 text-[#7b8e7f] dark:text-[#9cb2a2] transition-all cursor-pointer"
                    title="Save name"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setIsEditingTreeName(false)}
                    className="p-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h1
                    className={`font-bold text-sm ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    } max-w-[150px] sm:max-w-none truncate`}
                  >
                    {activeTree?.name || "Loading Canvas..."}
                  </h1>
                  {activeTree?.owner_id === user?.id && (
                    <button
                      onClick={() => {
                        setTreeNameInput(activeTree?.name || "");
                        setIsEditingTreeName(true);
                      }}
                      className={`p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-slate-500/10 text-slate-400 hover:text-[#7b8e7f] dark:hover:text-[#9cb2a2] transition-all cursor-pointer`}
                      title="Rename label"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              )}
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Kinova Canvas Workspace
              </p>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all pointer-events-auto ${
              isDarkMode
                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Search (⌘K)"
          >
            <Search size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto justify-end flex-wrap">
          <button
            onClick={onOpenPersonModal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.01] transition-all pointer-events-auto ${
              isDarkMode
                ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                : "bg-[#1c1c1e] text-white hover:bg-slate-800"
            }`}
          >
            <UserPlus size={16} />
            <span>Add Family Member</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
              isDarkMode
                ? "bg-slate-900/90 border-white/10 text-amber-400 hover:bg-slate-800"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Toggle Light/Dark Mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onOpenFieldModal}
            className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
              isDarkMode
                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Configure Custom Fields Schema"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={onOpenShareModal}
            className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
              isDarkMode
                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="Share tree access"
          >
            <Users size={18} />
          </button>

          <button
            onClick={onOpenHistoryDrawer}
            className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
              isDarkMode
                ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            title="View modification audit logs"
          >
            <History size={18} />
          </button>

          {/* Auto-Arrange Layout Button */}
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setShowAutoArrangeMenu((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-xl transition-all text-xs font-semibold ${
                isDarkMode
                  ? "bg-[#9cb2a2]/10 border-[#9cb2a2]/20 text-[#9cb2a2] hover:bg-[#9cb2a2]/20 hover:text-white"
                  : "bg-[#7b8e7f]/10 border-[#7b8e7f]/30 text-[#7b8e7f] hover:bg-[#7b8e7f]/20 hover:text-[#4e6153]"
              }`}
              title="Automatically arrange all family nodes inside the canvas"
            >
              <Sparkles size={14} />
              <span className="hidden lg:inline">Auto-Arrange</span>
            </button>
            {showAutoArrangeMenu && (
              <div
                className={`absolute right-0 mt-2 w-52 rounded-xl shadow-2xl border overflow-hidden z-50 transition-all ${
                  isDarkMode
                    ? "bg-[#18181a] border-white/5 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <button
                  onClick={() => {
                    handleTriggerAutoLayout("HIERARCHICAL_TB");
                    setShowAutoArrangeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                    isDarkMode
                      ? "border-white/5 hover:bg-white/5 hover:text-white"
                      : "border-slate-100 hover:bg-slate-50 hover:text-slate-955"
                  }`}
                >
                  <Layers size={13} className="text-indigo-400" />
                  Vertical Generation Tree
                </button>
                <button
                  onClick={() => {
                    handleTriggerAutoLayout("HIERARCHICAL_LR");
                    setShowAutoArrangeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                    isDarkMode
                      ? "border-white/5 hover:bg-white/5 hover:text-white"
                      : "border-slate-100 hover:bg-slate-50 hover:text-slate-955"
                  }`}
                >
                  <ArrowRight size={13} className="text-emerald-400" />
                  Horizontal Timeline
                </button>
                <button
                  onClick={() => {
                    handleTriggerAutoLayout("ORGANIC");
                    setShowAutoArrangeMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                    isDarkMode
                      ? "border-white/5 hover:bg-white/5 hover:text-white"
                      : "border-slate-100 hover:bg-slate-50 hover:text-slate-955"
                  }`}
                >
                  <Activity size={13} className="text-rose-400" />
                  Organic Dynamic Space
                </button>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? "bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800"
                  : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
              title="Export family archives"
            >
              <Download size={18} />
            </button>
            {showExportMenu && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-50 transition-all ${
                  isDarkMode
                    ? "bg-[#18181a] border-white/5 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <button
                  onClick={() => {
                    handleExport("gedcom");
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                    isDarkMode
                      ? "border-white/5 hover:bg-white/5 hover:text-white"
                      : "border-slate-100 hover:bg-slate-50 hover:text-slate-955"
                  }`}
                >
                  Export GEDCOM (.ged)
                </button>
                <button
                  onClick={() => {
                    handleExport("json");
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                    isDarkMode
                      ? "border-white/5 hover:bg-white/5 hover:text-white"
                      : "border-slate-100 hover:bg-slate-50 hover:text-slate-955"
                  }`}
                >
                  Export JSON Backup (.json)
                </button>
              </div>
            )}
          </div>

          {/* Desktop Delete Tree Button */}
          {activeTree?.owner_id === user?.id && (
            <button
              onClick={onOpenDeleteModal}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? "bg-rose-955/20 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-350"
                  : "bg-rose-50 border-rose-200 text-rose-660 hover:bg-rose-100 hover:text-rose-700"
              }`}
              title="Delete lineage archive"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navbar View */}
      <div
        className={`flex md:hidden items-center justify-between w-full gap-3 pointer-events-auto backdrop-blur border px-3.5 py-2.5 rounded-xl shadow-xl relative z-50 ${
          isDarkMode
            ? "bg-slate-900/90 border-white/10 text-white"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-white/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="text-left max-w-[200px] truncate group">
            {isEditingTreeName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={treeNameInput}
                  onChange={(e) => setTreeNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTreeName();
                    if (e.key === "Escape") setIsEditingTreeName(false);
                  }}
                  autoFocus
                  className={`px-2.5 py-1 rounded-md border text-xs font-bold focus:outline-none focus:ring-2 w-32 ${
                    isDarkMode
                      ? "bg-slate-950 border-white/15 text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-slate-300 text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  }`}
                />
                <button
                  onClick={handleSaveTreeName}
                  disabled={savingTreeName}
                  className="p-1 rounded bg-[#7b8e7f]/20 text-[#7b8e7f] dark:text-[#9cb2a2]"
                >
                  <Check size={10} />
                </button>
                <button
                  onClick={() => setIsEditingTreeName(false)}
                  className="p-1 rounded bg-slate-500/10 text-slate-450"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-xs truncate">
                  {activeTree?.name || "Loading..."}
                </h1>
                {activeTree?.owner_id === user?.id && (
                  <button
                    onClick={() => {
                      setTreeNameInput(activeTree?.name || "");
                      setIsEditingTreeName(true);
                    }}
                    className="p-0.5 rounded hover:bg-slate-500/10 text-slate-400"
                  >
                    <Pencil size={9} />
                  </button>
                )}
              </div>
            )}
            <p
              className={`text-[8px] font-bold uppercase tracking-wider ${
                isDarkMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Kinova Canvas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode
                ? "text-slate-300 hover:text-white hover:bg-white/10"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
            title="Search (⌘K)"
          >
            <Search size={15} />
          </button>
          <button
            onClick={onOpenPersonModal}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode
                ? "bg-white/5 text-white hover:bg-white/10"
                : "bg-slate-100 text-slate-800 hover:bg-slate-250"
            }`}
            title="Add Family Member"
          >
            <UserPlus size={15} />
          </button>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`p-2 rounded-lg transition-all ${
              showMobileMenu
                ? isDarkMode
                  ? "bg-white/15 text-white"
                  : "bg-slate-250 text-slate-955"
                : isDarkMode
                  ? "bg-white/5 text-slate-300 hover:bg-white/10"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Menu size={15} />
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {showMobileMenu && (
          <div
            className={`absolute top-full right-0 mt-2 w-56 rounded-xl border p-2.5 shadow-2xl z-50 flex flex-col gap-1 transition-all ${
              isDarkMode
                ? "bg-[#18181a]/95 border-white/5 text-slate-300"
                : "bg-white/98 border-slate-200 text-slate-700"
            }`}
          >
            <button
              onClick={() => {
                toggleTheme();
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              {isDarkMode ? (
                <Sun size={14} className="text-amber-400" />
              ) : (
                <Moon size={14} className="text-slate-700" />
              )}
              Theme: {isDarkMode ? "Light Mode" : "Dark Mode"}
            </button>

            <button
              onClick={() => {
                onOpenFieldModal();
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <Settings size={14} />
              Custom Fields
            </button>

            <button
              onClick={() => {
                onOpenShareModal();
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <Users size={14} />
              Share Tree
            </button>

            <button
              onClick={() => {
                onOpenHistoryDrawer();
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <History size={14} />
              Activity Logs
            </button>

            <div
              className={`border-t my-1 ${
                isDarkMode ? "border-white/5" : "border-slate-100"
              }`}
            />

            <div className="px-3 py-1.5 text-[9px] font-mono tracking-widest uppercase font-semibold text-slate-400">
              Auto-Arrange Options
            </div>

            <button
              onClick={() => {
                handleTriggerAutoLayout("HIERARCHICAL_TB");
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "text-indigo-400 hover:bg-white/5 hover:text-white"
                  : "text-indigo-650 hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <Layers size={14} />
              Vertical Generation Tree
            </button>

            <button
              onClick={() => {
                handleTriggerAutoLayout("HIERARCHICAL_LR");
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "text-emerald-400 hover:bg-white/5 hover:text-white"
                  : "text-emerald-650 hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <ArrowRight size={14} />
              Horizontal Timeline
            </button>

            <button
              onClick={() => {
                handleTriggerAutoLayout("ORGANIC");
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "text-rose-400 hover:bg-white/5 hover:text-white"
                  : "text-rose-650 hover:bg-slate-100 hover:text-slate-955"
              }`}
            >
              <Activity size={14} />
              Organic Dynamic Space
            </button>

            <button
              onClick={() => {
                handleExport("gedcom");
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Download size={14} />
              Export GEDCOM (.ged)
            </button>

            <button
              onClick={() => {
                handleExport("json");
                setShowMobileMenu(false);
              }}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                isDarkMode
                  ? "hover:bg-white/5 hover:text-white"
                  : "hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Download size={14} />
              Export JSON Backup (.json)
            </button>

            {activeTree?.owner_id === user?.id && (
              <>
                <div
                  className={`border-t my-1 ${
                    isDarkMode ? "border-white/5" : "border-slate-100"
                  }`}
                />
                <button
                  onClick={() => {
                    onOpenDeleteModal();
                    setShowMobileMenu(false);
                  }}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isDarkMode
                      ? "bg-rose-955/20 border border-rose-500/20 text-rose-455 hover:bg-rose-500/20 hover:text-rose-350"
                      : "bg-rose-50 border border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700"
                  }`}
                >
                  <Trash2 size={14} />
                  Delete Tree Archive
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
