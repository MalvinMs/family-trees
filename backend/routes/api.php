<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\PersonController;
use App\Http\Controllers\Api\RelationshipController;
use App\Http\Controllers\Api\TreeController;
use App\Http\Controllers\Api\TreeCollaboratorController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\CommentController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/public/trees/{id}', [TreeController::class, 'showPublic']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Register Broadcast routes inside API with auth:sanctum middleware
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Family Tree Management
    Route::apiResource('trees', TreeController::class);

    // Person Management (CRUD individual family nodes)
    Route::get('persons/{id}', [PersonController::class, 'show']);
    Route::post('persons', [PersonController::class, 'store']);
    Route::put('persons/{id}', [PersonController::class, 'update']);
    Route::delete('persons/{id}', [PersonController::class, 'destroy']);

    // Relationship Management (Graph link CRUD)
    Route::post('relationships', [RelationshipController::class, 'store']);
    Route::delete('relationships/{id}', [RelationshipController::class, 'destroy']);

    // Custom Fields (Schema customization per tree)
    Route::get('custom-fields', [CustomFieldController::class, 'index']);
    Route::post('custom-fields', [CustomFieldController::class, 'store']);
    Route::delete('custom-fields/{id}', [CustomFieldController::class, 'destroy']);

    // Tree Collaborators & Sharing system
    Route::get('trees/{id}/collaborators', [TreeCollaboratorController::class, 'index']);
    Route::post('trees/share', [TreeCollaboratorController::class, 'store']);
    Route::delete('tree-collaborators/{id}', [TreeCollaboratorController::class, 'destroy']);

    // Dynamic audit logs timeline feed
    Route::get('trees/{id}/activities', [ActivityLogController::class, 'index']);

    // Archival research comments
    Route::get('persons/{id}/comments', [CommentController::class, 'index']);
    Route::post('comments', [CommentController::class, 'store']);
    Route::delete('comments/{id}', [CommentController::class, 'destroy']);

    // Archival export endpoints
    Route::get('trees/{id}/export/json', [\App\Http\Controllers\Api\ExportController::class, 'exportJson']);
    Route::get('trees/{id}/export/gedcom', [\App\Http\Controllers\Api\ExportController::class, 'exportGedcom']);
});
