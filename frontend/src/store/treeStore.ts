import { create } from 'zustand';

export interface Person {
  id: string;
  tree_id?: string;
  first_name: string;
  last_name: string | null;
  gender: 'male' | 'female' | 'other';
  birth_date: string | null;
  death_date: string | null;
  biography: string | null;
  dynamic_data: Record<string, any>;
  ui_metadata: {
    x: number;
    y: number;
    background_color?: string;
    border_color?: string;
  };
}

export interface Relationship {
  id: string;
  person_a: string;
  person_b: string;
  relation_type: 'parent' | 'spouse' | 'sibling' | 'adopted' | 'guardian' | 'step_parent';
  source_handle?: string | null;
  target_handle?: string | null;
}

export interface CustomField {
  id: string;
  field_name: string;
  field_type: 'text' | 'date' | 'dropdown' | 'tag' | 'file' | 'image';
  validation_rules: any;
}

export interface Tree {
  id: string;
  name: string;
  owner_id?: string;
  created_at?: string;
  settings: Record<string, any>;
  persons: Person[];
  relationships: Relationship[];
  customFields?: CustomField[];
  custom_fields?: CustomField[];
  is_public?: boolean;
}

interface TreeState {
  trees: Tree[];
  activeTree: Tree | null;
  collaborators: { owner: any; collaborators: any[] } | null;
  activities: any[];
  comments: any[];
  loading: boolean;
  error: string | null;
  setTrees: (trees: Tree[]) => void;
  setActiveTree: (tree: Tree | null) => void;
  fetchTrees: (token: string) => Promise<void>;
  fetchTreeDetail: (token: string, treeId: string) => Promise<void>;
  fetchPublicTreeDetail: (treeId: string) => Promise<void>;
  createTree: (token: string, name: string) => Promise<Tree | null>;
  updateTree: (token: string, treeId: string, data: Partial<Tree>) => Promise<Tree | null>;
  importTree: (token: string, jsonData: string) => Promise<Tree | null>;
  deleteTree: (token: string, treeId: string) => Promise<void>;
  addPerson: (token: string, data: Omit<Person, 'id'>) => Promise<Person | null>;
  updatePerson: (token: string, personId: string, data: Partial<Person>) => Promise<void>;
  deletePerson: (token: string, personId: string) => Promise<void>;
  addRelationship: (token: string, data: Omit<Relationship, 'id'> & { tree_id: string }) => Promise<void>;
  updateRelationship: (token: string, relationshipId: string, data: { source_handle?: string | null; target_handle?: string | null }) => Promise<void>;
  deleteRelationship: (token: string, relationshipId: string) => Promise<void>;
  addCustomField: (token: string, treeId: string, name: string, type: string, validationRules?: Record<string, any>) => Promise<void>;
  updateCustomField: (token: string, fieldId: string, name: string, validationRules?: Record<string, any>) => Promise<void>;
  deleteCustomField: (token: string, fieldId: string) => Promise<void>;
  updateCustomFieldLocal: (fieldId: string, data: any) => void;
  deleteCustomFieldLocal: (fieldId: string) => void;
  fetchCollaborators: (token: string, treeId: string) => Promise<void>;
  shareTree: (token: string, data: { tree_id: string; email: string; role: 'viewer' | 'editor' }) => Promise<void>;
  removeCollaborator: (token: string, collabId: string) => Promise<void>;
  fetchActivities: (token: string, treeId: string) => Promise<void>;
  fetchComments: (token: string, personId: string) => Promise<void>;
  addComment: (token: string, data: { person_id: string; content: string }) => Promise<void>;
  deleteComment: (token: string, commentId: string) => Promise<void>;
  fetchPersonDetail: (token: string, personId: string) => Promise<Person | null>;
  addRelativeComposite: (
    token: string,
    treeId: string,
    data: {
      first_name: string;
      last_name?: string;
      gender: 'male' | 'female' | 'other';
      relation_type: 'parent' | 'spouse' | 'sibling' | 'adopted' | 'child';
      birth_date?: string;
      death_date?: string;
      biography?: string;
      base_person_id: string;
    }
  ) => Promise<void>;
  updateNodePositionLocal: (personId: string, x: number, y: number) => void;
  patchNodePositionSSE: (personId: string, x: number, y: number) => void;
  addPersonLocal: (person: Person) => void;
  updatePersonLocal: (personId: string, data: Partial<Person>) => void;
  deletePersonLocal: (personId: string) => void;
  addRelationshipLocal: (relationship: Relationship) => void;
  deleteRelationshipLocal: (relationshipId: string) => void;
  updateRelationshipLocal: (relationshipId: string, data: Partial<Relationship>) => void;
  updateMultipleNodesPositionsLocal: (positions: { id: string; x: number; y: number }[]) => void;
  saveBulkPositions: (token: string, treeId: string, positions: { id: string; x: number; y: number }[]) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useTreeStore = create<TreeState>((set, get) => ({
  trees: [],
  activeTree: null,
  collaborators: null,
  activities: [],
  comments: [],
  loading: false,
  error: null,

  setTrees: (trees) => set({ trees }),
  setActiveTree: (activeTree) => set({ activeTree }),

  fetchTrees: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/trees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch trees');
      const data = await res.json();
      set({ trees: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchTreeDetail: async (token, treeId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tree details');
      const data = await res.json();
      set({ activeTree: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchPublicTreeDetail: async (treeId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/public/trees/${treeId}`);
      if (!res.ok) throw new Error('Failed to fetch public tree details');
      const data = await res.json();
      set({ activeTree: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createTree: async (token, name) => {
    try {
      const res = await fetch(`${API_URL}/api/trees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create tree');
      const newTree = await res.json();
      set((state) => ({ trees: [newTree, ...state.trees] }));
      return newTree;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  updateTree: async (token, treeId, data) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update tree settings');
      const updatedTree = await res.json();
      set((state) => {
        const trees = state.trees.map((t) => (t.id === treeId ? { ...t, ...updatedTree } : t));
        const activeTree = state.activeTree && state.activeTree.id === treeId
          ? { ...state.activeTree, ...updatedTree }
          : state.activeTree;
        return { trees, activeTree };
      });
      return updatedTree;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  importTree: async (token, jsonData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/trees/import/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tree_data: jsonData }),
      });
      if (!res.ok) throw new Error('Failed to import family tree archive');
      const newTree = await res.json();
      set((state) => ({ trees: [newTree, ...state.trees], loading: false }));
      return newTree;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  deleteTree: async (token, treeId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete family tree');
      set((state) => ({
        trees: state.trees.filter((t) => t.id !== treeId),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addPerson: async (token, data) => {
    try {
      const res = await fetch(`${API_URL}/api/persons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add person');
      
      const newPerson = await res.json();
      const activeTree = get().activeTree;
      if (activeTree && activeTree.id === data.tree_id) {
        set({
          activeTree: {
            ...activeTree,
            persons: [...activeTree.persons, newPerson],
          },
        });
      }
      return newPerson;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  updatePerson: async (token, personId, data) => {
    try {
      const res = await fetch(`${API_URL}/api/persons/${personId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update person');
      
      const updatedPerson = await res.json();
      const activeTree = get().activeTree;
      if (activeTree) {
        set({
          activeTree: {
            ...activeTree,
            persons: activeTree.persons.map((p) =>
              p.id === personId ? updatedPerson : p
            ),
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deletePerson: async (token, personId) => {
    try {
      const res = await fetch(`${API_URL}/api/persons/${personId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete person');

      const activeTree = get().activeTree;
      if (activeTree) {
        set({
          activeTree: {
            ...activeTree,
            persons: activeTree.persons.filter((p) => p.id !== personId),
            relationships: activeTree.relationships.filter(
              (r) => r.person_a !== personId && r.person_b !== personId
            ),
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addRelationship: async (token, data) => {
    try {
      const res = await fetch(`${API_URL}/api/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add relationship');
      }
      
      const newRelationship = await res.json();
      const activeTree = get().activeTree;
      if (activeTree && activeTree.id === data.tree_id) {
        set({
          activeTree: {
            ...activeTree,
            relationships: [...activeTree.relationships, newRelationship],
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateRelationship: async (token, relationshipId, data) => {
    try {
      const res = await fetch(`${API_URL}/api/relationships/${relationshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error('Failed to update relationship');
      }

      const updatedRelationship = await res.json();
      const activeTree = get().activeTree;
      if (activeTree) {
        const updatedRels = activeTree.relationships.map((r) =>
          r.id === relationshipId ? updatedRelationship : r
        );
        set({
          activeTree: {
            ...activeTree,
            relationships: updatedRels,
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteRelationship: async (token, relationshipId) => {
    try {
      const res = await fetch(`${API_URL}/api/relationships/${relationshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete relationship');

      const activeTree = get().activeTree;
      if (activeTree) {
        set({
          activeTree: {
            ...activeTree,
            relationships: activeTree.relationships.filter(
              (r) => r.id !== relationshipId
            ),
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addCustomField: async (token, treeId, name, type, validationRules) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tree_id: treeId,
          field_name: name,
          field_type: type,
          validation_rules: validationRules || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add custom field');
      
      const newField = await res.json();
      const activeTree = get().activeTree;
      if (activeTree && activeTree.id === treeId) {
        const currentFields = activeTree.customFields || (activeTree as any).custom_fields || [];
        const updatedFields = [...currentFields, newField];
        set({
          activeTree: {
            ...activeTree,
            customFields: updatedFields,
            custom_fields: updatedFields,
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateCustomField: async (token, fieldId, name, validationRules) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-fields/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          field_name: name,
          validation_rules: validationRules || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update custom field');
      
      const updatedField = await res.json();
      const activeTree = get().activeTree;
      if (activeTree) {
        const currentFields = activeTree.customFields || (activeTree as any).custom_fields || [];
        const oldField = currentFields.find((f) => f.id === fieldId);
        const oldName = oldField?.field_name;
        const newName = updatedField.field_name;

        const updatedFields = currentFields.map((f) =>
          f.id === fieldId ? { ...f, ...updatedField } : f
        );

        let persons = activeTree.persons;
        if (oldName && newName && oldName !== newName) {
          persons = activeTree.persons.map((p) => {
            const dynamic_data = { ...p.dynamic_data };
            if (Object.prototype.hasOwnProperty.call(dynamic_data, oldName)) {
              dynamic_data[newName] = dynamic_data[oldName];
              delete dynamic_data[oldName];
            }
            return { ...p, dynamic_data };
          });
        }

        set({
          activeTree: {
            ...activeTree,
            customFields: updatedFields,
            custom_fields: updatedFields,
            persons,
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteCustomField: async (token, fieldId) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-fields/${fieldId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete custom field');
      
      const activeTree = get().activeTree;
      if (activeTree) {
        const currentFields = activeTree.customFields || (activeTree as any).custom_fields || [];
        const updatedFields = currentFields.filter((f) => f.id !== fieldId);
        set({
          activeTree: {
            ...activeTree,
            customFields: updatedFields,
            custom_fields: updatedFields,
          },
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateCustomFieldLocal: (fieldId, data) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      const currentFields = activeTree.customFields || (activeTree as any).custom_fields || [];
      const oldField = currentFields.find((f) => f.id === fieldId);
      const oldName = oldField?.field_name;
      const newName = data.field_name;

      const updatedFields = currentFields.map((f) =>
        f.id === fieldId ? { ...f, ...data } : f
      );

      let persons = activeTree.persons;
      if (oldName && newName && oldName !== newName) {
        persons = activeTree.persons.map((p) => {
          const dynamic_data = { ...p.dynamic_data };
          if (Object.prototype.hasOwnProperty.call(dynamic_data, oldName)) {
            dynamic_data[newName] = dynamic_data[oldName];
            delete dynamic_data[oldName];
          }
          return { ...p, dynamic_data };
        });
      }

      set({
        activeTree: {
          ...activeTree,
          customFields: updatedFields,
          custom_fields: updatedFields,
          persons,
        },
      });
    }
  },

  deleteCustomFieldLocal: (fieldId) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      const currentFields = activeTree.customFields || (activeTree as any).custom_fields || [];
      const updatedFields = currentFields.filter((f) => f.id !== fieldId);
      set({
        activeTree: {
          ...activeTree,
          customFields: updatedFields,
          custom_fields: updatedFields,
        },
      });
    }
  },

  fetchCollaborators: async (token, treeId) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch collaborators');
      const data = await res.json();
      set({ collaborators: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  shareTree: async (token, data) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Failed to share tree');
      
      get().fetchCollaborators(token, data.tree_id);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  removeCollaborator: async (token, collabId) => {
    try {
      const res = await fetch(`${API_URL}/api/tree-collaborators/${collabId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke collaborator');
      
      const activeTree = get().activeTree;
      if (activeTree) {
        get().fetchCollaborators(token, activeTree.id);
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchActivities: async (token, treeId) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      set({ activities: data.data || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchComments: async (token, personId) => {
    try {
      const res = await fetch(`${API_URL}/api/persons/${personId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      set({ comments: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  addComment: async (token, data) => {
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const newComment = await res.json();
      set((state) => ({ comments: [...state.comments, newComment] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteComment: async (token, commentId) => {
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchPersonDetail: async (token, personId) => {
    try {
      const res = await fetch(`${API_URL}/api/persons/${personId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch person details');
      return await res.json();
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  addRelativeComposite: async (token, treeId, data) => {
    try {
      set({ loading: true, error: null });
      
      // 1. Calculate the coordinates of the new node relative to the base node
      let x = Math.random() * 300 + 100;
      let y = Math.random() * 300 + 100;
      
      const activeTree = get().activeTree;
      if (activeTree) {
        const basePerson = activeTree.persons.find((p) => p.id === data.base_person_id);
        if (basePerson) {
          const baseX = basePerson.ui_metadata?.x ?? 0;
          const baseY = basePerson.ui_metadata?.y ?? 0;
          
          if (data.relation_type === 'spouse' || data.relation_type === 'sibling') {
            x = baseX + 300;
            y = baseY;
          } else if (data.relation_type === 'parent') {
            x = baseX;
            y = baseY - 250;
          } else if (data.relation_type === 'child' || data.relation_type === 'adopted') {
            x = baseX;
            y = baseY + 250;
          }
        }
      }
      
      // 2. Add the new person node
      const newPerson = await get().addPerson(token, {
        tree_id: treeId,
        first_name: data.first_name,
        last_name: data.last_name || null,
        gender: data.gender,
        birth_date: data.birth_date || null,
        death_date: data.death_date || null,
        biography: data.biography || null,
        dynamic_data: {},
        ui_metadata: {
          x,
          y,
          background_color: '#ffffff',
          border_color: '#cccccc',
        },
      });
      
      if (!newPerson) {
        throw new Error('Failed to create new relative card node');
      }
      
      // 3. Add the corresponding relationship
      let person_a = data.base_person_id;
      let person_b = newPerson.id;
      let relation_type: Relationship['relation_type'] = 'spouse';
      let source_handle: string | null = null;
      let target_handle: string | null = null;
      
      if (data.relation_type === 'spouse') {
        relation_type = 'spouse';
        source_handle = 'partner-right';
        target_handle = 'partner-left';
      } else if (data.relation_type === 'sibling') {
        relation_type = 'sibling';
        source_handle = 'partner-right';
        target_handle = 'partner-left';
      } else if (data.relation_type === 'parent') {
        // New Person (Parent) -> Base Person (Child)
        person_a = newPerson.id;
        person_b = data.base_person_id;
        relation_type = 'parent';
        source_handle = 'child-out';
        target_handle = 'parent-in';
      } else if (data.relation_type === 'child') {
        // Base Person (Parent) -> New Person (Child)
        person_a = data.base_person_id;
        person_b = newPerson.id;
        relation_type = 'parent';
        source_handle = 'child-out';
        target_handle = 'parent-in';
      } else if (data.relation_type === 'adopted') {
        // Base Person (Parent) -> New Person (Adopted)
        person_a = data.base_person_id;
        person_b = newPerson.id;
        relation_type = 'adopted';
        source_handle = 'child-out';
        target_handle = 'parent-in';
      }
      
      await get().addRelationship(token, {
        tree_id: treeId,
        person_a,
        person_b,
        relation_type,
        source_handle,
        target_handle,
      });
      
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateNodePositionLocal: (personId, x, y) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      set({
        activeTree: {
          ...activeTree,
          persons: activeTree.persons.map((p) =>
            p.id === personId
              ? { ...p, ui_metadata: { ...p.ui_metadata, x, y } }
              : p
          ),
        },
      });
    }
  },

  patchNodePositionSSE: (personId, x, y) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      set({
        activeTree: {
          ...activeTree,
          persons: activeTree.persons.map((p) =>
            p.id === personId
              ? { ...p, ui_metadata: { ...p.ui_metadata, x, y } }
              : p
          ),
        },
      });
    }
  },

  addPersonLocal: (person) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      if (activeTree.persons.some((p) => p.id === person.id)) return;
      set({
        activeTree: {
          ...activeTree,
          persons: [...activeTree.persons, person],
        },
      });
    }
  },

  updatePersonLocal: (personId, data) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      set({
        activeTree: {
          ...activeTree,
          persons: activeTree.persons.map((p) =>
            p.id === personId
              ? {
                  ...p,
                  ...data,
                  ui_metadata: {
                    ...p.ui_metadata,
                    ...(data.ui_metadata || {}),
                  },
                }
              : p
          ),
        },
      });
    }
  },

  deletePersonLocal: (personId) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      set({
        activeTree: {
          ...activeTree,
          persons: activeTree.persons.filter((p) => p.id !== personId),
          relationships: activeTree.relationships.filter(
            (r) => r.person_a !== personId && r.person_b !== personId
          ),
        },
      });
    }
  },

  addRelationshipLocal: (relationship) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      if (activeTree.relationships.some((r) => r.id === relationship.id)) return;
      set({
        activeTree: {
          ...activeTree,
          relationships: [...activeTree.relationships, relationship],
        },
      });
    }
  },

  deleteRelationshipLocal: (relationshipId) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      set({
        activeTree: {
          ...activeTree,
          relationships: activeTree.relationships.filter(
            (r) => r.id !== relationshipId
          ),
        },
      });
    }
  },

  updateRelationshipLocal: (relationshipId, data) => {
    const activeTree = get().activeTree;
    if (activeTree) {
      const updatedRels = activeTree.relationships.map((r) =>
        r.id === relationshipId ? { ...r, ...data } : r
      );
      set({
        activeTree: {
          ...activeTree,
          relationships: updatedRels,
        },
      });
    }
  },

  updateMultipleNodesPositionsLocal: (positions) => {
    const activeTree = get().activeTree;
    if (!activeTree) return;

    const positionMap = new Map(positions.map((p) => [p.id, p]));

    set({
      activeTree: {
        ...activeTree,
        persons: activeTree.persons.map((p) => {
          const match = positionMap.get(p.id);
          if (match) {
            return {
              ...p,
              ui_metadata: {
                ...p.ui_metadata,
                x: match.x,
                y: match.y,
              },
            };
          }
          return p;
        }),
      },
    });
  },

  saveBulkPositions: async (token, treeId, positions) => {
    try {
      const res = await fetch(`${API_URL}/api/trees/${treeId}/nodes/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save auto-layout positions.');
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
