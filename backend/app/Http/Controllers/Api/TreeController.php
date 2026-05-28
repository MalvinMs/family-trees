<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tree;
use Illuminate\Http\Request;

class TreeController extends Controller
{
    /**
     * Display a listing of the user's family trees.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $trees = Tree::where('owner_id', $user->id)
            ->orWhereHas('collaborators', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with(['persons', 'relationships'])
            ->latest()
            ->get();

        return response()->json($trees);
    }

    /**
     * Store a newly created family tree.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'settings' => ['nullable', 'array'],
        ]);

        $tree = $request->user()->trees()->create([
            'name' => $request->name,
            'settings' => $request->settings ?? [
                'theme' => 'default_light',
                'node' => [
                    'shape' => 'card',
                    'border_radius' => 8,
                    'font' => 'sans-serif',
                ],
                'edge' => [
                    'style' => 'smoothstep',
                    'width' => 2,
                ]
            ],
        ]);

        return response()->json($tree, 201);
    }

    /**
     * Display the specified family tree along with all its members and edges.
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        $tree = Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                    });
            })
            ->with([
                'persons' => function ($query) {
                    $query->select([
                        'id', 'tree_id', 'first_name', 'last_name', 
                        'gender', 'birth_date', 'death_date', 'biography', 
                        'ui_metadata', 'dynamic_data'
                    ]);
                },
                'relationships' => function ($query) {
                    $query->select(['id', 'tree_id', 'person_a', 'person_b', 'relation_type', 'source_handle', 'target_handle']);
                },
                'customFields'
            ])
            ->findOrFail($id);

        return response()->json($tree);
    }

    /**
     * Display the specified family tree for the public (if public sharing is enabled).
     */
    public function showPublic(string $id)
    {
        $tree = Tree::where('is_public', true)
            ->with([
                'persons' => function ($query) {
                    $query->select([
                        'id', 'tree_id', 'first_name', 'last_name', 
                        'gender', 'birth_date', 'death_date', 'biography', 
                        'ui_metadata', 'dynamic_data'
                    ]);
                },
                'relationships' => function ($query) {
                    $query->select(['id', 'tree_id', 'person_a', 'person_b', 'relation_type', 'source_handle', 'target_handle']);
                },
                'customFields'
            ])
            ->findOrFail($id);

        return response()->json($tree);
    }

    /**
     * Update the specified family tree.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        $tree = Tree::where(function ($query) use ($user) {
                $query->where('owner_id', $user->id)
                    ->orWhereHas('collaborators', function ($q) use ($user) {
                        $q->where('user_id', $user->id)->where('role', 'editor');
                    });
            })
            ->findOrFail($id);

        $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'settings' => ['sometimes', 'nullable', 'array'],
            'is_public' => ['sometimes', 'required', 'boolean'],
        ]);

        $tree->update($request->only(['name', 'settings', 'is_public']));

        return response()->json($tree);
    }

    /**
     * Remove the specified family tree.
     */
    public function destroy(Request $request, string $id)
    {
        // Only the owner can delete the tree completely
        $tree = $request->user()->trees()->findOrFail($id);
        $tree->delete();

        return response()->json(['message' => 'Tree deleted successfully']);
    }

    /**
     * Import a family tree from a JSON archive backup.
     */
    public function importJson(Request $request)
    {
        $request->validate([
            'tree_data' => ['required', 'string'],
        ]);

        $jsonData = json_decode($request->tree_data, true);
        if (!$jsonData || !is_array($jsonData)) {
            return response()->json(['message' => 'Invalid JSON structure.'], 422);
        }

        // 1. Create a new Tree
        $tree = $request->user()->trees()->create([
            'name' => ($jsonData['name'] ?? 'Imported Family Tree') . ' (Restored)',
            'settings' => $jsonData['settings'] ?? [
                'theme' => 'default_light',
                'node' => ['shape' => 'card', 'border_radius' => 8, 'font' => 'sans-serif'],
                'edge' => ['style' => 'smoothstep', 'width' => 2]
            ],
        ]);

        // 2. Import Persons and map old UUIDs to new UUIDs
        $personIdMap = [];
        foreach ($jsonData['persons'] ?? [] as $p) {
            $newPerson = \App\Models\Person::create([
                'tree_id' => $tree->id,
                'first_name' => $p['first_name'],
                'last_name' => $p['last_name'] ?? null,
                'gender' => $p['gender'],
                'birth_date' => $p['birth_date'] ?? null,
                'death_date' => $p['death_date'] ?? null,
                'biography' => $p['biography'] ?? null,
                'dynamic_data' => $p['dynamic_data'] ?? [],
                'ui_metadata' => $p['ui_metadata'] ?? [],
            ]);
            $personIdMap[$p['id']] = $newPerson->id;
        }

        // 3. Import Custom Fields
        foreach ($jsonData['custom_fields'] ?? ($jsonData['custom_fields'] ?? []) as $cf) {
            \App\Models\CustomField::create([
                'tree_id' => $tree->id,
                'field_name' => $cf['field_name'],
                'field_type' => $cf['field_type'],
                'validation_rules' => $cf['validation_rules'] ?? [],
            ]);
        }

        // 4. Import Relationships utilizing personIdMap
        foreach ($jsonData['relationships'] ?? [] as $rel) {
            $newPersonA = $personIdMap[$rel['person_a']] ?? null;
            $newPersonB = $personIdMap[$rel['person_b']] ?? null;
            if ($newPersonA && $newPersonB) {
                \App\Models\Relationship::create([
                    'tree_id' => $tree->id,
                    'person_a' => $newPersonA,
                    'person_b' => $newPersonB,
                    'relation_type' => $rel['relation_type'],
                ]);
            }
        }

        return response()->json($tree, 201);
    }
}
