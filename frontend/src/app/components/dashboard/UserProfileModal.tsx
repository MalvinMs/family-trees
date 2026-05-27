import React from 'react';

interface UserProfileModalProps {
  show: boolean;
  onClose: () => void;
  profileName: string;
  onNameChange: (val: string) => void;
  profileEmail: string;
  onEmailChange: (val: string) => void;
  profilePassword: string;
  onPasswordChange: (val: string) => void;
  profileConfirmPassword: string;
  onConfirmPasswordChange: (val: string) => void;
  profileError: string;
  profileSuccess: string;
  onSubmit: (e: React.FormEvent) => void;
  updating: boolean;
}

export default function UserProfileModal({
  show,
  onClose,
  profileName,
  onNameChange,
  profileEmail,
  onEmailChange,
  profilePassword,
  onPasswordChange,
  profileConfirmPassword,
  onConfirmPasswordChange,
  profileError,
  profileSuccess,
  onSubmit,
  updating,
}: UserProfileModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md p-6 rounded-2xl border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-serif font-semibold text-slate-800 dark:text-white mb-2">
          Manage Historical Profile
        </h3>
        <p className="text-xs text-slate-400 mb-6 font-light leading-relaxed">
          Update your primary credentials or securely alter your security passwords.
        </p>

        {profileError && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs mb-4">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs mb-4">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Display Name
            </label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Raden Kartowidjojo"
              className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={profileEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="e.g. kartowidjojo@kinova.com"
              className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              New Password (Optional)
            </label>
            <input
              type="password"
              value={profilePassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-xs"
            />
          </div>

          {profilePassword && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={profileConfirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                placeholder="Verify new security password"
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {updating ? 'Updating Credentials...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
