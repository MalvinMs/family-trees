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
                    $query->select(['id', 'tree_id', 'person_a', 'person_b', 'relation_type']);
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
                    $query->select(['id', 'tree_id', 'person_a', 'person_b', 'relation_type']);
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
}
