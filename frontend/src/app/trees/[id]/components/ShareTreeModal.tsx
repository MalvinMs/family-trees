import { useState } from "react";
import { Users, X, Globe, Copy, Check, Trash2 } from "lucide-react";
import type { Tree } from "../../../../store/treeStore";

interface ShareTreeModalProps {
  show: boolean;
  onClose: () => void;
  activeTree: Tree | null;
  collaborators: any;
  user: any;
  token: string | null;
  shareTree: (token: string, data: any) => Promise<any>;
  updateTree: (token: string, id: string, data: any) => Promise<any>;
  removeCollaborator: (token: string, id: string) => Promise<void>;
  isDarkMode: boolean;
}

export default function ShareTreeModal({
  show,
  onClose,
  activeTree,
  collaborators,
  user,
  token,
  shareTree,
  updateTree,
  removeCollaborator,
  isDarkMode,
}: ShareTreeModalProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!show) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeTree || !inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await shareTree(token, {
        tree_id: activeTree.id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
    } catch (err: any) {
      alert(err.message || "Failed to share tree access");
    } finally {
      setInviting(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!activeTree || !token) return;
    try {
      await updateTree(token, activeTree.id, {
        is_public: !activeTree.is_public,
      });
    } catch (err: any) {
      alert(err.message || "Failed to toggle public settings");
    }
  };

  const handleCopyLink = () => {
    if (!activeTree) return;
    const url = `${window.location.origin}/public/trees/${activeTree.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative transition-all ${
          isDarkMode
            ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
            : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-xl font-serif font-semibold flex items-center gap-2 ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            <Users size={20} className="text-[#7b8e7f] dark:text-[#9cb2a2]" />
            Share Genealogy Canvas
          </h3>
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

        <p className="text-xs text-slate-400 mb-6 font-light text-left">
          Invite collaborators to view or edit this historical family lineage.
        </p>

        {/* Invite Collaborator Form */}
        {activeTree?.owner_id === user?.id ? (
          <form onSubmit={handleInviteSubmit} className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
                className={`w-full sm:flex-1 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs ${
                  isDarkMode
                    ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                    : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                }`}
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className={`flex-1 sm:flex-initial px-2 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  }`}
                >
                  <option value="viewer">Can View</option>
                  <option value="editor">Can Edit</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center justify-center ${
                    isDarkMode
                      ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                      : "bg-[#1c1c1e] text-white hover:bg-slate-800"
                  }`}
                >
                  {inviting ? "Inviting..." : "Invite"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-lg bg-slate-500/5 text-slate-400 text-[11px] mb-6 font-light">
            Only the tree creator/owner can manage sharing permissions and
            invite new editors/viewers.
          </div>
        )}

        {/* Public Link Toggle & Copy Section */}
        <div
          className={`p-4 rounded-xl border mb-6 ${
            isDarkMode
              ? "bg-[#121213] border-[#2c2c2e]"
              : "bg-[#faf9f6] border-[#e6e5e0]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-[#7b8e7f] dark:text-[#9cb2a2]" />
              <div className="text-left">
                <span className="text-xs font-semibold block">
                  Public Archival View
                </span>
                <span className="text-[10px] text-slate-400 block font-light">
                  Allow read-only unauthenticated access
                </span>
              </div>
            </div>
            {activeTree?.owner_id === user?.id ? (
              <button
                onClick={handleTogglePublic}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                  activeTree?.is_public
                    ? "bg-[#7b8e7f] dark:bg-[#9cb2a2] justify-end"
                    : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            ) : (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  activeTree?.is_public
                    ? "bg-[#7b8e7f]/10 text-[#7b8e7f]"
                    : "bg-slate-200/50 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {activeTree?.is_public ? "Active" : "Private"}
              </span>
            )}
          </div>

          {activeTree?.is_public && (
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-white/5 space-y-2 text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                Public Shareable Link
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/public/trees/${activeTree.id}`}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg border text-[11px] font-mono focus:outline-none select-all ${
                    isDarkMode
                      ? "bg-[#1a1a1c] border-[#2c2c2e] text-slate-300"
                      : "bg-white border-[#e6e5e0] text-slate-650"
                  }`}
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                    copiedLink
                      ? "bg-[#7b8e7f]/20 text-[#7b8e7f] dark:text-[#9cb2a2] dark:bg-[#9cb2a2]/20 border border-[#7b8e7f]/30"
                      : isDarkMode
                      ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                      : "bg-[#1c1c1e] text-white hover:bg-slate-800"
                  }`}
                >
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  {copiedLink ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List of active collaborators */}
        <div className="space-y-4 text-left">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            People with Access
          </h4>

          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
            {/* Tree Owner */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                    isDarkMode
                      ? "bg-[#2c2c2e] text-[#9cb2a2]"
                      : "bg-slate-200 text-[#7b8e7f]"
                  }`}
                >
                  {collaborators?.owner?.name ? collaborators.owner.name[0] : "O"}
                </div>
                <div>
                  <span className="font-semibold block">
                    {collaborators?.owner?.name || "Unknown Owner"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {collaborators?.owner?.email}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7b8e7f]/10 text-[#7b8e7f] dark:text-[#9cb2a2] dark:bg-[#9cb2a2]/10 uppercase tracking-wider">
                Owner
              </span>
            </div>

            {/* Collaborators */}
            {collaborators?.collaborators &&
            collaborators.collaborators.length > 0 ? (
              collaborators.collaborators.map((collab: any) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                        isDarkMode
                          ? "bg-[#2c2c2e] text-[#9cb2a2]"
                          : "bg-slate-200 text-[#7b8e7f]"
                      }`}
                    >
                      {collab.user?.name ? collab.user.name[0] : "C"}
                    </div>
                    <div>
                      <span className="font-semibold block">
                        {collab.user?.name || "Unknown User"}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {collab.user?.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        collab.role === "editor"
                          ? "text-amber-500"
                          : "text-slate-400"
                      }`}
                    >
                      {collab.role}
                    </span>

                    {activeTree?.owner_id === user?.id && (
                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              `Remove access for ${
                                collab.user?.name || "this user"
                              }?`
                            )
                          ) {
                            try {
                              await removeCollaborator(token!, collab.id);
                            } catch (err: any) {
                              alert(
                                err.message || "Failed to remove collaborator"
                              );
                            }
                          }
                        }}
                        className="p-1 rounded text-red-405 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer"
                        title="Revoke Collaborator Access"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 font-light text-[11px]">
                No collaborators added yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
