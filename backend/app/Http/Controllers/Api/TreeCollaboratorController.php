<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Tree;
use App\Models\TreeCollaborator;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Redis;

class TreeCollaboratorController extends Controller
{
    /**
     * List all collaborators for a specific tree.
     */
    public function index($treeId)
    {
        $tree = Tree::findOrFail($treeId);
        $userId = auth()->id();

        // Security gate check
        $isOwner = $tree->owner_id === $userId;
        $isCollab = TreeCollaborator::where('tree_id', $treeId)->where('user_id', $userId)->exists();

        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access to this family tree.'], 403);
        }

        $collaborators = TreeCollaborator::with('user:id,name,email')
            ->where('tree_id', $treeId)
            ->get();

        return response()->json([
            'owner' => $tree->owner()->select('id', 'name', 'email')->first(),
            'collaborators' => $collaborators
        ]);
    }

    /**
     * Share tree with a new collaborator.
     */
    public function store(Request $request)
    {
        $request->validate([
            'tree_id' => 'required|uuid|exists:trees,id',
            'email' => 'required|email',
            'role' => 'required|in:viewer,editor',
        ]);

        $treeId = $request->tree_id;
        $tree = Tree::findOrFail($treeId);
        $userId = auth()->id();

        // Only the owner can invite collaborators
        if ($tree->owner_id !== $userId) {
            return response()->json(['message' => 'Only the owner of the tree can manage sharing.'], 403);
        }

        $targetUser = User::where('email', $request->email)->first();
        if (!$targetUser) {
            return response()->json(['message' => 'User with this email is not registered.'], 404);
        }

        if ($targetUser->id === $tree->owner_id) {
            return response()->json(['message' => 'The owner is already administrative collaborator.'], 422);
        }

        // Check if already shared
        $existing = TreeCollaborator::where('tree_id', $treeId)
            ->where('user_id', $targetUser->id)
            ->first();

        if ($existing) {
            $existing->update(['role' => $request->role]);
            
            // Log update
            ActivityLog::create([
                'tree_id' => $treeId,
                'user_id' => $userId,
                'action' => 'updated_collaborator',
                'description' => auth()->user()->name . " updated " . $targetUser->name . "'s access role to " . $request->role,
            ]);

            // Broadcast real-time refresh event via Redis
            Redis::rpush("tree_events:{$treeId}", json_encode(['event' => 'collaborators_changed']));

            return response()->json([
                'message' => 'Collaborator role updated successfully.',
                'collaborator' => $existing->load('user:id,name,email')
            ]);
        }

        // Create collaborator invitation
        $collab = TreeCollaborator::create([
            'tree_id' => $treeId,
            'user_id' => $targetUser->id,
            'role' => $request->role,
        ]);

        // Log sharing action
        ActivityLog::create([
            'tree_id' => $treeId,
            'user_id' => $userId,
            'action' => 'invited_collaborator',
            'description' => auth()->user()->name . " shared access with " . $targetUser->name . " as " . $request->role,
        ]);

        // Broadcast real-time refresh event via Redis
        Redis::rpush("tree_events:{$treeId}", json_encode(['event' => 'collaborators_changed']));

        return response()->json([
            'message' => 'Tree shared successfully.',
            'collaborator' => $collab->load('user:id,name,email')
        ]);
    }

    /**
     * Remove collaborator access from tree.
     */
    public function destroy($id)
    {
        $collab = TreeCollaborator::findOrFail($id);
        $tree = Tree::findOrFail($collab->tree_id);
        $userId = auth()->id();

        // Only owner or the collaborator themselves can remove collaboration link
        if ($tree->owner_id !== $userId && $collab->user_id !== $userId) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $collabUser = $collab->user;
        $collab->delete();

        // Log revoking
        ActivityLog::create([
            'tree_id' => $tree->id,
            'user_id' => $userId,
            'action' => 'removed_collaborator',
            'description' => auth()->user()->name . " removed " . ($collabUser ? $collabUser->name : 'collaborator') . "'s access link",
        ]);

        // Broadcast real-time refresh event via Redis
        Redis::rpush("tree_events:{$tree->id}", json_encode(['event' => 'collaborators_changed']));

        return response()->json(['message' => 'Collaboration link revoked successfully.']);
    }
}
