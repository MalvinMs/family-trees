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
        $trees = $request->user()->trees()->latest()->get();
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
        $tree = $request->user()->trees()
            ->with(['persons', 'relationships', 'customFields'])
            ->findOrFail($id);

        return response()->json($tree);
    }

    /**
     * Update the specified family tree.
     */
    public function update(Request $request, string $id)
    {
        $tree = $request->user()->trees()->findOrFail($id);

        $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $tree->update($request->only(['name', 'settings']));

        return response()->json($tree);
    }

    /**
     * Remove the specified family tree.
     */
    public function destroy(Request $request, string $id)
    {
        $tree = $request->user()->trees()->findOrFail($id);
        $tree->delete();

        return response()->json(['message' => 'Tree deleted successfully']);
    }
}
