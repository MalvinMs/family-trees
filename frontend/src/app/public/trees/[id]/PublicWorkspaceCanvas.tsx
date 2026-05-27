'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTreeStore, Person } from '../../../../store/treeStore';
import { ArrowLeft, Sun, Moon, X, MapPin, AlignLeft, BookOpen, Clock, HelpCircle } from 'lucide-react';
import PersonNode from '../../../components/PersonNode';

export default function PublicTreeWorkspacePage() {
  const { id } = useParams() as { id: string };
  const { activeTree, fetchPublicTreeDetail, loading, error } = useTreeStore();
  const router = useRouter();

  // State for Canvas Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Panels & View state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Register Custom Node Type
  const nodeTypes = useMemo(() => ({
    personNode: PersonNode,
  }), []);

  // Fetch Public Tree Details on Mount
  useEffect(() => {
    if (id) {
      fetchPublicTreeDetail(id);
    }
  }, [id, fetchPublicTreeDetail]);

  // Sync Theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('kinova_theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, []);

  // Map API members into React Flow Nodes and Edges
  useEffect(() => {
    if (!activeTree) return;

    const flowNodes = activeTree.persons.map((person) => {
      const position = person.ui_metadata || { x: Math.random() * 300, y: Math.random() * 300 };
      return {
        id: person.id,
        type: 'personNode',
        position,
        data: {
          person,
          onEdit: () => {}, // Disable editing actions
          onDelete: () => {},
          isDarkMode,
        },
      };
    });

    const flowEdges = activeTree.relationships.map((rel) => {
      let strokeColor = isDarkMode ? '#818cf8' : '#6366f1'; // Default: Indigo
      let strokeDash = '0';
      let animated = false;

      if (rel.relation_type === 'spouse') {
        strokeColor = isDarkMode ? '#f472b6' : '#db2777'; // Spouse: Pink
        strokeDash = '4 4';
      } else if (rel.relation_type === 'sibling') {
        strokeColor = isDarkMode ? '#34d399' : '#10b981'; // Sibling: Emerald
        strokeDash = '2 2';
      } else if (rel.relation_type === 'parent') {
        strokeColor = isDarkMode ? '#818cf8' : '#6366f1'; // Parent: Indigo
        animated = true;
      } else if (rel.relation_type === 'adopted') {
        strokeColor = isDarkMode ? '#a78bfa' : '#8b5cf6'; // Adopted: Violet
        strokeDash = '3 3';
      }

      return {
        id: rel.id,
        source: rel.person_a,
        target: rel.person_b,
        sourceHandle: rel.source_handle || (rel.relation_type === 'spouse' ? 'partner-left' : 'child-out'),
        targetHandle: rel.target_handle || (rel.relation_type === 'spouse' ? 'partner-right' : 'parent-in'),
        animated,
        type: 'smoothstep',
        style: {
          stroke: strokeColor,
          strokeWidth: 1.5,
          strokeDasharray: strokeDash,
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [activeTree, isDarkMode, setNodes, setEdges]);

  // Handle Node click to load sliding details Drawer
  const onNodeClick = useCallback(
    (event: any, node: Node) => {
      const person = activeTree?.persons.find((p) => p.id === node.id);
      if (person) {
        setSelectedPerson(person);
      }
    },
    [activeTree]
  );

  // Toggle Theme & Persist in LocalStorage
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('kinova_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // Filtered members for Search Functionality
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim() || !activeTree) return [];
    return activeTree.persons.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.last_name && p.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, activeTree]);

  // Zoom onto search result node
  const handleSearchResultClick = (person: Person) => {
    setSearchQuery('');
    setSelectedPerson(person);
    const flowNode = nodes.find((n) => n.id === person.id);
    if (flowNode) {
      // Focus on the clicked node by centering it
      const updatedNodes = nodes.map((n) => ({
        ...n,
        selected: n.id === person.id,
      }));
      setNodes(updatedNodes);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
        <p className="font-serif italic text-lg animate-pulse">Unlocking family archives...</p>
      </div>
    );
  }

  if (error || !activeTree) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${isDarkMode ? 'bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
        <div className="max-w-md p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-4">
          <HelpCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Archive Not Accessible</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            The tree you are trying to view is either private or does not exist. Please contact the administrator to get a public share link.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDarkMode ? 'bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'} transition-colors duration-300`}>
      
      {/* Premium Minimalist Top Header */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-white/5 bg-[#121213]/90' : 'border-slate-200/60 bg-[#faf9f6]/95'} backdrop-blur-md z-10`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className={`p-2 rounded-full border transition-all ${
              isDarkMode
                ? 'border-white/5 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:shadow-xs'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-lg font-bold flex items-center gap-2">
              {activeTree.name}
              <span className="text-[9px] font-sans font-medium px-2 py-0.5 rounded-full tracking-wider uppercase border bg-[#7b8e7f]/10 border-[#7b8e7f]/20 text-[#7b8e7f]">
                Public Archive
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide">
              Read-only genealogical library view
            </p>
          </div>
        </div>

        {/* Global Controls Panel */}
        <div className="flex items-center gap-4">
          
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search family member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`px-4 py-2 w-48 text-xs rounded-full border focus:outline-hidden transition-all ${
                isDarkMode
                  ? 'border-white/5 bg-white/5 focus:bg-white/10 text-white placeholder-slate-500 focus:border-slate-500'
                  : 'border-slate-200 bg-white focus:bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:shadow-xs'
              }`}
            />
            {searchQuery && (
              <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-lg border overflow-hidden max-h-48 overflow-y-auto z-50 ${isDarkMode ? 'bg-[#18181a] border-white/5' : 'bg-white border-slate-200'}`}>
                {filteredPersons.length > 0 ? (
                  filteredPersons.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSearchResultClick(p)}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        isDarkMode
                          ? 'hover:bg-white/5 text-slate-300 hover:text-white'
                          : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      {p.first_name} {p.last_name || ''}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400 font-light italic">No family members found</div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border transition-all ${
              isDarkMode
                ? 'border-white/5 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:shadow-xs'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </header>

      {/* Main Canvas Workspace */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={false} // READ-ONLY: Disallow dragging
          nodesConnectable={false} // READ-ONLY: Disallow connections
          edgesFocusable={false}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          className={isDarkMode ? 'bg-[#121213]' : 'bg-[#faf9f6]'}
        >
          <Background
            color={isDarkMode ? '#2c2c2e' : '#e6e5e0'}
            gap={20}
            size={1.5}
            className="transition-colors duration-300"
          />
          <Controls className={`!shadow-none !border ${isDarkMode ? '!bg-[#1a1a1c] !border-white/5' : '!bg-white !border-slate-200'}`} />
          <MiniMap
            nodeStrokeColor={() => '#7b8e7f'}
            nodeColor={() => (isDarkMode ? '#1a1a1c' : '#ffffff')}
            maskColor={isDarkMode ? 'rgba(18, 18, 19, 0.6)' : 'rgba(250, 249, 246, 0.6)'}
            className={`!border ${isDarkMode ? '!bg-[#121213] !border-white/5' : '!bg-[#faf9f6] !border-slate-200'}`}
          />
        </ReactFlow>

        {/* Sliding Notion-Inspired Details Drawer */}
        {selectedPerson && (
          <div
            className={`absolute z-20 shadow-2xl border-t md:border-t-0 md:border-l flex flex-col transition-all duration-350 w-full h-[70vh] bottom-0 top-auto md:top-0 md:bottom-auto md:right-0 md:w-[380px] md:h-full rounded-t-3xl md:rounded-t-none ${
              isDarkMode
                ? 'bg-[#161618] border-white/5 text-[#f3f3f5]'
                : 'bg-white border-slate-200 text-[#1c1c1e]'
            }`}
          >
            {/* Drawer Header */}
            <div className={`px-6 py-5 flex items-center justify-between border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-sans tracking-widest uppercase font-semibold">Ancestor Memoir</span>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className={`p-1.5 rounded-full transition-all ${
                  isDarkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable memoirs content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              
              {/* Profile Card Vitals */}
              <div className="space-y-2 text-left">
                <h3 className={`font-serif text-2xl font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPerson.first_name} {selectedPerson.last_name || ''}
                </h3>
                
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 tracking-wider">
                  <span className="capitalize">{selectedPerson.gender}</span>
                  <span>•</span>
                  <span>
                    {selectedPerson.birth_date ? new Date(selectedPerson.birth_date).getFullYear() : '???'} –{' '}
                    {selectedPerson.death_date ? new Date(selectedPerson.death_date).getFullYear() : selectedPerson.death_date === null ? 'Present' : '???'}
                  </span>
                </div>
              </div>

              {/* Narratives Section */}
              {selectedPerson.biography ? (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <AlignLeft className="w-3.5 h-3.5" />
                    <h4 className="text-[9px] font-mono tracking-widest uppercase font-semibold">Biography</h4>
                  </div>
                  <blockquote className={`pl-4 border-l-2 text-xs italic leading-relaxed py-1 ${
                    isDarkMode ? 'border-[#7b8e7f]/40 text-slate-300' : 'border-[#7b8e7f]/60 text-slate-600'
                  }`}>
                    "{selectedPerson.biography}"
                  </blockquote>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <AlignLeft className="w-3.5 h-3.5" />
                    <h4 className="text-[9px] font-mono tracking-widest uppercase font-semibold">Biography</h4>
                  </div>
                  <p className="text-xs italic text-slate-400 font-light">No biographical annals recorded yet.</p>
                </div>
              )}

              {/* Dynamic Metadata Attributes */}
              {selectedPerson.dynamic_data && Object.keys(selectedPerson.dynamic_data).length > 0 && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <h4 className="text-[9px] font-mono tracking-widest uppercase font-semibold">Dynamic Vitals</h4>
                  </div>
                  <div className={`rounded-xl border p-4 space-y-3 ${isDarkMode ? 'bg-[#1c1c1f]/40 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                    {Object.entries(selectedPerson.dynamic_data).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <div key={key} className="flex justify-between items-center text-xs pb-2 border-b last:border-b-0 last:pb-0 border-slate-100 dark:border-white/5">
                          <span className="text-slate-400 capitalize font-medium">{key.replace('_', ' ')}</span>
                          <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynastic milestones */}
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <h4 className="text-[9px] font-mono tracking-widest uppercase font-semibold">Dynastic Timeline</h4>
                </div>
                <div className="relative pl-5 border-l border-slate-200 dark:border-white/5 space-y-4 py-1 ml-2 text-xs">
                  {selectedPerson.birth_date && (
                    <div className="relative">
                      <span className="absolute -left-[24.5px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#161618]" />
                      <div className="font-semibold">Birth</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(selectedPerson.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <span className={`absolute -left-[24.5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#161618] ${
                      selectedPerson.death_date ? 'bg-rose-500' : 'bg-blue-500'
                    }`} />
                    <div className="font-semibold">{selectedPerson.death_date ? 'Departed' : 'Present'}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {selectedPerson.death_date
                        ? new Date(selectedPerson.death_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'Currently living and recording history.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
