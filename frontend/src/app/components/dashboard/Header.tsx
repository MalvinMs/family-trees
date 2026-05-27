import { Plus, LogOut, Upload, Sun, Moon, User } from 'lucide-react';

interface HeaderProps {
  userName: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onShowCreateModal: () => void;
  onShowProfileModal: () => void;
  onImportTree: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
}

export default function Header({
  userName,
  isDarkMode,
  onToggleTheme,
  onShowCreateModal,
  onShowProfileModal,
  onImportTree,
  onLogout
}: HeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-[#e6e5e0] dark:border-[#2c2c2e] pb-10 mb-14 text-left">
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
          Heritage Documentation Archive
        </span>
        <h1 className="text-4xl font-serif font-medium tracking-tight">
          Welcome, {userName || 'Historian'}
        </h1>
        <p className="text-sm text-slate-400 font-light leading-relaxed">
          Quietly preserving silsilah lineages and historical contexts across generations.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onShowCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-medium text-xs shadow-sm transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <Plus size={14} />
          Document New Lineage
        </button>
        <label className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] bg-white dark:bg-[#1a1a1c] text-slate-700 dark:text-slate-300 hover:bg-[#faf9f6] dark:hover:bg-white/5 font-medium text-xs shadow-xs transition-all cursor-pointer w-full sm:w-auto justify-center">
          <Upload size={14} />
          Import Archive (.json)
          <input
            type="file"
            accept=".json"
            onChange={onImportTree}
            className="hidden"
          />
        </label>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start mt-2 sm:mt-0">
          <button
            onClick={onToggleTheme}
            className={`flex-1 sm:flex-none flex items-center justify-center p-2.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-[#1a1a1c] border-white/10 text-amber-400 hover:bg-slate-800'
                : 'bg-white border-[#e6e5e0] text-slate-700 hover:bg-[#faf9f6]'
            }`}
            title="Toggle Light/Dark Mode"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onShowProfileModal}
            className={`flex-1 sm:flex-none flex items-center justify-center p-2.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-[#1a1a1c] border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-[#e6e5e0] text-slate-700 hover:bg-[#faf9f6]'
            }`}
            title="Manage Profile"
          >
            <User size={16} />
          </button>
          <button
            onClick={onLogout}
            className="flex-1 sm:flex-none flex items-center justify-center p-2.5 rounded-lg bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
