<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreeCollaborator extends Model
{
    use HasUuids;

    protected $fillable = [
        'tree_id',
        'user_id',
        'role',
    ];

    /**
     * Get the family tree associated with this collaborator.
     */
    public function tree(): BelongsTo
    {
        return $this->belongsTo(Tree::class, 'tree_id');
    }

    /**
     * Get the user account who is invited as collaborator.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
