<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Tree;
use App\Models\TreeCollaborator;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    /**
     * Retrieve chronological history of silsilah alterations.
     */
    public function index($treeId)
    {
        $tree = Tree::findOrFail($treeId);
        $userId = auth()->id();

        // Security check
        $isOwner = $tree->owner_id === $userId;
        $isCollab = TreeCollaborator::where('tree_id', $treeId)->where('user_id', $userId)->exists();

        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access to this family tree.'], 403);
        }

        $logs = ActivityLog::with('user:id,name,email')
            ->where('tree_id', $treeId)
            ->latest()
            ->paginate(50);

        return response()->json($logs);
    }
}
