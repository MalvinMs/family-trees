import { useState } from "react";
import {
  Clock,
  X,
  AlignLeft,
  Users,
  Trash2,
  MessageSquare,
  Send,
} from "lucide-react";
import type { Tree, Person, Relationship } from "../../../../store/treeStore";

interface MemoirDrawerProps {
  selectedPerson: Person | null;
  onClose: () => void;
  activeTree: Tree | null;
  isDarkMode: boolean;
  token: string | null;
  user: any;
  addRelationship: (token: string, data: any) => Promise<void>;
  deleteRelationship: (token: string, id: string) => Promise<void>;
  addRelativeComposite: (
    token: string,
    treeId: string,
    data: any
  ) => Promise<void>;
  deletePerson: (token: string, id: string) => Promise<void>;
  onEditPersonClick: (p: Person) => void;
  setConfirmDialog: (dialog: any) => void;
  setAlertDialog: (dialog: any) => void;
  comments: any[];
  addComment: (token: string, data: any) => Promise<void>;
  deleteComment: (token: string, id: string) => Promise<void>;
}

export default function MemoirDrawer({
  selectedPerson,
  onClose,
  activeTree,
  isDarkMode,
  token,
  user,
  addRelationship,
  deleteRelationship,
  addRelativeComposite,
  deletePerson,
  onEditPersonClick,
  setConfirmDialog,
  setAlertDialog,
  comments,
  addComment,
  deleteComment,
}: MemoirDrawerProps) {
  // Drawer Add/Connect Relative State
  const [connectMode, setConnectMode] = useState<"existing" | "new">("existing");
  const [existingRelativeId, setExistingRelativeId] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGender, setNewGender] = useState<"male" | "female" | "other">("male");
  const [drawerRelationType, setDrawerRelationType] = useState<
    "parent" | "spouse" | "sibling" | "adopted" | "child"
  >("spouse");
  const [connectingRelative, setConnectingRelative] = useState(false);

  // Comments/Notes State
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  if (!selectedPerson) return null;

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !commentContent.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addComment(token, {
        person_id: selectedPerson.id,
        content: commentContent.trim(),
      });
      setCommentContent("");
    } catch (err: any) {
      alert(err.message || "Failed to add research note");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDrawerConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeTree || !selectedPerson || connectingRelative) return;
    setConnectingRelative(true);

    try {
      if (connectMode === "existing") {
        if (!existingRelativeId) return;

        // Resolve handle endpoints based on direction rules
        let person_a = selectedPerson.id;
        let person_b = existingRelativeId;
        let relation_type: Relationship["relation_type"] = "spouse";
        let source_handle: string | null = null;
        let target_handle: string | null = null;

        if (drawerRelationType === "spouse") {
          relation_type = "spouse";
          source_handle = "partner-right";
          target_handle = "partner-left";
        } else if (drawerRelationType === "sibling") {
          relation_type = "sibling";
          source_handle = "partner-right";
          target_handle = "partner-left";
        } else if (drawerRelationType === "parent") {
          // Existing Person is Parent -> Selected Person is Child
          person_a = existingRelativeId;
          person_b = selectedPerson.id;
          relation_type = "parent";
          source_handle = "child-out";
          target_handle = "parent-in";
        } else if (drawerRelationType === "child") {
          // Selected Person is Parent -> Existing Person is Child
          person_a = selectedPerson.id;
          person_b = existingRelativeId;
          relation_type = "parent";
          source_handle = "child-out";
          target_handle = "parent-in";
        } else if (drawerRelationType === "adopted") {
          // Selected Person is Parent -> Existing Person is Adopted
          person_a = selectedPerson.id;
          person_b = existingRelativeId;
          relation_type = "adopted";
          source_handle = "child-out";
          target_handle = "parent-in";
        }

        await addRelationship(token, {
          tree_id: activeTree.id,
          person_a,
          person_b,
          relation_type,
          source_handle,
          target_handle,
        });

        setExistingRelativeId("");
      } else {
        if (!newFirstName.trim()) return;

        await addRelativeComposite(token, activeTree.id, {
          first_name: newFirstName.trim(),
          last_name: newLastName.trim() || undefined,
          gender: newGender,
          relation_type: drawerRelationType,
          base_person_id: selectedPerson.id,
        });

        // Reset
        setNewFirstName("");
        setNewLastName("");
        setNewGender("male");
      }
    } catch (err: any) {
      setAlertDialog({
        show: true,
        title: "Connection Failed",
        message: err.message || "Failed to establish lineage connection",
      });
    } finally {
      setConnectingRelative(false);
    }
  };

  const personRelations =
    activeTree?.relationships.filter(
      (r: Relationship) => r.person_a === selectedPerson.id || r.person_b === selectedPerson.id
    ) || [];

  return (
    <aside
      className={`absolute z-30 shadow-2xl overflow-y-auto transition-transform duration-300 flex flex-col justify-between w-full h-[70vh] bottom-0 top-auto md:top-0 md:bottom-auto md:right-0 md:w-[400px] md:h-full border-t md:border-t-0 md:border-l p-6 md:p-8 rounded-t-3xl md:rounded-t-none ${
        isDarkMode
          ? "bg-[#18181a] border-[#2c2c2e] text-[#f3f3f5]"
          : "bg-[#faf9f6] border-[#e6e5e0] text-[#1c1c1e]"
      }`}
    >
      <div className="space-y-6">
        {/* Drawer Header */}
        <div className="flex items-start justify-between border-b pb-5 mb-5 border-slate-200/50 dark:border-white/5">
          <div className="space-y-1 text-left">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
              Ancestor Record
            </span>
            <h3 className="text-2xl font-serif font-semibold mt-1 tracking-tight">
              {selectedPerson.first_name} {selectedPerson.last_name || ""}
            </h3>
            {(selectedPerson.birth_date || selectedPerson.death_date) && (
              <p className="text-xs text-slate-400 font-mono tracking-wider mt-1 flex items-center gap-1">
                <Clock size={12} />
                {selectedPerson.birth_date
                  ? new Date(selectedPerson.birth_date).toLocaleDateString()
                  : "???"}{" "}
                –{" "}
                {selectedPerson.death_date
                  ? new Date(selectedPerson.death_date).toLocaleDateString()
                  : selectedPerson.death_date === null
                  ? "Present"
                  : "???"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkMode
                ? "border-white/5 text-slate-500 hover:text-white hover:bg-white/5"
                : "border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <X size={14} />
          </button>
        </div>

        {/* Profile Fields section */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
            <span className="text-slate-400 font-medium">Gender</span>
            <span className="font-semibold capitalize">
              {selectedPerson.gender}
            </span>
          </div>

          {/* Custom schema dynamic fields */}
          {selectedPerson.dynamic_data &&
            Object.entries(selectedPerson.dynamic_data).map(([key, val]) => {
              if (!val) return null;

              const customFields =
                activeTree?.customFields ||
                (activeTree as any)?.custom_fields ||
                [];
              const fieldSchema = customFields.find(
                (f: any) => f.field_name === key
              );
              const isTagType = fieldSchema?.field_type === "tag";

              if (isTagType) {
                const tagsArr =
                  typeof val === "string"
                    ? val
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                    : Array.isArray(val)
                    ? val
                    : [];

                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1.5 text-xs border-b border-slate-100 dark:border-white/5 pb-2 text-left"
                  >
                    <span className="text-[#7b8e7f] dark:text-[#9cb2a2] font-semibold capitalize">
                      {key.replace("_", " ")}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tagsArr.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-[#7b8e7f]/10 text-[#7b8e7f] dark:bg-[#9cb2a2]/20 dark:text-[#9cb2a2]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2"
                >
                  <span className="text-[#7b8e7f] dark:text-[#9cb2a2] font-semibold capitalize">
                    {key.replace("_", " ")}
                  </span>
                  <span className="font-semibold">{val as any}</span>
                </div>
              );
            })}
        </div>

        {/* Biography narrative */}
        {selectedPerson.biography ? (
          <div className="space-y-2 text-left">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
              <AlignLeft size={12} />
              Historical Narrative
            </h4>
            <p
              className={`text-xs leading-relaxed font-light whitespace-pre-wrap pl-1 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              "{selectedPerson.biography}"
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-[11px]">
            No biography logged yet. Click edit on the card to add a historical
            context narrative.
          </div>
        )}

        {/* Lineage Connections & Relationships */}
        <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5 justify-start">
            <Users size={12} />
            Lineage Connections
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {personRelations.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-[10px]">
                No lineage connections registered. Use the canvas handles to
                draw relations.
              </div>
            ) : (
              personRelations.map((rel: Relationship) => {
                const otherId =
                  rel.person_a === selectedPerson.id
                    ? rel.person_b
                    : rel.person_a;
                const otherPerson = activeTree?.persons.find(
                  (p: Person) => p.id === otherId
                );
                if (!otherPerson) return null;

                const relTypeLabels: Record<string, string> = {
                  spouse: "Spouse",
                  parent:
                    rel.person_a === selectedPerson.id ? "Child" : "Parent",
                  sibling: "Sibling",
                  adopted:
                    rel.person_a === selectedPerson.id
                      ? "Adopted Child"
                      : "Adopted Parent",
                };

                const relationLabel =
                  relTypeLabels[rel.relation_type] || "Relative";

                return (
                  <div
                    key={rel.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isDarkMode
                        ? "bg-[#1e1e20] border-[#2c2c2e] text-slate-300 hover:bg-[#252528]"
                        : "bg-[#fafaf9] border-[#e6e5e0] text-slate-700 hover:bg-[#f3f3f2]"
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider ${
                          isDarkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {relationLabel}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {otherPerson.first_name} {otherPerson.last_name || ""}
                      </span>
                    </div>
                    {token && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            show: true,
                            title: "Break Relationship Connection",
                            message: `Are you sure you want to break the connection with ${otherPerson.first_name} permanently?`,
                            onConfirm: async () => {
                              try {
                                await deleteRelationship(token, rel.id);
                              } catch (err: any) {
                                setAlertDialog({
                                  show: true,
                                  title: "Error Breaking Connection",
                                  message:
                                    err.message || "Failed to break connection",
                                });
                              }
                            },
                          });
                        }}
                        className={`px-2.5 py-1 text-[10px] rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                          isDarkMode
                            ? "bg-rose-955/20 border-rose-500/20 text-rose-400 hover:bg-rose-500/25 hover:text-rose-350"
                            : "bg-rose-55 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-750"
                        }`}
                        title="Break connection permanently"
                      >
                        <Trash2 size={11} />
                        <span>Break</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Connect / Add Relative Form inside Drawer */}
        {token && (
          <div
            className={`p-4 rounded-2xl border transition-all text-left ${
              isDarkMode
                ? "bg-[#1e1e20] border-[#2c2c2e]"
                : "bg-[#fafaf9] border-[#e6e5e0]"
            }`}
          >
            <h5 className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2] mb-3">
              Connect Relative
            </h5>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-500/5 mb-4 text-[10px] font-semibold text-center">
              <button
                type="button"
                onClick={() => setConnectMode("existing")}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  connectMode === "existing"
                    ? isDarkMode
                      ? "bg-[#18181a] text-white shadow-xs"
                      : "bg-white text-slate-900 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Link Existing
              </button>
              <button
                type="button"
                onClick={() => setConnectMode("new")}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  connectMode === "new"
                    ? isDarkMode
                      ? "bg-[#18181a] text-white shadow-xs"
                      : "bg-white text-slate-900 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Add New Relative
              </button>
            </div>

            <form onSubmit={handleDrawerConnectSubmit} className="space-y-3">
              {connectMode === "existing" ? (
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-slate-400 font-light">
                    Select Member
                  </label>
                  <select
                    required
                    value={existingRelativeId}
                    onChange={(e) => setExistingRelativeId(e.target.value)}
                    style={{
                      backgroundImage: isDarkMode
                        ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239cb2a2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`
                        : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%237b8e7f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.6rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem 1rem",
                    }}
                    className={`w-full appearance-none pr-8 px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                      isDarkMode
                        ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-white border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                    }`}
                  >
                    <option value="">-- Select Person --</option>
                    {(() => {
                      const connectedIds = (
                        activeTree?.relationships.filter(
                          (r: Relationship) =>
                            r.person_a === selectedPerson.id ||
                            r.person_b === selectedPerson.id
                        ) || []
                      ).map((r: Relationship) =>
                        r.person_a === selectedPerson.id
                          ? r.person_b
                          : r.person_a
                      );

                      return (activeTree?.persons || [])
                        .filter(
                          (p: Person) =>
                            p.id !== selectedPerson.id &&
                            !connectedIds.includes(p.id)
                        )
                        .map((p: Person) => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name || ""}
                          </option>
                        ));
                    })()}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-light">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="First name..."
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 transition-colors ${
                          isDarkMode
                            ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                            : "bg-white border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-light">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Last name..."
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 transition-colors ${
                          isDarkMode
                            ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                            : "bg-white border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-slate-400 font-light">
                      Gender
                    </label>
                    <select
                      value={newGender}
                      onChange={(e: any) => setNewGender(e.target.value)}
                      style={{
                        backgroundImage: isDarkMode
                          ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239cb2a2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`
                          : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%237b8e7f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.6rem center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "1rem 1rem",
                      }}
                      className={`w-full appearance-none pr-8 px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                        isDarkMode
                          ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                          : "bg-white border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                      }`}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-light">
                    Relationship
                  </label>
                  <select
                    value={drawerRelationType}
                    onChange={(e: any) => setDrawerRelationType(e.target.value)}
                    style={{
                      backgroundImage: isDarkMode
                        ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239cb2a2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`
                        : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%237b8e7f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.6rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem 1rem",
                    }}
                    className={`w-full appearance-none pr-8 px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                      isDarkMode
                        ? "bg-[#121213] border-[#2c2c2e] text-[#f3f3f5] focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-white border-[#e6e5e0] text-[#1c1c1e] focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                    }`}
                  >
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="adopted">Adopted Child</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={connectingRelative}
                    className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center cursor-pointer ${
                      isDarkMode
                        ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white disabled:bg-slate-700 disabled:text-slate-500"
                        : "bg-[#1c1c1e] text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                    }`}
                  >
                    {connectingRelative ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Archival Milestone Timeline */}
        <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5 justify-start">
            <Clock size={12} />
            Milestone Timelines
          </h4>
          <div className="relative pl-4 border-l border-slate-200 dark:border-[#2c2c2e] space-y-5 text-xs text-slate-400 font-light text-left">
            {selectedPerson.birth_date && (
              <div className="relative">
                <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#7b8e7f] dark:bg-[#9cb2a2] border-2 border-[#faf9f6] dark:border-[#18181a]" />
                <span className="font-bold text-slate-700 dark:text-white block font-mono">
                  {new Date(selectedPerson.birth_date).getFullYear()}
                </span>
                <span className="text-[10px] block mt-0.5">
                  Birth registration logged.
                </span>
              </div>
            )}
            {selectedPerson.death_date && (
              <div className="relative">
                <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-[#faf9f6] dark:border-[#18181a]" />
                <span className="font-bold text-slate-700 dark:text-white block font-mono">
                  {new Date(selectedPerson.death_date).getFullYear()}
                </span>
                <span className="text-[10px] block mt-0.5">
                  Departed this life. Heritage documentation closed.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Research Notes & Comments */}
        <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5 justify-start">
            <MessageSquare size={12} />
            Research Discussion
          </h4>

          {/* Comments list */}
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {comments && comments.length > 0 ? (
              comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-xl border relative group transition-all ${
                    isDarkMode
                      ? "bg-[#1e1e20] border-[#2c2c2e] text-slate-300"
                      : "bg-[#fafaf9] border-[#e6e5e0] text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                          isDarkMode
                            ? "bg-[#2c2c2e] text-slate-300"
                            : "bg-slate-200 text-slate-750"
                        }`}
                      >
                        {comment.user?.name ? comment.user.name[0] : "U"}
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          isDarkMode ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {comment.user?.name || "Unknown User"}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed font-light whitespace-pre-wrap break-words pl-1.5 text-left">
                    {comment.content}
                  </p>

                  {/* Delete button */}
                  {(activeTree?.owner_id === user?.id ||
                    comment.user_id === user?.id) && (
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this research note?"
                          )
                        ) {
                          try {
                            await deleteComment(token!, comment.id);
                          } catch (err: any) {
                            alert(err.message || "Failed to delete note");
                          }
                        }
                      }}
                      className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer"
                      title="Delete Research Note"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-[10px]">
                No research discussion logged yet.
              </div>
            )}
          </div>

          {/* Comment Input */}
          <form
            onSubmit={handleCommentSubmit}
            className="flex gap-2 items-end pt-1"
          >
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Add a research finding or note..."
              rows={1}
              required
              className={`flex-1 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs resize-none ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
              }`}
              style={{ minHeight: "34px", maxHeight: "100px" }}
            />
            <button
              type="submit"
              disabled={submittingComment || !commentContent.trim()}
              className={`p-2 rounded-lg transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                  : "bg-[#1c1c1e] text-white hover:bg-slate-800"
              }`}
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* Action buttons in Drawer */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={() => onEditPersonClick(selectedPerson)}
          className="flex-1 py-2.5 px-4 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-semibold text-xs shadow-sm transition-all text-center"
        >
          Edit Record
        </button>
        {token && (
          <button
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to remove this family member and all their relationships?"
                )
              ) {
                deletePerson(token, selectedPerson.id);
                onClose();
              }
            }}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
              isDarkMode
                ? "bg-rose-955/20 border-rose-500/20 text-rose-455 hover:bg-rose-500/20 hover:text-rose-350"
                : "bg-rose-50 border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700"
            }`}
            title="Delete Family Member"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
