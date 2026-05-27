import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTreeStore } from '../store/treeStore';
import { Network, Calendar, Trash2, Eye } from 'lucide-react';
import Header from './components/dashboard/Header';
import MetricsGrid from './components/dashboard/MetricsGrid';
import DynasticMilestones from './components/dashboard/DynasticMilestones';
import RecentAncestors from './components/dashboard/RecentAncestors';
import CreateTreeModal from './components/dashboard/CreateTreeModal';
import DeleteTreeModal from './components/dashboard/DeleteTreeModal';
import UserProfileModal from './components/dashboard/UserProfileModal';

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

  const navigate = useNavigate();

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
      navigate('/login');
    } else if (token) {
      fetchTrees(token);
    }
  }, [isAuthenticated, token, navigate]);

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
      navigate(`/trees/${created.id}`);
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
          navigate(`/trees/${imported.id}`);
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
    navigate('/login');
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
      <div className="max-w-6xl mx-auto text-left">
        {/* Header */}
        <Header
          userName={user?.name || ''}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onShowCreateModal={() => setShowCreateModal(true)}
          onShowProfileModal={() => setShowProfileModal(true)}
          onImportTree={handleImportTree}
          onLogout={handleLogout}
        />

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bento: Trees List (Span 2) */}
          <section className="lg:col-span-2 p-6 md:p-8 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs flex flex-col justify-between">
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
                    className="px-4 py-2 rounded-lg bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-[#faf9f6] transition-all cursor-pointer"
                  >
                    Start Documentation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trees.map((tree) => (
                    <div
                      key={tree.id}
                      onClick={() => navigate(`/trees/${tree.id}`)}
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
                        <span className="p-2.5 rounded-full bg-[#7b8e7f]/10 dark:bg-[#9cb2a2]/15 text-[#7b8e7f] dark:text-[#9cb2a2] hover:bg-[#7b8e7f]/20 dark:hover:bg-[#9cb2a2]/25 transition-all" title="View canvas">
                          <Eye size={16} />
                        </span>
                        <button
                          onClick={(e) => handleDeleteTreeClick(e, tree)}
                          className="p-2 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-slate-400 hover:text-red-500 transition-all pointer-events-auto cursor-pointer"
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
          <MetricsGrid
            totalAncestors={totalAncestors}
            totalGenerations={totalGenerations}
            avgLifespan={avgLifespan}
            totalSpousalUnions={totalSpousalUnions}
          />

          {/* Bento: Timeline Milestones (Span 1) */}
          <DynasticMilestones milestones={timelineMilestones} />

          {/* Bento: Recent Ancestors (Span 2) */}
          <div className="lg:col-span-2">
            <RecentAncestors ancestors={recentAncestors} />
          </div>
        </div>
      </div>

      {/* Modals Compartment */}
      <CreateTreeModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newTreeName={newTreeName}
        onNameChange={setNewTreeName}
        onSubmit={handleCreateTree}
        creating={creating}
      />

      <DeleteTreeModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTreeToDelete(null);
        }}
        treeToDelete={treeToDelete}
        onConfirm={handleConfirmDeleteTree}
        deleting={deleting}
      />

      <UserProfileModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profileName={profileName}
        onNameChange={setProfileName}
        profileEmail={profileEmail}
        onEmailChange={setProfileEmail}
        profilePassword={profilePassword}
        onPasswordChange={setProfilePassword}
        profileConfirmPassword={profileConfirmPassword}
        onConfirmPasswordChange={setProfileConfirmPassword}
        profileError={profileError}
        profileSuccess={profileSuccess}
        onSubmit={handleProfileSubmit}
        updating={updatingProfile}
      />
    </main>
  );
}
