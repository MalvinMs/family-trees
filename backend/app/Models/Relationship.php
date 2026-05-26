<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Relationship extends Model
{
    use HasUuids;

    protected $fillable = [
        'tree_id',
        'person_a',
        'person_b',
        'relation_type',
    ];

    /**
     * Get the tree this relationship belongs to.
     */
    public function tree(): BelongsTo
    {
        return $this->belongsTo(Tree::class, 'tree_id');
    }

    /**
     * Get the first person in the relationship.
     */
    public function personA(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'person_a');
    }

    /**
     * Get the second person in the relationship.
     */
    public function personB(): BelongsTo
    {
        return $this->belongsTo(Person::class, 'person_b');
    }
}
