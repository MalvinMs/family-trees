<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Tree;
use App\Models\TreeCollaborator;
use App\Models\Person;
use App\Models\Comment;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Redis;

class CommentController extends Controller
{
    /**
     * Retrieve comments/research notes for a family member.
     */
    public function index($personId)
    {
        $person = Person::findOrFail($personId);
        $tree = Tree::findOrFail($person->tree_id);
        $userId = auth()->id();

        // Gate check
        $isOwner = $tree->owner_id === $userId;
        $isCollab = TreeCollaborator::where('tree_id', $tree->id)->where('user_id', $userId)->exists();

        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access to this family tree.'], 403);
        }

        $comments = Comment::with('user:id,name,email')
            ->where('person_id', $personId)
            ->oldest()
            ->get();

        return response()->json($comments);
    }

    /**
     * Save collaborator note / comment on a family member.
     */
    public function store(Request $request)
    {
        $request->validate([
            'person_id' => 'required|uuid|exists:persons,id',
            'content' => 'required|string',
        ]);

        $person = Person::findOrFail($request->person_id);
        $tree = Tree::findOrFail($person->tree_id);
        $userId = auth()->id();

        // Gate check
        $isOwner = $tree->owner_id === $userId;
        $isCollab = TreeCollaborator::where('tree_id', $tree->id)->where('user_id', $userId)->first();

        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        // Editors or Viewers can both write notes (collaborator notes)
        $comment = Comment::create([
            'person_id' => $request->person_id,
            'user_id' => $userId,
            'content' => $request->content,
        ]);

        // Log edit
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $userId,
            'action' => 'added_note',
            'description' => auth()->user()->name . " added an archival research note on " . $person->first_name . " " . ($person->last_name ?? ''),
        ]);

        // Realtime Event emit
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'comments_changed', 'person_id' => $person->id]));

        return response()->json($comment->load('user:id,name,email'), 201);
    }

    /**
     * Remove a comment.
     */
    public function destroy($id)
    {
        $comment = Comment::findOrFail($id);
        $person = Person::findOrFail($comment->person_id);
        $tree = Tree::findOrFail($person->tree_id);
        $userId = auth()->id();

        // Must be the owner of the tree OR the author of the comment to remove it
        if ($tree->owner_id !== $userId && $comment->user_id !== $userId) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $commentUser = $comment->user;
        $comment->delete();

        // Log edit
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $userId,
            'action' => 'deleted_note',
            'description' => auth()->user()->name . " deleted a research note on " . $person->first_name . " " . ($person->last_name ?? ''),
        ]);

        // Realtime Event emit
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'comments_changed', 'person_id' => $person->id]));

        return response()->json(['message' => 'Research note deleted successfully.']);
    }
}
