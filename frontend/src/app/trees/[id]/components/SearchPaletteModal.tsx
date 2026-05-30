import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import type { Tree, Person } from "../../../../store/treeStore";

interface SearchPaletteModalProps {
  show: boolean;
  onClose: () => void;
  activeTree: Tree | null;
  isDarkMode: boolean;
  fitView: (options: any) => void;
}

export default function SearchPaletteModal({
  show,
  onClose,
  activeTree,
  isDarkMode,
  fitView,
}: SearchPaletteModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setSearchSelectedIndex(0);
      setSearchQuery("");
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [show]);

  if (!show) return null;

  const q = searchQuery.toLowerCase();
  const matches = q
    ? (activeTree?.persons || []).filter(
        (p: Person) =>
          p.first_name.toLowerCase().includes(q) ||
          (p.last_name || "").toLowerCase().includes(q)
      )
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode
            ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
            : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative border-b ${
            isDarkMode ? "border-[#2c2c2e]" : "border-[#e6e5e0]"
          }`}
        >
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7b8e7f] dark:text-[#9cb2a2]"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              const list = searchListRef.current;
              if (!list) return;
              const items =
                list.querySelectorAll<HTMLButtonElement>("[data-search-item]");
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSearchSelectedIndex((prev) =>
                  Math.min(prev + 1, items.length - 1)
                );
                items[
                  Math.min(searchSelectedIndex + 1, items.length - 1)
                ]?.scrollIntoView({ block: "nearest" });
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSearchSelectedIndex((prev) => Math.max(prev - 1, 0));
                items[Math.max(searchSelectedIndex - 1, 0)]?.scrollIntoView({
                  block: "nearest",
                });
              } else if (e.key === "Enter" && items[searchSelectedIndex]) {
                e.preventDefault();
                items[searchSelectedIndex].click();
              }
            }}
            placeholder="Search family members..."
            className={`w-full pl-11 pr-4 py-4 text-xs font-sans focus:outline-none ${
              isDarkMode
                ? "bg-[#1a1a1c] text-[#f3f3f5] placeholder-slate-500"
                : "bg-white text-[#1c1c1e] placeholder-slate-400"
            }`}
          />
        </div>
        <div
          className={`max-h-[40vh] overflow-y-auto ${
            isDarkMode ? "text-slate-350" : "text-slate-600"
          }`}
          ref={searchListRef}
        >
          {!searchQuery.trim() ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400 font-light italic">
              Type a name to search for a family member.
            </div>
          ) : matches.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400 font-light italic">
              No family members match your search.
            </div>
          ) : (
            matches.slice(0, 20).map((p: Person, idx: number) => (
              <button
                key={p.id}
                data-search-item
                onClick={() => {
                  onClose();
                  fitView({
                    nodes: [{ id: p.id }],
                    duration: 800,
                    maxZoom: 1.5,
                    padding: 0.5,
                  });
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs transition-all border-b last:border-0 font-sans cursor-pointer ${
                  idx === searchSelectedIndex
                    ? isDarkMode
                      ? "bg-[#9cb2a2]/10 text-white border-l-3 border-[#9cb2a2] pl-3"
                      : "bg-[#7b8e7f]/10 text-slate-900 border-l-3 border-[#7b8e7f] pl-3"
                    : isDarkMode
                    ? "border-transparent hover:bg-white/3 text-[#f3f3f5]"
                    : "border-transparent hover:bg-slate-50 text-[#1c1c1e]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isDarkMode
                      ? "bg-[#9cb2a2]/20 text-[#9cb2a2]"
                      : "bg-[#7b8e7f]/15 text-[#7b8e7f]"
                  }`}
                >
                  {p.first_name[0]}
                  {p.last_name?.[0] || ""}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {p.first_name} {p.last_name || ""}
                  </div>
                  <div className="text-[10px] text-slate-400 font-light truncate">
                    {p.birth_date ? new Date(p.birth_date).getFullYear() : "??"}{" "}
                    –{" "}
                    {p.death_date
                      ? new Date(p.death_date).getFullYear()
                      : "Present"}
                  </div>
                </div>
                <kbd
                  className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded border shadow-xs ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e]/60 text-slate-500"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-slate-400"
                  }`}
                >
                  ↵
                </kbd>
              </button>
            ))
          )}
        </div>
        <div
          className={`flex items-center gap-4 px-4 py-2.5 border-t text-[10px] text-slate-400 ${
            isDarkMode ? "border-[#2c2c2e]" : "border-[#e6e5e0]"
          }`}
        >
          <span className="flex items-center gap-1">
            <kbd
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shadow-xs ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e]/60 text-slate-500"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-400"
              }`}
            >
              ↑↓
            </kbd>{" "}
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shadow-xs ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e]/60 text-slate-500"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-400"
              }`}
            >
              ↵
            </kbd>{" "}
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shadow-xs ${
                isDarkMode
                  ? "bg-[#121213] border-[#2c2c2e]/60 text-slate-500"
                  : "bg-[#faf9f6] border-[#e6e5e0] text-slate-400"
              }`}
            >
              Esc
            </kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
