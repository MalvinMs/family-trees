<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('tree.{treeId}', function ($user, $treeId) {
    $tree = \App\Models\Tree::find($treeId);
    if (!$tree) return false;
    
    $isOwner = $tree->owner_id === $user->id;
    $isCollab = $tree->collaborators()->where('user_id', $user->id)->exists();
    
    return $isOwner || $isCollab;
});
