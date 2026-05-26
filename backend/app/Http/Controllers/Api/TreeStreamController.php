<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Tree;
use App\Models\TreeCollaborator;
use Illuminate\Support\Facades\Redis;

class TreeStreamController extends Controller
{
    /**
     * Open an SSE event stream for real-time collaborative updates.
     *
     * Uses a lightweight polling approach instead of blocking Redis::subscribe()
     * to avoid monopolizing the single PHP artisan serve worker.
     * The stream auto-disconnects after 30 seconds; EventSource auto-reconnects.
     */
    public function stream(Request $request, $treeId)
    {
        if ($request->has('token')) {
            $token = $request->query('token');
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            if ($accessToken) {
                auth()->login($accessToken->tokenable);
            }
        }

        $tree = Tree::findOrFail($treeId);
        $userId = auth()->id();

        // Gate check
        $isOwner = $tree->owner_id === $userId;
        $isCollab = TreeCollaborator::where('tree_id', $treeId)->where('user_id', $userId)->exists();

        if (!$isOwner && !$isCollab) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        return response()->stream(function () use ($treeId) {
            // Send initial ping to establish connection
            echo "event: connected\n";
            echo "data: " . json_encode(['connected' => true, 'time' => now()->toIso8601String()]) . "\n\n";
            if (ob_get_level()) ob_flush();
            flush();

            $redisKey = "tree_events:{$treeId}";
            $maxDuration = 30; // Auto-disconnect after 30s to free the worker
            $startTime = time();

            while ((time() - $startTime) < $maxDuration) {
                // Check for queued events via Redis list (non-blocking)
                try {
                    $message = Redis::lpop($redisKey);
                    if ($message) {
                        echo "data: {$message}\n\n";
                        if (ob_get_level()) ob_flush();
                        flush();
                        continue; // Check for more messages immediately
                    }
                } catch (\Exception $e) {
                    // Redis connection issue, break gracefully
                    break;
                }

                // Check if client disconnected
                if (connection_aborted()) {
                    break;
                }

                // Send keepalive comment every cycle to detect disconnects
                echo ": heartbeat\n\n";
                if (ob_get_level()) ob_flush();
                flush();

                // Sleep 2 seconds between polls
                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
