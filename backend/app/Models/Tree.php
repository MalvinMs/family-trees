<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tree extends Model
{
    use HasUuids;

    protected $fillable = [
        'owner_id',
        'name',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    /**
     * Get the owner of the tree.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get persons in this tree.
     */
    public function persons(): HasMany
    {
        return $this->hasMany(Person::class, 'tree_id');
    }

    /**
     * Get custom fields defined for this tree.
     */
    public function customFields(): HasMany
    {
        return $this->hasMany(CustomField::class, 'tree_id');
    }

    /**
     * Get relationships in this tree.
     */
    public function relationships(): HasMany
    {
        return $this->hasMany(Relationship::class, 'tree_id');
    }

    /**
     * Get collaborators associated with this tree.
     */
    public function collaborators(): HasMany
    {
        return $this->hasMany(TreeCollaborator::class, 'tree_id');
    }

    /**
     * Get activity logs associated with this tree.
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'tree_id');
    }
}
