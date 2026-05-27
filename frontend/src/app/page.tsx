'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { useTreeStore } from '../store/treeStore';
import { Plus, LogOut, Network, Calendar, Award, Compass, CompassIcon, BookOpen, Clock, Heart, Sun, Moon, Upload, Trash2, User } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { token, user, logout, isAuthenticated, initialize, updateProfile } = useAuthStore();
  const { trees, fetchTrees, createTree, importTree, deleteTree, loading } = useTreeStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [creating, setCreating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // User Profile States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  
  // Tree Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [treeToDelete, setTreeToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    initialize();
    
    // Load persisted theme
    const savedTheme = localStorage.getItem('kinova_theme');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('kinova_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('auth_token')) {
      router.push('/login');
    } else if (token) {
      fetchTrees(token);
    }
  }, [isAuthenticated, token, router]);

  // Populate profile inputs on opening modal
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user, showProfileModal]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      setProfileError("Passwords do not match");
      return;
    }

    setProfileError('');
    setProfileSuccess('');
    setUpdatingProfile(true);

    try {
      await updateProfile(token, profileName, profileEmail, profilePassword || undefined);
      setProfileSuccess('Profile updated successfully!');
      setProfilePassword('');
      setProfileConfirmPassword('');
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeName.trim() || !token) return;
    setCreating(true);

    const created = await createTree(token, newTreeName);
    setCreating(false);
    if (created) {
      setNewTreeName('');
      setShowCreateModal(false);
      router.push(`/trees/${created.id}`);
    }
  };

  const handleImportTree = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        setCreating(true);
        const imported = await importTree(token, content);
        setCreating(false);
        if (imported) {
          router.push(`/trees/${imported.id}`);
        } else {
          alert('Failed to import tree archive.');
        }
      } catch (err: any) {
        setCreating(false);
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteTreeClick = (e: React.MouseEvent, tree: any) => {
    e.stopPropagation(); // Prevents navigating into the workspace!
    setTreeToDelete(tree);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteTree = async () => {
    if (!treeToDelete || !token) return;
    setDeleting(true);
    await deleteTree(token, treeToDelete.id);
    setDeleting(false);
    setTreeToDelete(null);
    setShowDeleteModal(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading && trees.length === 0) {
    return (
      <div className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7b8e7f] border-t-transparent" />
      </div>
    );
  }

  // 1. Gather all persons across all trees
  const allPersons = trees.flatMap((t) => t.persons || []);
  const totalAncestors = allPersons.length;

  // 2. Average Lifespan
  const deceasedMembers = allPersons.filter((p) => p.birth_date && p.death_date);
  let avgLifespan = 'N/A';
  if (deceasedMembers.length > 0) {
    const totalAge = deceasedMembers.reduce((sum, p) => {
      const birth = new Date(p.birth_date!).getFullYear();
      const death = new Date(p.death_date!).getFullYear();
      return sum + (death - birth);
    }, 0);
    avgLifespan = `${Math.round(totalAge / deceasedMembers.length)} Years`;
  }

  // 3. Total Generations (Longest parent-child chain)
  let totalGenerations = 0;
  if (trees.length > 0) {
    trees.forEach((tree) => {
      const relationships = tree.relationships || [];
      const parentsMap = new Map<string, string[]>(); // child -> parent list
      relationships.forEach((r) => {
        if (r.relation_type === 'parent') {
          const child = r.person_b;
          const parent = r.person_a;
          if (!parentsMap.has(child)) {
            parentsMap.set(child, []);
          }
          parentsMap.get(child)!.push(parent);
        }
      });

      const memo = new Map<string, number>();
      const getDepth = (personId: string): number => {
        if (memo.has(personId)) return memo.get(personId)!;
        const parents = parentsMap.get(personId) || [];
        if (parents.length === 0) return 1;
        const maxParentDepth = Math.max(...parents.map(getDepth));
        const depth = 1 + maxParentDepth;
        memo.set(personId, depth);
        return depth;
      };

      const depths = (tree.persons || []).map((p) => getDepth(p.id));
      const maxTreeGen = depths.length > 0 ? Math.max(...depths) : 0;
      if (maxTreeGen > totalGenerations) {
        totalGenerations = maxTreeGen;
      }
    });
  }

  // 4. Dynastic Milestones (Oldest births across all trees)
  const timelineMilestones = allPersons
    .filter((p) => p.birth_date)
    .map((p) => {
      const year = new Date(p.birth_date!).getFullYear();
      return {
        year,
        description: `${p.first_name} ${p.last_name || ''} was born${p.dynamic_data?.birth_place ? ` in ${p.dynamic_data.birth_place}` : ''}.`,
      };
    })
    .sort((a, b) => a.year - b.year)
    .slice(0, 3);

  // 5. Recent Ancestor Profiles (Show deceased/oldest members dynamically)
  const recentAncestors = allPersons
    .filter((p) => p.birth_date)
    .sort((a, b) => {
      if (a.death_date && !b.death_date) return -1;
      if (!a.death_date && b.death_date) return 1;
      return new Date(b.birth_date!).getTime() - new Date(a.birth_date!).getTime();
    })
    .slice(0, 3);

  // 6. Spousal Unions
  const totalSpousalUnions = trees.reduce(
    (sum, t) => sum + (t.relationships || []).filter((r) => r.relation_type === 'spouse').length,
    0
  );

  return (
    <main className={`min-h-screen p-6 md:p-16 transition-colors duration-300 ${isDarkMode ? 'dark bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[#e6e5e0] dark:border-[#2c2c2e] pb-10 mb-14">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
              Heritage Documentation Archive
            </span>
            <h1 className="text-4xl font-serif font-medium tracking-tight">
              Welcome, {user?.name || 'Historian'}
            </h1>
            <p className="text-sm text-slate-400 font-light">
              Quietly preserving silsilah lineages and historical contexts across generations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-medium text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} />
              Document New Lineage
            </button>
            <label className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] bg-white dark:bg-[#1a1a1c] text-slate-700 dark:text-slate-300 hover:bg-[#faf9f6] dark:hover:bg-white/5 font-medium text-xs shadow-xs transition-all cursor-pointer">
              <Upload size={14} />
              Import Archive (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleImportTree}
                className="hidden"
              />
            </label>
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-2.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1a1a1c] border-white/10 text-amber-400 hover:bg-slate-800'
                  : 'bg-white border-[#e6e5e0] text-slate-700 hover:bg-[#faf9f6]'
              }`}
              title="Toggle Light/Dark Mode"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center justify-center p-2.5 rounded-lg border shadow-xs transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1a1a1c] border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white border-[#e6e5e0] text-slate-700 hover:bg-[#faf9f6]'
              }`}
              title="Manage Profile"
            >
              <User size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 rounded-lg bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Bento Grid Redesign */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Bento: Trees List (Span 2) */}
          <section className="md:col-span-2 p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-serif font-semibold mb-6 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Network size={16} className="text-[#7b8e7f]" />
                Archival Trees
              </h2>

              {trees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#e6e5e0] dark:border-[#2c2c2e] rounded-xl bg-[#faf9f6]/40 dark:bg-white/2">
                  <Network size={36} className="text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">No documented family lineages yet</p>
                  <p className="text-slate-400 text-xs mt-1 mb-5">Create your first silsilah tree to begin archiving</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#faf9f6] transition-all"
                  >
                    Start Documentation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trees.map((tree) => (
                    <div
                      key={tree.id}
                      onClick={() => router.push(`/trees/${tree.id}`)}
                      className="group flex items-center justify-between p-5 rounded-xl border border-[#e6e5e0] dark:border-[#2c2c2e] hover:border-[#7b8e7f]/40 dark:hover:border-[#9cb2a2]/40 hover:bg-[#faf9f6]/40 dark:hover:bg-white/2 cursor-pointer transition-all"
                    >
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold group-hover:text-[#7b8e7f] dark:group-hover:text-[#9cb2a2] transition-colors">
                          {tree.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-light flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-300 dark:text-slate-700" />
                          Last modified {new Date(tree.created_at as any).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#7b8e7f] dark:text-[#9cb2a2] bg-[#7b8e7f]/10 dark:bg-[#9cb2a2]/15 px-2.5 py-1 rounded-full">
                          View Canvas
                        </span>
                        <button
                          onClick={(e) => handleDeleteTreeClick(e, tree)}
                          className="p-2 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-slate-400 hover:text-red-500 transition-all pointer-events-auto"
                          title="Delete lineage archive"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Bento: Stats (Span 1) */}
          <section className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs space-y-6">
            <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Award size={16} className="text-[#7b8e7f]" />
              Family Metrics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ancestors</span>
                <p className="text-2xl font-serif font-semibold mt-1 text-[#7b8e7f] dark:text-[#9cb2a2]">
                  {totalAncestors}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Generations</span>
                <p className="text-2xl font-serif font-semibold mt-1 text-[#7b8e7f] dark:text-[#9cb2a2]">
                  {totalGenerations}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-[#7b8e7f]" />
                <span className="text-xs text-slate-500 font-medium">Average Lifespan</span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{avgLifespan}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-white/2 border border-[#e6e5e0] dark:border-[#2c2c2e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Heart size={16} className="text-[#7b8e7f]" />
                <span className="text-xs text-slate-500 font-medium">Spousal Unions</span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{totalSpousalUnions}</span>
            </div>
          </section>

          {/* Bento: Timeline Milestones (Span 1) */}
          <section className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs space-y-5">
            <h2 className="text-lg font-serif font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock size={16} className="text-[#7b8e7f]" />
              Dynastic Milestones
            </h2>

            <div className="relative pl-4 border-l border-[#e6e5e0] dark:border-[#2c2c2e] space-y-6 text-xs text-slate-500 font-light">
              {timelineMilestones.length > 0 ? (
                timelineMilestones.map((m, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#7b8e7f] dark:bg-[#9cb2a2] border-2 border-white dark:border-[#1a1a1c]" />
                    <span className="font-bold text-slate-700 dark:text-white block font-mono">{m.year}</span>
                    <span className="text-[11px] block mt-0.5">{m.description}</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-slate-400 italic text-xs font-light">
                  Add ancestor birth dates inside your tree canvas to populate dynastic milestones.
                </div>
              )}
            </div>
          </section>

          {/* Bento: Recent Ancestors (Span 2) */}
          <section className="md:col-span-2 p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-serif font-semibold mb-5 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <BookOpen size={16} className="text-[#7b8e7f]" />
                Recent Ancestor Profiles
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {recentAncestors.length > 0 ? (
                  recentAncestors.map((p) => {
                    const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '???';
                    const death = p.death_date ? new Date(p.death_date).getFullYear() : p.death_date === null ? 'Present' : '???';
                    return (
                      <div key={p.id} className="p-4 rounded-xl border border-[#e6e5e0] dark:border-[#2c2c2e] bg-[#faf9f6]/40 dark:bg-white/2 space-y-1.5 text-left">
                        <h4 className="font-bold text-sm truncate">{p.first_name} {p.last_name || ''}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{birth} – {death}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic font-light">
                          {p.biography ? `"${p.biography}"` : 'No biographical record yet.'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 py-10 text-center border border-dashed border-[#e6e5e0] dark:border-[#2c2c2e] rounded-xl text-slate-400 italic text-xs font-light">
                    Preserve historical ancestors on your canvas to populate dynamic vitals profiles.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Create Tree Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-2xl relative">
            <h3 className="text-2xl font-serif font-semibold text-slate-800 dark:text-white mb-2">
              Document New Lineage
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-light">
              Provide a name for this genealogical archive. You will be able to configure dynamic schema custom fields inside the canvas workspace.
            </p>

            <form onSubmit={handleCreateTree} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Tree / Family Surname Name
                </label>
                <input
                  type="text"
                  required
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  placeholder="e.g. Trah Kartowidjojo Javanese Dynasty"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm"
                >
                  {creating ? 'Creating Archive...' : 'Create Lineage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tree Alert Dialog Modal */}
      {showDeleteModal && treeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5]">
            <h3 className="text-2xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
              Erase Lineage Archive
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to permanently erase the family tree <strong className="text-slate-800 dark:text-white">"{treeToDelete.name}"</strong>? This action is completely irreversible and will permanently delete all documented ancestors, connections, audit logs, and custom fields from the database.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTreeToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTree}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm"
              >
                {deleting ? 'Deleting Archive...' : 'Delete Permanently'}
              </button>
            </div>
      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5]">
            <h3 className="text-2xl font-serif font-semibold text-slate-800 dark:text-white mb-2">
              Manage Historical Profile
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-light">
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

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
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
                  onChange={(e) => setProfileEmail(e.target.value)}
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
                  onChange={(e) => setProfilePassword(e.target.value)}
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
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    placeholder="Verify new security password"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-500 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#e6e5e0] dark:border-[#2c2c2e] text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm"
                >
                  {updatingProfile ? 'Updating Credentials...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
