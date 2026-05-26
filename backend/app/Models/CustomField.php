<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomField extends Model
{
    use HasUuids;

    protected $fillable = [
        'tree_id',
        'field_name',
        'field_type',
        'validation_rules',
    ];

    protected $casts = [
        'validation_rules' => 'array',
    ];

    /**
     * Get the tree this custom field is defined for.
     */
    public function tree(): BelongsTo
    {
        return $this->belongsTo(Tree::class, 'tree_id');
    }
}
