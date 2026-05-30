import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAuthStore } from "../../../store/authStore";
import { useTreeStore } from "../../../store/treeStore";
import type { Person, Relationship } from "../../../store/treeStore";
import {
  Trash2,
  Plus,
  X,
} from "lucide-react";
import PersonNode from "../../components/PersonNode";
import DeleteTreeModal from "../../components/dashboard/DeleteTreeModal";
import WorkspaceHeader from "./components/WorkspaceHeader";
import SearchPaletteModal from "./components/SearchPaletteModal";
import MemoirDrawer from "./components/MemoirDrawer";
import PersonModal from "./components/PersonModal";
import RelationModal from "./components/RelationModal";
import CustomFieldModal from "./components/CustomFieldModal";
import ShareTreeModal from "./components/ShareTreeModal";
import ConfirmAlertDialog from "./components/ConfirmAlertDialog";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import {
  getAutoLayoutedNodes,
  type LayoutAlgorithmType,
} from "../../utils/layoutUtils";

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
    addRelativeComposite,
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
    updateCustomField,
    deleteCustomField,
    updateCustomFieldLocal,
    deleteCustomFieldLocal,
    loading,
  } = useTreeStore();

  const navigate = useNavigate();
  const { fitView } = useReactFlow();

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
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  // State for Canvas Nodes & Edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Modals & Panels State
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddBaseId, setQuickAddBaseId] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [submittingPerson, setSubmittingPerson] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // States for Quick-Add Relative Modal Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [biography, setBiography] = useState("");

  // States for Canvas Connection Actions
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [sourceHandle, setSourceHandle] = useState<string | null>(null);
  const [targetHandle, setTargetHandle] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<
    "parent" | "spouse" | "sibling" | "adopted" | "child"
  >("spouse");

  // React Flow custom node mappings
  const nodeTypes = useMemo(
    () => ({
      personNode: PersonNode,
    }),
    [],
  );

  // Initialize Authentication & Fetch Details
  useEffect(() => {
    initialize();

    // Load persisted theme
    const savedTheme = localStorage.getItem("kinova_theme");
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchResults(true);
      }
      if (e.key === "Escape") {
        setShowSearchResults(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOpenQuickAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      setQuickAddBaseId(customEvent.detail.basePersonId);
      setShowQuickAddModal(true);
    };

    window.addEventListener("open-quick-add", handleOpenQuickAdd);
    return () => window.removeEventListener("open-quick-add", handleOpenQuickAdd);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem("auth_token")) {
      navigate("/login");
    } else if (token && id) {
      fetchTreeDetail(token, id);
    }
  }, [isAuthenticated, token, id]);

  // Initialize Laravel Echo with Reverb and subscribe to real-time events!
  useEffect(() => {
    if (!token || !id) return;

    // Set Pusher globally for Echo
    (window as any).Pusher = Pusher;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const host = new URL(API_URL).hostname;

    const echo = new Echo({
      broadcaster: "reverb",
      key: "kinova_key",
      wsHost: host,
      wsPort: 8080,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${API_URL}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    const channel = echo.private(`tree.${id}`);

    channel
      .listen(".PersonCreated", (e: { person: Person }) => {
        addPersonLocal(e.person);
      })
      .listen(".PersonUpdated", (e: { person: Person }) => {
        updatePersonLocal(e.person.id, e.person);
      })
      .listen(".PersonDeleted", (e: { personId: string }) => {
        deletePersonLocal(e.personId);
      })
      .listen(".RelationshipCreated", (e: { relationship: Relationship }) => {
        addRelationshipLocal(e.relationship);
      })
      .listen(".RelationshipDeleted", (e: { relationshipId: string }) => {
        deleteRelationshipLocal(e.relationshipId);
      })
      .listen(".CustomFieldCreated", (e: { customField: any }) => {
        const activeTree = useTreeStore.getState().activeTree;
        if (activeTree && activeTree.id === e.customField.tree_id) {
          useTreeStore.setState({
            activeTree: {
              ...activeTree,
              customFields: [...(activeTree.customFields || []), e.customField],
            },
          });
        }
      })
      .listen(".CustomFieldUpdated", (e: { customField: any }) => {
        updateCustomFieldLocal(e.customField.id, e.customField);
      })
      .listen(".CustomFieldDeleted", (e: { customFieldId: string }) => {
        deleteCustomFieldLocal(e.customFieldId);
      })
      .listen(".CommentCreated", (e: { comment: any }) => {
        if (selectedPerson && selectedPerson.id === e.comment.person_id) {
          fetchComments(token, selectedPerson.id);
        }
        fetchActivities(token, id);
      })
      .listen(
        ".BulkPositionsUpdated",
        (e: { positions: { id: string; x: number; y: number }[] }) => {
          // Peer canvas: snap all nodes to the new auto-layout positions instantly
          updateMultipleNodesPositionsLocal(e.positions);
          setNodes((prevNodes) =>
            prevNodes.map((node) => {
              const match = e.positions.find((p) => p.id === node.id);
              return match
                ? { ...node, position: { x: match.x, y: match.y } }
                : node;
            }),
          );
        },
      )
      .listenForWhisper(
        "node-dragging",
        (data: { id: string; x: number; y: number }) => {
          // Optimistic, ultra-fast client-to-client drag update at 60 FPS!
          patchNodePositionSSE(data.id, data.x, data.y);
          setNodes((prevNodes) =>
            prevNodes.map((node) =>
              node.id === data.id
                ? { ...node, position: { x: data.x, y: data.y } }
                : node,
            ),
          );
        },
      );

    // Save echo reference in window to trigger whispers in dragging handler
    (window as any).echoInstance = echo;

    return () => {
      channel.unsubscribe();
      echo.disconnect();
    };
  }, [
    id,
    token,
    selectedPerson,
    addPersonLocal,
    updatePersonLocal,
    deletePersonLocal,
    addRelationshipLocal,
    deleteRelationshipLocal,
    updateCustomFieldLocal,
    deleteCustomFieldLocal,
    patchNodePositionSSE,
    fetchComments,
    fetchActivities,
    setNodes,
  ]);

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
        const edge = activeTree.relationships.find(
          (r) => r.id === hoveredEdgeId,
        );
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
            (r.person_b === hoveredNodeId && r.person_a === personId),
        );
      }

      return false;
    };

    // Map Persons to React Flow Nodes
    const flowNodes: Node[] = activeTree.persons.map((person) => {
      const isHighlighted = isNodeHighlighted(person.id);
      return {
        id: person.id,
        type: "personNode",
        position: {
          x: person.ui_metadata?.x || 100,
          y: person.ui_metadata?.y || 100,
        },
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
      let strokeColor = isDarkMode ? "#818cf8" : "#6366f1"; // Default Parent/Child: Indigo
      let strokeDash = "0";
      let animated = false;

      if (rel.relation_type === "spouse") {
        strokeColor = isDarkMode ? "#f472b6" : "#db2777"; // Spouse: Pink
        strokeDash = "4 4";
      } else if (rel.relation_type === "sibling") {
        strokeColor = isDarkMode ? "#34d399" : "#10b981"; // Sibling: Emerald
        strokeDash = "2 2";
      } else if (rel.relation_type === "parent") {
        strokeColor = isDarkMode ? "#818cf8" : "#6366f1"; // Parent: Indigo
        animated = true;
      } else if (rel.relation_type === "adopted") {
        strokeColor = isDarkMode ? "#a78bfa" : "#8b5cf6"; // Adopted: Purple/Violet
        strokeDash = "3 3";
      }

      // Highlight logic for edges
      let isHighlighted = false;
      let opacity = 1.0;
      let strokeWidth = 1.5;

      if (hasActiveHover) {
        if (hoveredEdgeId !== null && rel.id === hoveredEdgeId) {
          isHighlighted = true;
        } else if (
          hoveredNodeId !== null &&
          (rel.person_a === hoveredNodeId || rel.person_b === hoveredNodeId)
        ) {
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
        sourceHandle:
          rel.source_handle ||
          (rel.relation_type === "spouse" ? "partner-left" : "child-out"),
        targetHandle:
          rel.target_handle ||
          (rel.relation_type === "spouse" ? "partner-right" : "parent-in"),
        animated,
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: strokeDash,
          opacity,
          transition: "all 0.3s ease",
        },
        type: "smoothstep",
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
          await useTreeStore
            .getState()
            .updatePerson(authToken, personId, { ui_metadata: uiMetadata });
        } catch (err) {
          console.error("Failed to persist coordinate drag:", err);
        }
      }, 500);
    };
  }, []);

  // Active coordinate dragging C2C whispering over WebSocket Reverb
  const onNodeDrag = useCallback(
    (_event: any, node: Node) => {
      const echo = (window as any).echoInstance;
      if (echo && id) {
        echo.private(`tree.${id}`).whisper("node-dragging", {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        });
      }
    },
    [id],
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
    [activeTree, token, updateNodePositionLocal, debouncedUpdateCoords],
  );

  // Connection Handler (Drawing relationship lines directly on canvas!)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setPersonA(connection.source);
      setPersonB(connection.target);
      setSourceHandle(connection.sourceHandle || null);
      setTargetHandle(connection.targetHandle || null);
      setRelationType("spouse");
      setShowRelationModal(true);
    },
    [token],
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
      const fallbackSourceHandle =
        oldRel.source_handle ||
        (oldRel.relation_type === "spouse" ? "partner-left" : "child-out");
      const fallbackTargetHandle =
        oldRel.target_handle ||
        (oldRel.relation_type === "spouse" ? "partner-right" : "parent-in");

      const finalSourceHandle =
        newConnection.sourceHandle || fallbackSourceHandle;
      const finalTargetHandle =
        newConnection.targetHandle || fallbackTargetHandle;

      try {
        // 3. Make direct PUT request to update relationship handles on the backend
        await updateRelationship(token, oldEdge.id, {
          source_handle: finalSourceHandle,
          target_handle: finalTargetHandle,
        });
      } catch (err) {
        console.error("Failed to reconnect relationship line:", err);
      }
    },
    [token, id, activeTree, updateRelationship, setEdges],
  );

  // Track connection drag state for Excalidraw-style drop-anywhere behaviour
  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // Clear stuck hover highlight when canvas is panned or a node is dragged
  const onMoveStart = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  }, []);

  const onNodeDragStart = useCallback(() => {
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  }, []);

  // Auto-Layout: compute Dagre positions, patch local canvas, persist to DB
  const handleTriggerAutoLayout = useCallback(
    async (algorithm: LayoutAlgorithmType) => {
      if (!activeTree || !token || nodes.length === 0) return;

      setConfirmDialog({
        show: true,
        title: "Auto-Arrange Family Tree",
        message: `Automatically re-arrange all family nodes using the selected layout? This will reposition all cards and save to the database.`,
        onConfirm: async () => {
          // 1. Calculate optimal positions based on selected algorithm
          const newPositions = getAutoLayoutedNodes(nodes, edges, algorithm);

          // 2. Instant optimistic local update (60 FPS, no flicker)
          updateMultipleNodesPositionsLocal(newPositions);
          setNodes((prevNodes) =>
            prevNodes.map((node) => {
              const match = newPositions.find((p) => p.id === node.id);
              return match
                ? { ...node, position: { x: match.x, y: match.y } }
                : node;
            }),
          );

          // 3. Persist to PostgreSQL and broadcast to collaborators via Reverb
          await saveBulkPositions(token, activeTree.id, newPositions);

          // 4. Animate view focus smoothly
          setTimeout(() => {
            fitView({ duration: 800, padding: 0.2 });
          }, 100);
        },
      });
    },
    [
      activeTree,
      token,
      nodes,
      edges,
      updateMultipleNodesPositionsLocal,
      saveBulkPositions,
      setNodes,
      fitView,
    ],
  );

  // Edge Deletion Handler (When user clicks a line and presses Backspace/Delete on keyboard)
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (!token) return;
      edgesToDelete.forEach((edge) => {
        deleteRelationship(token, edge.id);
      });
    },
    [token],
  );

  // Toggle Theme & Persist in LocalStorage
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("kinova_theme", next ? "dark" : "light");
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
    [activeTree, token, fetchPersonDetail],
  );

  // Edit Person Click (loads full details on-demand if dynamic_data is missing)
  const handleEditPersonClick = async (person: Person) => {
    let fullPerson = person;
    if (
      token &&
      (!person.dynamic_data || Object.keys(person.dynamic_data).length === 0)
    ) {
      const fetched = await fetchPersonDetail(token, person.id);
      if (fetched) {
        fullPerson = fetched;
      }
    }
    setEditingPerson(fullPerson);
    setShowPersonModal(true);
  };

  // Delete Person
  const handleDeletePersonClick = (personId: string) => {
    if (!token) return;
    if (
      confirm(
        "Are you sure you want to remove this family member and all their relationships?",
      )
    ) {
      deletePerson(token, personId);
    }
  };

  // Form submits

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !quickAddBaseId || submittingPerson) return;
    setSubmittingPerson(true);

    try {
      await addRelativeComposite(token, id, {
        first_name: firstName,
        last_name: lastName || undefined,
        gender,
        relation_type: relationType as any,
        birth_date: birthDate || undefined,
        death_date: deathDate || undefined,
        biography: biography || undefined,
        base_person_id: quickAddBaseId,
      });

      // Reset Form
      setFirstName("");
      setLastName("");
      setGender("male");
      setBirthDate("");
      setDeathDate("");
      setBiography("");
      setRelationType("spouse");
      setShowQuickAddModal(false);
      setQuickAddBaseId(null);
    } catch (err: any) {
      setAlertDialog({
        show: true,
        title: "Quick-Add Failed",
        message: err.message || "Failed to create relative connection",
      });
    } finally {
      setSubmittingPerson(false);
    }
  };




  const handleConfirmDeleteTree = async () => {
    if (!activeTree || !token || deleting) return;
    setDeleting(true);
    try {
      await deleteTree(token, activeTree.id);
      navigate("/");
    } catch (err: any) {
      alert(err.message || "Failed to delete family tree archive");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };



  const handleExport = async (format: "json" | "gedcom") => {
    if (!token || !id) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/trees/${id}/export/${format}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error(`Failed to export tree in ${format} format`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTree?.name.toLowerCase().replace(/\s+/g, "_") || "tree"}.${format === "gedcom" ? "ged" : "json"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download export");
    }
  };

  const selectedEdge = edges.find((e) => e.selected);

  if (loading && !activeTree) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${isDarkMode ? "dark bg-[#121213] text-[#f3f3f5]" : "bg-[#faf9f6] text-[#1c1c1e]"}`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7b8e7f] border-t-transparent" />
      </div>
    );
  }

  return (
    <main
      className={`flex h-screen w-screen overflow-hidden relative transition-colors duration-300 ${isDarkMode ? "bg-[#121213] text-[#f3f3f5]" : "bg-[#faf9f6] text-[#1c1c1e]"}`}
    >
      {/* Top Navbar */}
      <WorkspaceHeader
        activeTree={activeTree}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        user={user}
        token={token}
        onOpenSearch={() => {
          setShowSearchResults(true);
        }}
        onOpenPersonModal={() => {
          setEditingPerson(null);
          setShowPersonModal(true);
        }}
        onOpenFieldModal={() => setShowFieldModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenHistoryDrawer={() => {
          setShowHistoryDrawer(true);
          setShowShareModal(false);
          setSelectedPerson(null);
        }}
        onOpenDeleteModal={() => setShowDeleteModal(true)}
        handleTriggerAutoLayout={handleTriggerAutoLayout}
        handleExport={handleExport}
        updateTree={updateTree}
      />

      {/* Command Palette Search Modal */}
      <SearchPaletteModal
        show={showSearchResults}
        onClose={() => {
          setShowSearchResults(false);
        }}
        activeTree={activeTree}
        isDarkMode={isDarkMode}
        fitView={fitView}
      />

      {/* Main Canvas Area */}
      <div
        className={`flex-1 h-full w-full relative${isConnecting ? " connection-dragging" : ""}`}
      >
        {loading && (
          <div
            className={`absolute inset-0 backdrop-blur-xs flex items-center justify-center z-20 ${isDarkMode ? "bg-[#121213]/60" : "bg-[#faf9f6]/60"}`}
          >
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
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onMoveStart={onMoveStart}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={() => setHoveredNodeId(null)}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          nodeTypes={nodeTypes}
          reconnectRadius={30}
          minZoom={0.05}
          maxZoom={2}
          fitView
          className={`transition-colors duration-300 ${isDarkMode ? "bg-[#121213]" : "bg-[#faf9f6]"}`}
        >
          <Background
            color={isDarkMode ? "#2c2c2e" : "#e6e5e0"}
            gap={24}
            size={1}
          />
          <Controls
            className={`!border-none ${isDarkMode ? "!bg-[#1a1a1c] !text-white [&_button]:!bg-[#1a1a1c] [&_button]:!text-white" : "!bg-white !text-slate-800 [&_button]:!bg-white [&_button]:!text-slate-800 shadow-md border border-slate-200"}`}
          />
          <MiniMap
            className={
              isDarkMode
                ? "!bg-[#1a1a1c] !border-white/10"
                : "!bg-white !border-slate-200 shadow-md"
            }
            nodeColor={isDarkMode ? "#2c2c2e" : "#e6e5e0"}
          />
        </ReactFlow>
      </div>

      {/* Modal: Add/Edit Person */}
      <PersonModal
        show={showPersonModal}
        onClose={() => {
          setShowPersonModal(false);
          setEditingPerson(null);
        }}
        person={editingPerson}
        token={token}
        treeId={id}
        addPerson={addPerson}
        updatePerson={updatePerson}
        activeTree={activeTree}
        isDarkMode={isDarkMode}
        fitView={fitView}
      />

      {/* Modal: Relationship Type Selection */}
      <RelationModal
        show={showRelationModal}
        onClose={() => setShowRelationModal(false)}
        personA={personA}
        personB={personB}
        sourceHandle={sourceHandle}
        targetHandle={targetHandle}
        token={token}
        treeId={id}
        addRelationship={addRelationship}
        isDarkMode={isDarkMode}
        setAlertDialog={setAlertDialog}
      />

      {/* Modal: Add Custom Fields */}
      <CustomFieldModal
        show={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        token={token}
        treeId={id}
        activeTree={activeTree}
        addCustomField={addCustomField}
        updateCustomField={updateCustomField}
        deleteCustomField={deleteCustomField}
        isDarkMode={isDarkMode}
      />

      {/* Sliding Person Detail Sidebar / Drawer */}
      <MemoirDrawer
        selectedPerson={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        activeTree={activeTree}
        isDarkMode={isDarkMode}
        token={token}
        user={user}
        addRelationship={addRelationship}
        deleteRelationship={deleteRelationship}
        addRelativeComposite={addRelativeComposite}
        deletePerson={deletePerson}
        onEditPersonClick={handleEditPersonClick}
        setConfirmDialog={setConfirmDialog}
        setAlertDialog={setAlertDialog}
        comments={comments}
        addComment={addComment}
        deleteComment={deleteComment}
      />

      {/* Modal: Quick Add Relative */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative transition-all ${
              isDarkMode
                ? "bg-[#1a1a1c] border-[#2c2c2e] text-[#f3f3f5]"
                : "bg-white border-[#e6e5e0] text-[#1c1c1e]"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-2xl font-serif font-semibold flex items-center gap-2 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Plus
                  size={24}
                  className="text-[#7b8e7f] dark:text-[#9cb2a2]"
                />
                Quick-Add Relative
              </h3>
              <button
                onClick={() => {
                  setShowQuickAddModal(false);
                  setQuickAddBaseId(null);
                }}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isDarkMode
                    ? "border-white/5 text-slate-500 hover:text-white hover:bg-white/5"
                    : "border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={handleQuickAddSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
            >
              <div className="p-3 bg-indigo-550/10 border border-indigo-500/20 rounded-xl mb-2">
                <p className="text-[11px] text-indigo-400 font-medium">
                  Add a new member directly linked to the selected person card.
                  The system will automatically calculate coordinates and graph
                  links.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Relation to Selected Member
                </label>
                <select
                  required
                  value={relationType}
                  onChange={(e: any) => setRelationType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  }`}
                >
                  <option value="child">Child</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                </select>
              </div>

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
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
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
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
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
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
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
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
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
                        ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                        : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Biography
                </label>
                <textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-1 text-sm ${
                    isDarkMode
                      ? "bg-[#121213] border-[#2c2c2e] text-white focus:border-[#9cb2a2] focus:ring-[#9cb2a2]"
                      : "bg-[#faf9f6] border-[#e6e5e0] text-slate-900 focus:border-[#7b8e7f] focus:ring-[#7b8e7f]"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddModal(false);
                    setQuickAddBaseId(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
                    isDarkMode
                      ? "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPerson}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-[0.98] ${
                    isDarkMode
                      ? "bg-[#f3f3f5] text-[#1c1c1e] hover:bg-white"
                      : "bg-[#1c1c1e] text-white hover:bg-slate-800"
                  }`}
                >
                  {submittingPerson ? "Documenting..." : "Add Relative"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Share Tree Access */}
      <ShareTreeModal
        show={showShareModal}
        onClose={() => setShowShareModal(false)}
        activeTree={activeTree}
        collaborators={collaborators}
        user={user}
        token={token}
        shareTree={shareTree}
        updateTree={updateTree}
        removeCollaborator={removeCollaborator}
        isDarkMode={isDarkMode}
      />

      {/* sliding Activity Log Drawer */}
      {showHistoryDrawer && (
        <aside
          className={`absolute top-0 right-0 z-30 w-[350px] md:w-[400px] h-full border-l p-8 shadow-2xl overflow-y-auto transition-transform duration-300 flex flex-col ${
            isDarkMode
              ? "bg-[#18181a] border-[#2c2c2e] text-[#f3f3f5]"
              : "bg-[#faf9f6] border-[#e6e5e0] text-[#1c1c1e]"
          }`}
        >
          <div className="flex items-start justify-between border-b pb-5 mb-5 border-slate-200/50 dark:border-white/5">
            <div className="space-y-1 text-left">
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
                  ? "border-white/5 text-slate-500 hover:text-white hover:bg-white/5"
                  : "border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <X size={14} />
            </button>
          </div>

          {/* Chronological Logs feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {activities && activities.length > 0 ? (
              <div className="relative pl-4 border-l border-slate-200 dark:border-[#2c2c2e] space-y-6 text-xs font-light text-left">
                {activities.map((log: any) => (
                  <div key={log.id} className="relative">
                    <span
                      className={`absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#faf9f6] dark:border-[#18181a] ${
                        log.action.includes("added") ||
                        log.action.includes("created")
                          ? "bg-[#7b8e7f] dark:bg-[#9cb2a2]"
                          : log.action.includes("deleted") ||
                            log.action.includes("removed")
                          ? "bg-red-400"
                          : "bg-amber-400"
                      }`}
                    />

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-350">
                        {log.user?.name || "System"}
                      </span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed pl-0.5 ${
                        isDarkMode ? "text-slate-300" : "text-slate-650"
                      }`}
                    >
                      {log.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-slate-400 font-light text-xs">
                No canvas logs populated yet. Add, modify or link members to
                generate events.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Mobile Relationship Deletion Control Panel */}
      {selectedEdge && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-40 shadow-2xl border px-4 py-2.5 rounded-full flex items-center gap-3 backdrop-blur bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-xs font-medium pointer-events-auto">
          <span className="hidden xs:inline text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px] font-bold">
            Union
          </span>
          <button
            onClick={() => {
              setConfirmDialog({
                show: true,
                title: "Break Relationship Connection",
                message:
                  "Erase this family relationship connection permanently?",
                onConfirm: async () => {
                  try {
                    await deleteRelationship(token!, selectedEdge.id);
                  } catch (err: any) {
                    setAlertDialog({
                      show: true,
                      title: "Error Breaking Connection",
                      message: err.message || "Failed to break connection",
                    });
                  }
                },
              });
            }}
            className={`px-4 py-1.5 rounded-full font-bold text-[10px] shadow-md flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] border ${
              isDarkMode
                ? "bg-rose-955/20 border-rose-500/20 text-rose-455 hover:bg-rose-500/25 hover:text-rose-350"
                : "bg-rose-50 border-rose-200 text-rose-650 hover:bg-rose-100 hover:text-rose-700"
            }`}
          >
            <Trash2 size={12} /> Break Connection
          </button>
        </div>
      )}

      {/* Unified Confirm & Alert Modals */}
      <ConfirmAlertDialog
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
      />

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
