<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\Tree;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class RelationshipController extends Controller
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
     * Store a newly created relationship between two persons.
     */
    public function store(Request $request)
    {
        $request->validate([
            'tree_id' => ['required', 'uuid', 'exists:trees,id'],
            'person_a' => ['required', 'uuid', 'exists:persons,id'],
            'person_b' => ['required', 'uuid', 'exists:persons,id'],
            'relation_type' => ['required', 'string', 'in:parent,spouse,sibling,adopted,guardian,step_parent'],
        ]);

        $tree = $this->authorizeEditor($request->user(), $request->tree_id);

        // Verify both persons belong to the correct tree
        $personA = Person::where('tree_id', $tree->id)->findOrFail($request->person_a);
        $personB = Person::where('tree_id', $tree->id)->findOrFail($request->person_b);

        if ($request->person_a === $request->person_b) {
            return response()->json([
                'message' => 'Cannot create a relationship between a person and themselves.'
            ], 422);
        }

        // Check if relationship already exists
        $existing = Relationship::where('tree_id', $tree->id)
            ->where(function ($query) use ($request) {
                $query->where(function ($q) use ($request) {
                    $q->where('person_a', $request->person_a)
                      ->where('person_b', $request->person_b);
                })->orWhere(function ($q) use ($request) {
                    $q->where('person_a', $request->person_b)
                      ->where('person_b', $request->person_a);
                });
            })
            ->where('relation_type', $request->relation_type)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'This relationship already exists.'
            ], 422);
        }

        $relationship = Relationship::create([
            'tree_id' => $tree->id,
            'person_a' => $request->person_a,
            'person_b' => $request->person_b,
            'relation_type' => $request->relation_type,
        ]);

        // Log the link creation
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'action' => 'linked_relationship',
            'description' => $request->user()->name . " linked a " . $request->relation_type . " relationship between " . $personA->first_name . " and " . $personB->first_name,
        ]);

        // Broadcast real-time reload trigger
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'tree_changed']));

        return response()->json($relationship, 201);
    }

    /**
     * Remove the specified relationship.
     */
    public function destroy(Request $request, string $id)
    {
        $relationship = Relationship::findOrFail($id);
        $tree = $this->authorizeEditor($request->user(), $relationship->tree_id);

        $personA = Person::find($relationship->person_a);
        $personB = Person::find($relationship->person_b);
        $relationText = $relationship->relation_type;

        $relationship->delete();

        // Log relationship removal
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'action' => 'unlinked_relationship',
            'description' => $request->user()->name . " removed the " . $relationText . " link between " . ($personA ? $personA->first_name : 'deleted member') . " and " . ($personB ? $personB->first_name : 'deleted member'),
        ]);

        // Broadcast real-time reload trigger
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'tree_changed']));

        return response()->json(['message' => 'Relationship removed successfully']);
    }
}
