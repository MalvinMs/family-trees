<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\Tree;
use App\Models\ActivityLog;
use App\Jobs\BroadcastTreeEventJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class PersonController extends Controller
{
    /**
     * Helper to authorize editors and owners.
     */
    private function authorizeEditor($user, $treeId)
    {
        $tree = Tree::findOrFail($treeId);
        if ($tree->owner_id === $user->id) {
            return $tree;
        }

        $collab = $tree->collaborators()->where('user_id', $user->id)->first();
        if ($collab && $collab->role === 'editor') {
            return $tree;
        }

        abort(response()->json(['message' => 'You do not have editor access to this family tree.'], 403));
    }

    /**
     * Store a newly created person in a tree.
     */
    public function store(Request $request)
    {
        $request->validate([
            'tree_id' => ['required', 'uuid', 'exists:trees,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'gender' => ['required', 'string', 'in:male,female,other'],
            'birth_date' => ['nullable', 'date'],
            'death_date' => ['nullable', 'date'],
            'biography' => ['nullable', 'string'],
            'dynamic_data' => ['nullable', 'array'],
            'ui_metadata' => ['nullable', 'array'],
        ]);

        $tree = $this->authorizeEditor($request->user(), $request->tree_id);

        $person = Person::create([
            'tree_id' => $tree->id,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'gender' => $request->gender,
            'birth_date' => $request->birth_date,
            'death_date' => $request->death_date,
            'biography' => $request->biography,
            'dynamic_data' => $request->dynamic_data ?? [],
            'ui_metadata' => $request->ui_metadata ?? [
                'x' => rand(50, 400),
                'y' => rand(50, 400),
                'background_color' => '#ffffff',
                'border_color' => '#cccccc',
            ],
        ]);

        // Log silsilah event
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'action' => 'added_member',
            'description' => $request->user()->name . " documented new family member " . $person->first_name . " " . ($person->last_name ?? ''),
        ]);

        // Emit real-time reload trigger
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'tree_changed']));

        return response()->json($person, 201);
    }

    /**
     * Display the specified person's detailed profile including custom field data.
     */
    public function show(Request $request, string $id)
    {
        $person = Person::findOrFail($id);
        $tree = Tree::findOrFail($person->tree_id);
        
        // Gate check
        $userId = $request->user()->id;
        $isOwner = $tree->owner_id === $userId;
        $isCollab = $tree->collaborators()->where('user_id', $userId)->exists();
        
        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access to person record.'], 403);
        }

        return response()->json($person);
    }

    /**
     * Update the specified person.
     */
    public function update(Request $request, string $id)
    {
        $person = Person::findOrFail($id);
        $tree = $this->authorizeEditor($request->user(), $person->tree_id);

        $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', 'string', 'in:male,female,other'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'death_date' => ['sometimes', 'nullable', 'date'],
            'biography' => ['sometimes', 'nullable', 'string'],
            'dynamic_data' => ['sometimes', 'nullable', 'array'],
            'ui_metadata' => ['sometimes', 'nullable', 'array'],
        ]);

        $person->update($request->only([
            'first_name', 'last_name', 'gender', 'birth_date',
            'death_date', 'biography', 'dynamic_data', 'ui_metadata'
        ]));

        // Calculate specific action type
        $action = 'updated_member';
        $description = $request->user()->name . " updated " . $person->first_name . "'s historical record";

        $isCoordinatesDrag = $request->has('ui_metadata') && count($request->all()) === 1;

        if ($isCoordinatesDrag) {
            $action = 'dragged_coordinates';
            $description = $request->user()->name . " adjusted layout coordinates for " . $person->first_name;
        }

        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'action' => $action,
            'description' => $description,
        ]);

        // Emit real-time update trigger asynchronously
        if ($isCoordinatesDrag) {
            BroadcastTreeEventJob::dispatch($tree->id, [
                'event' => 'node_moved',
                'id' => $person->id,
                'x' => $person->ui_metadata['x'] ?? 100,
                'y' => $person->ui_metadata['y'] ?? 100,
            ]);
        } else {
            BroadcastTreeEventJob::dispatch($tree->id, [
                'event' => 'tree_changed',
            ]);
        }

        return response()->json($person);
    }

    /**
     * Remove the specified person from the tree.
     */
    public function destroy(Request $request, string $id)
    {
        $person = Person::findOrFail($id);
        $tree = $this->authorizeEditor($request->user(), $person->tree_id);

        $personName = $person->first_name . " " . ($person->last_name ?? '');
        $person->delete();

        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'action' => 'deleted_member',
            'description' => $request->user()->name . " removed " . $personName . " from the silsilah record",
        ]);

        // Emit real-time reload trigger
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'tree_changed']));

        return response()->json(['message' => 'Person removed from tree successfully']);
    }
}
