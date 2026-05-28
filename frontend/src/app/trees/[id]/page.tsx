import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  reconnectEdge,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuthStore } from '../../../store/authStore';
import { useTreeStore } from '../../../store/treeStore';
import type { Person, Relationship } from '../../../store/treeStore';
import { ArrowLeft, UserPlus, Settings, Trash2, Sun, Moon, X, Clock, AlignLeft, MessageSquare, Send, History, Users, Download, Globe, Copy, Check, Menu, Sparkles, Pencil, Layers, Activity, ArrowRight } from 'lucide-react';
import PersonNode from '../../components/PersonNode';
import DeleteTreeModal from '../../components/dashboard/DeleteTreeModal';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getAutoLayoutedNodes, type LayoutAlgorithmType } from '../../utils/layoutUtils';

function TreeWorkspace() {
  const { id } = useParams() as { id: string };
  const { token, initialize, isAuthenticated, user } = useAuthStore();
  const {
    activeTree,
    fetchTreeDetail,
    addPerson,
    updatePerson,
    deletePerson,
    addRelationship,
    updateRelationship,
    deleteRelationship,
    addCustomField,
    collaborators,
    activities,
    comments,
    fetchCollaborators,
    shareTree,
    removeCollaborator,
    fetchActivities,
    fetchComments,
    addComment,
    deleteComment,
    fetchPersonDetail,
    updateNodePositionLocal,
    patchNodePositionSSE,
    addPersonLocal,
    updatePersonLocal,
    deletePersonLocal,
    addRelationshipLocal,
    deleteRelationshipLocal,
    updateMultipleNodesPositionsLocal,
    saveBulkPositions,
    updateTree,
    deleteTree,
    loading,
  } = useTreeStore();

  const navigate = useNavigate();
  const { fitView } = useReactFlow();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingTreeName, setIsEditingTreeName] = useState(false);
  const [treeNameInput, setTreeNameInput] = useState('');
  const [savingTreeName, setSavingTreeName] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Reusable custom Confirm & Alert dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: '',
    message: '',
  });

  // State for Canvas Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Modals & Panels State
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAutoArrangeMenu, setShowAutoArrangeMenu] = useState(false);
  const [submittingPerson, setSubmittingPerson] = useState(false);
  const [submittingRelation, setSubmittingRelation] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Comments / Notes Form State
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Invite Collaborator Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [inviting, setInviting] = useState(false);

  // New Person Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [biography, setBiography] = useState('');
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});

  // New Relation Form State
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [sourceHandle, setSourceHandle] = useState<string | null>(null);
  const [targetHandle, setTargetHandle] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<'parent' | 'spouse' | 'sibling' | 'adopted'>('spouse');

  // New Custom Field State
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'date' | 'dropdown' | 'tag'>('text');

  // React Flow custom node mappings
  const nodeTypes = useMemo(() => ({
    personNode: PersonNode
  }), []);

  // Initialize Authentication & Fetch Details
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

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('auth_token')) {
      navigate('/login');
    } else if (token && id) {
      fetchTreeDetail(token, id);
    }
  }, [isAuthenticated, token, id]);

  // Initialize Laravel Echo with Reverb and subscribe to real-time events!
  useEffect(() => {
    if (!token || !id) return;

    // Set Pusher globally for Echo
    (window as any).Pusher = Pusher;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const host = new URL(API_URL).hostname;

    const echo = new Echo({
      broadcaster: 'reverb',
      key: 'kinova_key',
      wsHost: host,
      wsPort: 8080,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${API_URL}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    const channel = echo.private(`tree.${id}`);

    channel
      .listen('.PersonCreated', (e: { person: Person }) => {
        addPersonLocal(e.person);
      })
      .listen('.PersonUpdated', (e: { person: Person }) => {
        updatePersonLocal(e.person.id, e.person);
      })
      .listen('.PersonDeleted', (e: { personId: string }) => {
        deletePersonLocal(e.personId);
      })
      .listen('.RelationshipCreated', (e: { relationship: Relationship }) => {
        addRelationshipLocal(e.relationship);
      })
      .listen('.RelationshipDeleted', (e: { relationshipId: string }) => {
        deleteRelationshipLocal(e.relationshipId);
      })
      .listen('.CommentCreated', (e: { comment: any }) => {
        if (selectedPerson && selectedPerson.id === e.comment.person_id) {
          fetchComments(token, selectedPerson.id);
        }
        fetchActivities(token, id);
      })
      .listen('.BulkPositionsUpdated', (e: { positions: { id: string; x: number; y: number }[] }) => {
        // Peer canvas: snap all nodes to the new auto-layout positions instantly
        updateMultipleNodesPositionsLocal(e.positions);
        setNodes((prevNodes) =>
          prevNodes.map((node) => {
            const match = e.positions.find((p) => p.id === node.id);
            return match ? { ...node, position: { x: match.x, y: match.y } } : node;
          })
        );
      })
      .listenForWhisper('node-dragging', (data: { id: string; x: number; y: number }) => {
        // Optimistic, ultra-fast client-to-client drag update at 60 FPS!
        patchNodePositionSSE(data.id, data.x, data.y);
        setNodes((prevNodes) =>
          prevNodes.map((node) =>
            node.id === data.id
              ? { ...node, position: { x: data.x, y: data.y } }
              : node
          )
        );
      });

    // Save echo reference in window to trigger whispers in dragging handler
    (window as any).echoInstance = echo;

    return () => {
      channel.unsubscribe();
      echo.disconnect();
    };
  }, [id, token, selectedPerson, addPersonLocal, updatePersonLocal, deletePersonLocal, addRelationshipLocal, deleteRelationshipLocal, patchNodePositionSSE, fetchComments, fetchActivities, setNodes]);

  useEffect(() => {
    if (token && id) {
      fetchCollaborators(token, id);
      fetchActivities(token, id);
    }
  }, [token, id]);

  useEffect(() => {
    if (token && selectedPerson) {
      fetchComments(token, selectedPerson.id);
    }
  }, [token, selectedPerson]);

  // Sync activeTree data to React Flow Nodes & Edges
  useEffect(() => {
    if (!activeTree) return;

    const hasActiveHover = hoveredNodeId !== null || hoveredEdgeId !== null;

    // Helper: Determine if a person node is related to the hovered element
    const isNodeHighlighted = (personId: string) => {
      if (!hasActiveHover) return true; // Default: no hover = all highlighted
      
      if (hoveredEdgeId !== null) {
        // If an edge is hovered, only its source and target nodes are highlighted
        const edge = activeTree.relationships.find((r) => r.id === hoveredEdgeId);
        if (edge) {
          return edge.person_a === personId || edge.person_b === personId;
        }
      }

      if (hoveredNodeId !== null) {
        // If a node is hovered, it and its direct relatives are highlighted
        if (personId === hoveredNodeId) return true;
        return activeTree.relationships.some(
          (r) =>
            (r.person_a === hoveredNodeId && r.person_b === personId) ||
            (r.person_b === hoveredNodeId && r.person_a === personId)
        );
      }

      return false;
    };

    // Map Persons to React Flow Nodes
    const flowNodes: Node[] = activeTree.persons.map((person) => {
      const isHighlighted = isNodeHighlighted(person.id);
      return {
        id: person.id,
        type: 'personNode',
        position: { x: person.ui_metadata?.x || 100, y: person.ui_metadata?.y || 100 },
        data: {
          person,
          onEdit: handleEditPersonClick,
          onDelete: handleDeletePersonClick,
          isDarkMode,
          opacity: isHighlighted ? 1.0 : 0.25,
        },
      };
    });

    // Map Relationships to React Flow Edges
    const flowEdges: Edge[] = activeTree.relationships.map((rel) => {
      let strokeColor = isDarkMode ? '#818cf8' : '#6366f1'; // Default Parent/Child: Indigo
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
        strokeColor = isDarkMode ? '#a78bfa' : '#8b5cf6'; // Adopted: Purple/Violet
        strokeDash = '3 3';
      }

      // Highlight logic for edges
      let isHighlighted = false;
      let opacity = 1.0;
      let strokeWidth = 1.5;

      if (hasActiveHover) {
        if (hoveredEdgeId !== null && rel.id === hoveredEdgeId) {
          isHighlighted = true;
        } else if (hoveredNodeId !== null && (rel.person_a === hoveredNodeId || rel.person_b === hoveredNodeId)) {
          isHighlighted = true;
        }

        if (isHighlighted) {
          strokeWidth = hoveredEdgeId !== null ? 3.5 : 3.0;
          animated = true;
        } else {
          opacity = 0.15;
          strokeWidth = 1.0;
          animated = false;
        }
      }

      return {
        id: rel.id,
        source: rel.person_a,
        target: rel.person_b,
        sourceHandle: rel.source_handle || (rel.relation_type === 'spouse' ? 'partner-left' : 'child-out'),
        targetHandle: rel.target_handle || (rel.relation_type === 'spouse' ? 'partner-right' : 'parent-in'),
        animated,
        style: { stroke: strokeColor, strokeWidth, strokeDasharray: strokeDash, opacity, transition: 'all 0.3s ease' },
        type: 'smoothstep',
        data: { relationType: rel.relation_type },
        interactionWidth: 24, // Greatly improves touch target hitboxes on mobile devices
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [activeTree, isDarkMode, hoveredNodeId, hoveredEdgeId]);

  // Simple custom debounce helper to save coordinate updates after drag settles
  const debouncedUpdateCoords = useMemo(() => {
    let timeoutId: any = null;
    return (authToken: string, personId: string, uiMetadata: any) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await useTreeStore.getState().updatePerson(authToken, personId, { ui_metadata: uiMetadata });
        } catch (err) {
          console.error('Failed to persist coordinate drag:', err);
        }
      }, 500);
    };
  }, []);

  // Active coordinate dragging C2C whispering over WebSocket Reverb
  const onNodeDrag = useCallback(
    (_event: any, node: Node) => {
      const echo = (window as any).echoInstance;
      if (echo && id) {
        echo.private(`tree.${id}`).whisper('node-dragging', {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        });
      }
    },
    [id]
  );

  // Handle Drag & Drop Nodes coordinate persistence
  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      if (!token || !activeTree) return;
      const person = activeTree.persons.find((p) => p.id === node.id);
      if (!person) return;

      const updatedUi = {
        ...person.ui_metadata,
        x: node.position.x,
        y: node.position.y,
      };

      // 1. Optimistic Instant local update in Zustand at 60 FPS
      updateNodePositionLocal(node.id, node.position.x, node.position.y);

      // 2. Debounced persistence in PostgreSQL database
      debouncedUpdateCoords(token, node.id, updatedUi);
    },
    [activeTree, token, updateNodePositionLocal, debouncedUpdateCoords]
  );

  // Connection Handler (Drawing relationship lines directly on canvas!)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setPersonA(connection.source);
      setPersonB(connection.target);
      setSourceHandle(connection.sourceHandle || null);
      setTargetHandle(connection.targetHandle || null);
      setRelationType('spouse');
      setShowRelationModal(true);
    },
    [token]
  );

  // Reconnect Handler (Interactive dragging & reconnecting lines to different handles)
  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      if (!token || !id) return;

      const oldRel = activeTree?.relationships.find((r) => r.id === oldEdge.id);
      if (!oldRel) return;

      // 1. Optimistic instant local update on the canvas (60 FPS)
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));

      // 2. Resolve fallback values to ensure handles do not reset to defaults
      const fallbackSourceHandle = oldRel.source_handle || (oldRel.relation_type === 'spouse' ? 'partner-left' : 'child-out');
      const fallbackTargetHandle = oldRel.target_handle || (oldRel.relation_type === 'spouse' ? 'partner-right' : 'parent-in');

      const finalSourceHandle = newConnection.sourceHandle || fallbackSourceHandle;
      const finalTargetHandle = newConnection.targetHandle || fallbackTargetHandle;

      try {
        // 3. Make direct PUT request to update relationship handles on the backend
        await updateRelationship(token, oldEdge.id, {
          source_handle: finalSourceHandle,
          target_handle: finalTargetHandle,
        });
      } catch (err) {
        console.error('Failed to reconnect relationship line:', err);
      }
    },
    [token, id, activeTree, updateRelationship, setEdges]
  );

  // Track connection drag state for Excalidraw-style drop-anywhere behaviour
  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // Auto-Layout: compute Dagre positions, patch local canvas, persist to DB
  const handleTriggerAutoLayout = useCallback(async (algorithm: LayoutAlgorithmType) => {
    if (!activeTree || !token || nodes.length === 0) return;

    setConfirmDialog({
      show: true,
      title: 'Auto-Arrange Family Tree',
      message: `Automatically re-arrange all family nodes using the selected layout? This will reposition all cards and save to the database.`,
      onConfirm: async () => {
        // 1. Calculate optimal positions based on selected algorithm
        const newPositions = getAutoLayoutedNodes(nodes, edges, algorithm);

        // 2. Instant optimistic local update (60 FPS, no flicker)
        updateMultipleNodesPositionsLocal(newPositions);
        setNodes((prevNodes) =>
          prevNodes.map((node) => {
            const match = newPositions.find((p) => p.id === node.id);
            return match ? { ...node, position: { x: match.x, y: match.y } } : node;
          })
        );

        // 3. Persist to PostgreSQL and broadcast to collaborators via Reverb
        await saveBulkPositions(token, activeTree.id, newPositions);

        // 4. Animate view focus smoothly
        setTimeout(() => {
          fitView({ duration: 800, padding: 0.2 });
        }, 100);
      },
    });
  }, [activeTree, token, nodes, edges, updateMultipleNodesPositionsLocal, saveBulkPositions, setNodes, fitView]);

  // Edge Deletion Handler (When user clicks a line and presses Backspace/Delete on keyboard)
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (!token) return;
      edgesToDelete.forEach((edge) => {
        deleteRelationship(token, edge.id);
      });
    },
    [token]
  );

  // Toggle Theme & Persist in LocalStorage
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('kinova_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // Handle Node click to load sliding details Drawer (loads full details on-demand!)
  const onNodeClick = useCallback(
    async (_event: any, node: Node) => {
      const person = activeTree?.persons.find((p) => p.id === node.id);
      if (person) {
        setSelectedPerson(person);
        setShowHistoryDrawer(false);
        
        if (token) {
          const fullPerson = await fetchPersonDetail(token, person.id);
          if (fullPerson) {
            setSelectedPerson(fullPerson);
          }
        }
      }
    },
    [activeTree, token, fetchPersonDetail]
  );

  // Edit Person Click (loads full details on-demand if dynamic_data is missing)
  const handleEditPersonClick = async (person: Person) => {
    let fullPerson = person;
    if (token && (!person.dynamic_data || Object.keys(person.dynamic_data).length === 0)) {
      const fetched = await fetchPersonDetail(token, person.id);
      if (fetched) {
        fullPerson = fetched;
      }
    }
    setEditingPerson(fullPerson);
    setFirstName(fullPerson.first_name);
    setLastName(fullPerson.last_name || '');
    setGender(fullPerson.gender);
    setBirthDate(fullPerson.birth_date ? fullPerson.birth_date.split('T')[0] : '');
    setDeathDate(fullPerson.death_date ? fullPerson.death_date.split('T')[0] : '');
    setBiography(fullPerson.biography || '');
    setDynamicData(fullPerson.dynamic_data || {});
    setShowPersonModal(true);
  };

  // Delete Person
  const handleDeletePersonClick = (personId: string) => {
    if (!token) return;
    if (confirm('Are you sure you want to remove this family member and all their relationships?')) {
      deletePerson(token, personId);
    }
  };

  // Form submits
  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || submittingPerson) return;
    setSubmittingPerson(true);

    try {
      const payload = {
        tree_id: id,
        first_name: firstName,
        last_name: lastName || null,
        gender,
        birth_date: birthDate || null,
        death_date: deathDate || null,
        biography: biography || null,
        dynamic_data: dynamicData,
        ui_metadata: editingPerson?.ui_metadata ?? {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        },
      };

      if (editingPerson) {
        await updatePerson(token, editingPerson.id, payload as any);
      } else {
        await addPerson(token, payload as any);
      }

      // Reset Form
      setEditingPerson(null);
      setFirstName('');
      setLastName('');
      setGender('male');
      setBirthDate('');
      setDeathDate('');
      setBiography('');
      setDynamicData({});
      setShowPersonModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPerson(false);
    }
  };

  const handleRelationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !personA || !personB || submittingRelation) return;
    setSubmittingRelation(true);

    try {
      await addRelationship(token, {
        tree_id: id,
        person_a: personA,
        person_b: personB,
        relation_type: relationType as any,
        source_handle: sourceHandle,
        target_handle: targetHandle,
      });
      setShowRelationModal(false);
      setSourceHandle(null);
      setTargetHandle(null);
    } catch (err: any) {
      setAlertDialog({
        show: true,
        title: 'Error Creating Connection',
        message: err.message || 'Failed to create connection',
      });
    } finally {
      setSubmittingRelation(false);
    }
  };

  const handleFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !fieldName) return;

    await addCustomField(token, id, fieldName.trim().toLowerCase().replace(' ', '_'), fieldType);
    setFieldName('');
    setShowFieldModal(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await shareTree(token, {
        tree_id: id,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to share tree access');
    } finally {
      setInviting(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!activeTree || !token) return;
    try {
      await updateTree(token, activeTree.id, { is_public: !activeTree.is_public });
    } catch (err: any) {
      alert(err.message || 'Failed to toggle public settings');
    }
  };

  const handleCopyLink = () => {
    if (!activeTree) return;
    const url = `${window.location.origin}/public/trees/${activeTree.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDeleteTree = async () => {
    if (!activeTree || !token || deleting) return;
    setDeleting(true);
    try {
      await deleteTree(token, activeTree.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete family tree archive');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPerson || !commentContent.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addComment(token, {
        person_id: selectedPerson.id,
        content: commentContent.trim(),
      });
      setCommentContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to add research note');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveTreeName = async () => {
    if (!token || !activeTree || !treeNameInput.trim() || savingTreeName) return;
    setSavingTreeName(true);
    try {
      await updateTree(token, activeTree.id, { name: treeNameInput.trim() });
      setIsEditingTreeName(false);
    } catch (err) {
      console.error('Failed to rename family tree:', err);
    } finally {
      setSavingTreeName(false);
    }
  };

  const handleExport = async (format: 'json' | 'gedcom') => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/trees/${id}/export/${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Failed to export tree in ${format} format`);
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTree?.name.toLowerCase().replace(/\s+/g, '_') || 'tree'}.${format === 'gedcom' ? 'ged' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download export');
    }
  };

  const selectedEdge = edges.find((e) => e.selected);

  if (loading && !activeTree) {
    return (
      <div className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${isDarkMode ? 'dark bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7b8e7f] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className={`flex h-screen w-screen overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-[#121213] text-[#f3f3f5]' : 'bg-[#faf9f6] text-[#1c1c1e]'}`}>
      {/* Top Navbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 pointer-events-none">
        
        {/* Desktop Navbar View */}
        <div className="hidden md:flex items-center justify-between w-full pointer-events-none">
          <div className={`flex items-center justify-between w-full md:w-auto gap-3 pointer-events-auto backdrop-blur border px-4 py-2.5 rounded-xl shadow-xl ${isDarkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
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
                        if (e.key === 'Enter') handleSaveTreeName();
                        if (e.key === 'Escape') setIsEditingTreeName(false);
                      }}
                      autoFocus
                      className={`px-3 py-1.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-1 w-64 ${
                        isDarkMode
                          ? 'bg-slate-950 border-white/15 text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2] focus:ring-offset-slate-900'
                          : 'bg-[#faf9f6] border-slate-300 text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f] focus:ring-offset-white'
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
                    <h1 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} max-w-[150px] sm:max-w-none truncate`}>
                      {activeTree?.name || 'Loading Canvas...'}
                    </h1>
                    {activeTree?.owner_id === user?.id && (
                      <button
                        onClick={() => {
                          setTreeNameInput(activeTree?.name || '');
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
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Kinova Canvas Workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto justify-end flex-wrap">
            <button
              onClick={() => {
                setEditingPerson(null);
                setFirstName('');
                setLastName('');
                setGender('male');
                setBirthDate('');
                setDeathDate('');
                setBiography('');
                setDynamicData({});
                setShowPersonModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.01] transition-all pointer-events-auto ${
                isDarkMode
                  ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                  : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
              }`}
            >
              <UserPlus size={16} />
              <span>Add Family Member</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-white/10 text-amber-400 hover:bg-slate-800'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Light/Dark Mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <button
              onClick={() => setShowFieldModal(true)}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Configure Custom Fields Schema"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Share tree access"
            >
              <Users size={18} />
            </button>

            <button
              onClick={() => {
                setShowHistoryDrawer(true);
                setShowShareModal(false);
                setSelectedPerson(null);
              }}
              className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                    ? 'bg-[#9cb2a2]/10 border-[#9cb2a2]/20 text-[#9cb2a2] hover:bg-[#9cb2a2]/20 hover:text-white'
                    : 'bg-[#7b8e7f]/10 border-[#7b8e7f]/30 text-[#7b8e7f] hover:bg-[#7b8e7f]/20 hover:text-[#4e6153]'
                }`}
                title="Automatically arrange all family nodes inside the canvas"
              >
                <Sparkles size={14} />
                <span className="hidden lg:inline">Auto-Arrange</span>
              </button>
              {showAutoArrangeMenu && (
                <div className={`absolute right-0 mt-2 w-52 rounded-xl shadow-2xl border overflow-hidden z-50 transition-all ${
                  isDarkMode ? 'bg-[#18181a] border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <button
                    onClick={() => {
                      handleTriggerAutoLayout('HIERARCHICAL_TB');
                      setShowAutoArrangeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 hover:text-white' : 'border-slate-100 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Layers size={13} className="text-indigo-400" />
                    Vertical Generation Tree
                  </button>
                  <button
                    onClick={() => {
                      handleTriggerAutoLayout('HIERARCHICAL_LR');
                      setShowAutoArrangeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 hover:text-white' : 'border-slate-100 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <ArrowRight size={13} className="text-emerald-400" />
                    Horizontal Timeline
                  </button>
                  <button
                    onClick={() => {
                      handleTriggerAutoLayout('ORGANIC');
                      setShowAutoArrangeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 hover:text-white' : 'border-slate-100 hover:bg-slate-50 hover:text-slate-950'
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
                    ? 'bg-slate-900/90 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Export family archives"
              >
                <Download size={18} />
              </button>
              {showExportMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-50 transition-all ${
                  isDarkMode ? 'bg-[#18181a] border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <button
                    onClick={() => {
                      handleExport('gedcom');
                      setShowExportMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 hover:text-white' : 'border-slate-100 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    Export GEDCOM (.ged)
                  </button>
                  <button
                    onClick={() => {
                      handleExport('json');
                      setShowExportMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-medium border-b last:border-0 transition-colors ${
                      isDarkMode ? 'border-white/5 hover:bg-white/5 hover:text-white' : 'border-slate-100 hover:bg-slate-50 hover:text-slate-950'
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
                onClick={() => setShowDeleteModal(true)}
                className={`flex items-center justify-center p-2.5 rounded-xl border shadow-xl transition-all ${
                  isDarkMode
                    ? 'bg-rose-950/20 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-350'
                    : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
                }`}
                title="Delete lineage archive"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navbar View */}
        <div className={`flex md:hidden items-center justify-between w-full gap-3 pointer-events-auto backdrop-blur border px-3.5 py-2.5 rounded-xl shadow-xl relative z-50 ${isDarkMode ? 'bg-slate-900/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200'}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
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
                      if (e.key === 'Enter') handleSaveTreeName();
                      if (e.key === 'Escape') setIsEditingTreeName(false);
                    }}
                    autoFocus
                    className={`px-2.5 py-1 rounded-md border text-xs font-bold focus:outline-none focus:ring-2 w-32 ${
                      isDarkMode
                        ? 'bg-slate-950 border-white/15 text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-slate-300 text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
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
                  <h1 className="font-bold text-xs truncate">{activeTree?.name || 'Loading...'}</h1>
                  {activeTree?.owner_id === user?.id && (
                    <button
                      onClick={() => {
                        setTreeNameInput(activeTree?.name || '');
                        setIsEditingTreeName(true);
                      }}
                      className="p-0.5 rounded hover:bg-slate-500/10 text-slate-400"
                    >
                      <Pencil size={9} />
                    </button>
                  )}
                </div>
              )}
              <p className={`text-[8px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Kinova Canvas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingPerson(null);
                setFirstName('');
                setLastName('');
                setGender('male');
                setBirthDate('');
                setDeathDate('');
                setBiography('');
                setDynamicData({});
                setShowPersonModal(true);
              }}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-250'
              }`}
              title="Add Family Member"
            >
              <UserPlus size={15} />
            </button>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`p-2 rounded-lg transition-all ${
                showMobileMenu
                  ? (isDarkMode ? 'bg-white/15 text-white' : 'bg-slate-250 text-slate-955')
                  : (isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
              }`}
            >
              <Menu size={15} />
            </button>
          </div>

          {/* Mobile Dropdown Panel */}
          {showMobileMenu && (
            <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl border p-2.5 shadow-2xl z-50 flex flex-col gap-1 transition-all ${
              isDarkMode ? 'bg-[#18181a]/95 border-white/5 text-slate-300' : 'bg-white/98 border-slate-200 text-slate-700'
            }`}>
              <button
                onClick={() => {
                  toggleTheme();
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-700" />}
                Theme: {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </button>

              <button
                onClick={() => {
                  setShowFieldModal(true);
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Settings size={14} />
                Custom Fields
              </button>

              <button
                onClick={() => {
                  setShowShareModal(true);
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Users size={14} />
                Share Tree
              </button>

              <button
                onClick={() => {
                  setShowHistoryDrawer(true);
                  setShowShareModal(false);
                  setSelectedPerson(null);
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-955'
                }`}
              >
                <History size={14} />
                Activity Logs
              </button>

              <div className={`border-t my-1 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`} />
              
              <div className="px-3 py-1.5 text-[9px] font-mono tracking-widest uppercase font-semibold text-slate-400">
                Auto-Arrange Options
              </div>

              <button
                onClick={() => {
                  handleTriggerAutoLayout('HIERARCHICAL_TB');
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'text-indigo-400 hover:bg-white/5 hover:text-white' : 'text-indigo-650 hover:bg-slate-100 hover:text-slate-955'
                }`}
              >
                <Layers size={14} />
                Vertical Generation Tree
              </button>

              <button
                onClick={() => {
                  handleTriggerAutoLayout('HIERARCHICAL_LR');
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'text-emerald-400 hover:bg-white/5 hover:text-white' : 'text-emerald-650 hover:bg-slate-100 hover:text-slate-955'
                }`}
              >
                <ArrowRight size={14} />
                Horizontal Timeline
              </button>

              <button
                onClick={() => {
                  handleTriggerAutoLayout('ORGANIC');
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'text-rose-400 hover:bg-white/5 hover:text-white' : 'text-rose-650 hover:bg-slate-100 hover:text-slate-955'
                }`}
              >
                <Activity size={14} />
                Organic Dynamic Space
              </button>

              <button
                onClick={() => {
                  handleExport('gedcom');
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Download size={14} />
                Export GEDCOM (.ged)
              </button>

              <button
                onClick={() => {
                  handleExport('json');
                  setShowMobileMenu(false);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Download size={14} />
                Export JSON Backup (.json)
              </button>

              {activeTree?.owner_id === user?.id && (
                <>
                  <div className={`border-t my-1 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`} />
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMobileMenu(false);
                    }}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                      isDarkMode
                        ? 'bg-rose-955/20 border border-rose-500/20 text-rose-455 hover:bg-rose-500/20 hover:text-rose-350'
                        : 'bg-rose-50 border border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700'
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

      {/* Main Canvas Area */}
      <div className={`flex-1 h-full w-full relative${isConnecting ? ' connection-dragging' : ''}`}>
        {loading && (
          <div className={`absolute inset-0 backdrop-blur-xs flex items-center justify-center z-20 ${isDarkMode ? 'bg-[#121213]/60' : 'bg-[#faf9f6]/60'}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7b8e7f] border-t-transparent" />
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onReconnectStart={onConnectStart}
          onReconnectEnd={onConnectEnd}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          nodeTypes={nodeTypes}
          reconnectRadius={30} // Vastly increases hit target radius for dragging/reconnecting lines on mobile devices (React Flow v12 API)
          fitView
          className={`transition-colors duration-300 ${isDarkMode ? 'bg-[#121213]' : 'bg-[#faf9f6]'}`}
        >
          <Background color={isDarkMode ? '#2c2c2e' : '#e6e5e0'} gap={24} size={1} />
          <Controls className={`!border-none ${isDarkMode ? '!bg-[#1a1a1c] !text-white [&_button]:!bg-[#1a1a1c] [&_button]:!text-white' : '!bg-white !text-slate-800 [&_button]:!bg-white [&_button]:!text-slate-800 shadow-md border border-slate-200'}`} />
          <MiniMap className={isDarkMode ? '!bg-[#1a1a1c] !border-white/10' : '!bg-white !border-slate-200 shadow-md'} nodeColor={isDarkMode ? '#2c2c2e' : '#e6e5e0'} />
        </ReactFlow>
      </div>

      {/* Modal: Add/Edit Person */}
      {showPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative transition-all ${isDarkMode ? 'bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]' : 'bg-white border-[#e6e5e0] text-[#1c1c1e]'}`}>
            <h3 className={`text-2xl font-serif font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {editingPerson ? 'Edit Historical Record' : 'Document Family Member'}
            </h3>

            <form onSubmit={handlePersonSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Death Date
                  </label>
                  <input
                    type="date"
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Biography / Historical Context
                </label>
                <textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                      : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                  }`}
                />
              </div>

              {/* Dynamic Field Form Inputs */}
              {(() => {
                const customFields = activeTree?.customFields || (activeTree as any)?.custom_fields;
                if (!customFields || customFields.length === 0) return null;
                return (
                  <div className={`border-t pt-4 mt-4 space-y-4 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-[#9cb2a2]' : 'text-[#7b8e7f]'}`}>
                      Custom Metadata Columns
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {customFields.map((field: any) => (
                        <div key={field.id}>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            {field.field_name.replace('_', ' ')}
                          </label>
                          <input
                            type={field.field_type === 'date' ? 'date' : 'text'}
                            value={dynamicData[field.field_name] || ''}
                            onChange={(e) =>
                              setDynamicData({
                                ...dynamicData,
                                [field.field_name]: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                              isDarkMode
                                ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                                : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className={`flex items-center justify-end gap-3 pt-4 border-t mt-6 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <button
                  type="button"
                  disabled={submittingPerson}
                  onClick={() => setShowPersonModal(false)}
                  className={`px-4 py-2 rounded-lg border transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPerson}
                  className={`px-5 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                      : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
                  }`}
                >
                  {submittingPerson && (
                    <div className={`animate-spin rounded-full h-3.5 w-3.5 border-b-2 ${isDarkMode ? 'border-[#1c1c1e]' : 'border-white'}`} />
                  )}
                  {submittingPerson ? (editingPerson ? 'Saving...' : 'Creating...') : (editingPerson ? 'Save Changes' : 'Create Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Relationship Type Selection */}
      {showRelationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]' : 'bg-white border-[#e6e5e0] text-[#1c1c1e]'}`}>
            <h3 className={`text-xl font-serif font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Select Relationship Type
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-light">
              Establish a graph connection link between these two family nodes.
            </p>

            <form onSubmit={handleRelationSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Connection Link
                </label>
                <select
                  value={relationType}
                  onChange={(e: any) => setRelationType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                      : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
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
                  onClick={() => setShowRelationModal(false)}
                  className={`px-4 py-2 rounded-lg border transition-all text-xs font-semibold ${
                    isDarkMode
                      ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRelation}
                  className={`px-5 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                      : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
                  }`}
                >
                  {submittingRelation && (
                    <div className={`animate-spin rounded-full h-3.5 w-3.5 border-b-2 ${isDarkMode ? 'border-[#1c1c1e]' : 'border-white'}`} />
                  )}
                  {submittingRelation ? 'Linking...' : 'Add Relationship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Fields */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]' : 'bg-white border-[#e6e5e0] text-[#1c1c1e]'}`}>
            <h3 className={`text-xl font-serif font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Configure Custom Field Schema
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-light">
              Add new custom data fields to this specific family silsilah tree (e.g. Clan Name, Origin Marga, Title).
            </p>

            <form onSubmit={handleFieldSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Field Column Name
                </label>
                <input
                  type="text"
                  required
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Clan Name"
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                      : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Input Type
                </label>
                <select
                  value={fieldType}
                  onChange={(e: any) => setFieldType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                      : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                  }`}
                >
                  <option value="text">Single Line Text</option>
                  <option value="date">Date picker</option>
                  <option value="dropdown">Dropdown select list</option>
                  <option value="tag">Tags collection</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className={`px-4 py-2 rounded-lg border transition-all text-xs font-semibold ${
                    isDarkMode
                      ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                    isDarkMode
                      ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                      : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
                  }`}
                >
                  Add Schema Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sliding Person Detail Sidebar / Drawer */}
      {selectedPerson && (
        <aside
          className={`absolute z-30 shadow-2xl overflow-y-auto transition-transform duration-300 flex flex-col justify-between w-full h-[70vh] bottom-0 top-auto md:top-0 md:bottom-auto md:right-0 md:w-[400px] md:h-full border-t md:border-t-0 md:border-l p-6 md:p-8 rounded-t-3xl md:rounded-t-none ${
            isDarkMode
              ? 'bg-[#18181a] border-[#2c2c2e] text-[#f3f3f5]'
              : 'bg-[#faf9f6] border-[#e6e5e0] text-[#1c1c1e]'
          }`}
        >
          <div className="space-y-6">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b pb-5 mb-5 border-slate-200/50 dark:border-white/5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
                  Ancestor Record
                </span>
                <h3 className="text-2xl font-serif font-semibold mt-1 tracking-tight">
                  {selectedPerson.first_name} {selectedPerson.last_name || ''}
                </h3>
                {(selectedPerson.birth_date || selectedPerson.death_date) && (
                  <p className="text-xs text-slate-400 font-mono tracking-wider mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    {selectedPerson.birth_date ? new Date(selectedPerson.birth_date).toLocaleDateString() : '???'} –{' '}
                    {selectedPerson.death_date ? new Date(selectedPerson.death_date).toLocaleDateString() : selectedPerson.death_date === null ? 'Present' : '???'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-white/5 text-slate-500 hover:text-white hover:bg-white/5'
                    : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={14} />
              </button>
            </div>

            {/* Profile Fields section */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-400 font-medium">Gender</span>
                <span className="font-semibold capitalize">{selectedPerson.gender}</span>
              </div>

              {/* Custom schema dynamic fields */}
              {selectedPerson.dynamic_data &&
                Object.entries(selectedPerson.dynamic_data).map(([key, val]) => {
                  if (!val) return null;
                  return (
                    <div key={key} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                      <span className="text-[#7b8e7f] dark:text-[#9cb2a2] font-semibold capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-semibold">{val as any}</span>
                    </div>
                  );
                })}
            </div>

            {/* Biography narrative */}
            {selectedPerson.biography ? (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
                  <AlignLeft size={12} />
                  Historical Narrative
                </h4>
                <p className={`text-xs leading-relaxed font-light whitespace-pre-wrap pl-1 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-650'
                }`}>
                  "{selectedPerson.biography}"
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-[11px]">
                No biography logged yet. Click edit on the card to add a historical context narrative.
              </div>
            )}

            {/* Lineage Connections & Relationships */}
            <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5">
                <Users size={12} />
                Lineage Connections
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(() => {
                  const personRelations = activeTree?.relationships.filter(
                    (r) => r.person_a === selectedPerson.id || r.person_b === selectedPerson.id
                  ) || [];

                  if (personRelations.length === 0) {
                    return (
                      <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-[10px]">
                        No lineage connections registered. Use the canvas handles to draw relations.
                      </div>
                    );
                  }

                  return personRelations.map((rel) => {
                    const otherId = rel.person_a === selectedPerson.id ? rel.person_b : rel.person_a;
                    const otherPerson = activeTree?.persons.find((p) => p.id === otherId);
                    if (!otherPerson) return null;

                    const relTypeLabels: Record<string, string> = {
                      spouse: 'Spouse',
                      parent: rel.person_a === selectedPerson.id ? 'Child' : 'Parent',
                      sibling: 'Sibling',
                      adopted: rel.person_a === selectedPerson.id ? 'Adopted Child' : 'Adopted Parent',
                    };

                    const relationLabel = relTypeLabels[rel.relation_type] || 'Relative';

                    return (
                      <div
                        key={rel.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isDarkMode
                            ? 'bg-[#1e1e20] border-[#2c2c2e] text-slate-300 hover:bg-[#252528]'
                            : 'bg-[#fafaf9] border-[#e6e5e0] text-slate-700 hover:bg-[#f3f3f2]'
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-450'}`}>
                            {relationLabel}
                          </span>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {otherPerson.first_name} {otherPerson.last_name || ''}
                          </span>
                        </div>
                        {token && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmDialog({
                                 show: true,
                                 title: 'Break Relationship Connection',
                                 message: `Are you sure you want to break the connection with ${otherPerson.first_name} permanently?`,
                                 onConfirm: async () => {
                                   try {
                                     await deleteRelationship(token, rel.id);
                                   } catch (err: any) {
                                     setAlertDialog({
                                       show: true,
                                       title: 'Error Breaking Connection',
                                       message: err.message || 'Failed to break connection',
                                     });
                                   }
                                 }
                               });
                             }}
                            className={`px-2.5 py-1 text-[10px] rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                              isDarkMode
                                ? 'bg-rose-955/20 border-rose-500/20 text-rose-455 hover:bg-rose-500/25 hover:text-rose-350'
                                : 'bg-rose-50 border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-750'
                            }`}
                            title="Break connection permanently"
                          >
                            <Trash2 size={11} />
                            <span>Break</span>
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Archival Milestone Timeline */}
            <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5">
                <Clock size={12} />
                Milestone Timelines
              </h4>
              <div className="relative pl-4 border-l border-slate-200 dark:border-[#2c2c2e] space-y-5 text-xs text-slate-400 font-light">
                {selectedPerson.birth_date && (
                  <div className="relative">
                    <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-[#7b8e7f] dark:bg-[#9cb2a2] border-2 border-[#faf9f6] dark:border-[#18181a]" />
                    <span className="font-bold text-slate-700 dark:text-white block font-mono">
                      {new Date(selectedPerson.birth_date).getFullYear()}
                    </span>
                    <span className="text-[10px] block mt-0.5">Birth registration logged.</span>
                  </div>
                )}
                {selectedPerson.death_date && (
                  <div className="relative">
                    <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-[#faf9f6] dark:border-[#18181a]" />
                    <span className="font-bold text-slate-700 dark:text-white block font-mono">
                      {new Date(selectedPerson.death_date).getFullYear()}
                    </span>
                    <span className="text-[10px] block mt-0.5">Departed this life. Heritage documentation closed.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Research Notes & Comments */}
            <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1.5">
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
                          ? 'bg-[#1e1e20] border-[#2c2c2e] text-slate-300'
                          : 'bg-[#fafaf9] border-[#e6e5e0] text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ${
                            isDarkMode ? 'bg-[#2c2c2e] text-slate-300' : 'bg-slate-200 text-slate-750'
                          }`}>
                            {comment.user?.name ? comment.user.name[0] : 'U'}
                          </div>
                          <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {comment.user?.name || 'Unknown User'}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-[11px] leading-relaxed font-light whitespace-pre-wrap break-words pl-1.5">
                        {comment.content}
                      </p>

                      {/* Delete button */}
                      {(activeTree?.owner_id === user?.id || comment.user_id === user?.id) && (
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to delete this research note?')) {
                              try {
                                await deleteComment(token!, comment.id);
                              } catch (err: any) {
                                alert(err.message || 'Failed to delete note');
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
              <form onSubmit={handleCommentSubmit} className="flex gap-2 items-end pt-1">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Add a research finding or note..."
                  rows={1}
                  required
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs resize-none ${
                    isDarkMode
                      ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                      : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                  }`}
                  style={{ minHeight: '34px', maxHeight: '100px' }}
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentContent.trim()}
                  className={`p-2 rounded-lg transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                      : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
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
              onClick={() => handleEditPersonClick(selectedPerson)}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-semibold text-xs shadow-sm transition-all text-center"
            >
              Edit Record
            </button>
            {token && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove this family member and all their relationships?')) {
                    deletePerson(token, selectedPerson.id);
                    setSelectedPerson(null);
                  }
                }}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-rose-955/20 border-rose-500/20 text-rose-455 hover:bg-rose-500/20 hover:text-rose-350'
                    : 'bg-rose-50 border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700'
                }`}
                title="Delete Family Member"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Modal: Share Tree Access */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative transition-all ${
            isDarkMode ? 'bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]' : 'bg-white border-[#e6e5e0] text-[#1c1c1e]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-serif font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Users size={20} className="text-[#7b8e7f] dark:text-[#9cb2a2]" />
                Share Genealogy Canvas
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-white/5 text-slate-500 hover:text-white hover:bg-white/5'
                    : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={14} />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 mb-6 font-light">
              Invite collaborators to view or edit this historical family lineage.
            </p>

            {/* Invite Collaborator Form */}
            {activeTree?.owner_id === user?.id ? (
              <form onSubmit={handleInviteSubmit} className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className={`px-2 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-xs ${
                      isDarkMode
                        ? 'bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]'
                        : 'bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]'
                    }`}
                  >
                    <option value="viewer">Can View</option>
                    <option value="editor">Can Edit</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting}
                    className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center justify-center ${
                      isDarkMode
                        ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                        : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
                    }`}
                  >
                    {inviting ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-lg bg-slate-500/5 text-slate-400 text-[11px] mb-6 font-light">
                Only the tree creator/owner can manage sharing permissions and invite new editors/viewers.
              </div>
            )}

            {/* Public Link Toggle & Copy Section */}
            <div className={`p-4 rounded-xl border mb-6 ${
              isDarkMode ? 'bg-[#121213] border-[#2c2c2e]' : 'bg-[#faf9f6] border-[#e6e5e0]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-[#7b8e7f] dark:text-[#9cb2a2]" />
                  <div className="text-left">
                    <span className="text-xs font-semibold block">Public Archival View</span>
                    <span className="text-[10px] text-slate-400 block font-light">Allow read-only unauthenticated access</span>
                  </div>
                </div>
                {activeTree?.owner_id === user?.id ? (
                  <button
                    onClick={handleTogglePublic}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                      activeTree?.is_public 
                        ? 'bg-[#7b8e7f] dark:bg-[#9cb2a2] justify-end' 
                        : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                    activeTree?.is_public 
                      ? 'bg-[#7b8e7f]/10 text-[#7b8e7f]' 
                      : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {activeTree?.is_public ? 'Active' : 'Private'}
                  </span>
                )}
              </div>

              {activeTree?.is_public && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-white/5 space-y-2 text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                    Public Shareable Link
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/public/trees/${activeTree.id}`}
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-[11px] font-mono focus:outline-none select-all ${
                        isDarkMode
                          ? 'bg-[#1a1a1c] border-[#2c2c2e] text-slate-300'
                          : 'bg-white border-[#e6e5e0] text-slate-650'
                      }`}
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                        copiedLink
                          ? 'bg-[#7b8e7f]/20 text-[#7b8e7f] dark:text-[#9cb2a2] dark:bg-[#9cb2a2]/20 border border-[#7b8e7f]/30'
                          : isDarkMode
                            ? 'bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white'
                            : 'bg-[#1c1c1e] text-white hover:bg-slate-800'
                      }`}
                    >
                      {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List of active collaborators */}
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                People with Access
              </h4>
              
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {/* Tree Owner */}
                <div className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                      isDarkMode ? 'bg-[#2c2c2e] text-[#9cb2a2]' : 'bg-slate-200 text-[#7b8e7f]'
                    }`}>
                      {collaborators?.owner?.name ? collaborators.owner.name[0] : 'O'}
                    </div>
                    <div>
                      <span className="font-semibold block">{collaborators?.owner?.name || 'Unknown Owner'}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{collaborators?.owner?.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7b8e7f]/10 text-[#7b8e7f] dark:text-[#9cb2a2] dark:bg-[#9cb2a2]/10 uppercase tracking-wider">
                    Owner
                  </span>
                </div>

                {/* Collaborators */}
                {collaborators?.collaborators && collaborators.collaborators.length > 0 ? (
                  collaborators.collaborators.map((collab: any) => (
                    <div key={collab.id} className="flex items-center justify-between text-xs py-1 border-b border-dashed border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase ${
                          isDarkMode ? 'bg-[#2c2c2e] text-[#9cb2a2]' : 'bg-slate-200 text-[#7b8e7f]'
                        }`}>
                          {collab.user?.name ? collab.user.name[0] : 'C'}
                        </div>
                        <div>
                          <span className="font-semibold block">{collab.user?.name || 'Unknown User'}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{collab.user?.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          collab.role === 'editor' ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {collab.role}
                        </span>
                        
                        {activeTree?.owner_id === user?.id && (
                          <button
                            onClick={async () => {
                              if (confirm(`Remove access for ${collab.user?.name || 'this user'}?`)) {
                                try {
                                  await removeCollaborator(token!, collab.id);
                                } catch (err: any) {
                                  alert(err.message || 'Failed to remove collaborator');
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
      )}

      {/* sliding Activity Log Drawer */}
      {showHistoryDrawer && (
        <aside
          className={`absolute top-0 right-0 z-30 w-[350px] md:w-[400px] h-full border-l p-8 shadow-2xl overflow-y-auto transition-transform duration-300 flex flex-col ${
            isDarkMode
              ? 'bg-[#18181a] border-[#2c2c2e] text-[#f3f3f5]'
              : 'bg-[#faf9f6] border-[#e6e5e0] text-[#1c1c1e]'
          }`}
        >
          <div className="flex items-start justify-between border-b pb-5 mb-5 border-slate-200/50 dark:border-white/5">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
                Audit Trail
              </span>
              <h3 className="text-xl font-serif font-semibold mt-1 tracking-tight">
                Canvas Modification Logs
              </h3>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-white/5 text-slate-500 hover:text-white hover:bg-white/5'
                  : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X size={14} />
            </button>
          </div>

          {/* Chronological Logs feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {activities && activities.length > 0 ? (
              <div className="relative pl-4 border-l border-slate-200 dark:border-[#2c2c2e] space-y-6 text-xs font-light">
                {activities.map((log: any) => (
                  <div key={log.id} className="relative">
                    <span className={`absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#faf9f6] dark:border-[#18181a] ${
                      log.action.includes('added') || log.action.includes('created')
                        ? 'bg-[#7b8e7f] dark:bg-[#9cb2a2]'
                        : log.action.includes('deleted') || log.action.includes('removed')
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                    }`} />
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-350">
                        {log.user?.name || 'System'}
                      </span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>

                    <p className={`text-[11px] leading-relaxed pl-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-650'}`}>
                      {log.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-xs">
                No canvas logs populated yet. Add, modify or link members to generate events.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Mobile Relationship Deletion Control Panel */}
      {selectedEdge && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-40 shadow-2xl border px-4 py-2.5 rounded-full flex items-center gap-3 backdrop-blur bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-xs font-medium pointer-events-auto">
          <span className="hidden xs:inline text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] font-bold">Union</span>
          <button
            onClick={() => {
              setConfirmDialog({
                show: true,
                title: 'Break Relationship Connection',
                message: 'Erase this family relationship connection permanently?',
                onConfirm: async () => {
                  try {
                    await deleteRelationship(token!, selectedEdge.id);
                  } catch (err: any) {
                    setAlertDialog({
                      show: true,
                      title: 'Error Breaking Connection',
                      message: err.message || 'Failed to break connection',
                    });
                  }
                }
              });
            }}
            className={`px-4 py-1.5 rounded-full font-bold text-[10px] shadow-md flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] border ${
              isDarkMode
                ? 'bg-rose-955/20 border-rose-500/20 text-rose-455 hover:bg-rose-500/25 hover:text-rose-350'
                : 'bg-rose-50 border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700'
            }`}
          >
            <Trash2 size={12} /> Break Connection
          </button>
        </div>
      )}

      {/* Reusable Custom Confirm Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left transition-all scale-100">
            <h3 className="text-xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-light">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#2c2c2e] text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, show: false }));
                }}
                className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                Break Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Custom Alert Modal */}
      {alertDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[#7b8e7f]/20 dark:border-[#9cb2a2]/20 shadow-2xl relative bg-white dark:bg-[#1a1a1c] text-[#1c1c1e] dark:text-[#f3f3f5] text-left transition-all scale-100">
            <h3 className="text-xl font-serif font-semibold text-[#7b8e7f] dark:text-[#9cb2a2] mb-2">
              {alertDialog.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-light">
              {alertDialog.message}
            </p>
            <div className="flex items-center justify-end mt-6">
              <button
                type="button"
                onClick={() => setAlertDialog(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 rounded-lg bg-[#7b8e7f] hover:bg-[#687a6c] dark:bg-[#9cb2a2] dark:hover:bg-[#85988a] text-white dark:text-[#1c1c1e] font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tree Alert Dialog Modal */}
      <DeleteTreeModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        treeToDelete={activeTree}
        onConfirm={handleConfirmDeleteTree}
        deleting={deleting}
      />
    </main>
  );
}

export default function TreeWorkspacePage() {
  return (
    <ReactFlowProvider>
      <TreeWorkspace />
    </ReactFlowProvider>
  );
}
