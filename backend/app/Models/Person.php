<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Person extends Model
{
    use HasUuids;

    protected $table = 'persons';

    protected $fillable = [
        'tree_id',
        'first_name',
        'last_name',
        'gender',
        'birth_date',
        'death_date',
        'biography',
        'dynamic_data',
        'ui_metadata',
    ];

    protected $casts = [
        'dynamic_data' => 'array',
        'ui_metadata' => 'array',
        'birth_date' => 'date:Y-m-d',
        'death_date' => 'date:Y-m-d',
    ];

    /**
     * Get the tree this person belongs to.
     */
    public function tree(): BelongsTo
    {
        return $this->belongsTo(Tree::class, 'tree_id');
    }

    /**
     * Get relationships where this person is person_a.
     */
    public function relationshipsAsA(): HasMany
    {
        return $this->hasMany(Relationship::class, 'person_a');
    }

    /**
     * Get relationships where this person is person_b.
     */
    public function relationshipsAsB(): HasMany
    {
        return $this->hasMany(Relationship::class, 'person_b');
    }

    /**
     * Get comments on this family member.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'person_id');
    }
}
