<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('relationships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tree_id')->constrained('trees')->cascadeOnDelete();
            $table->foreignUuid('person_a')->constrained('persons')->cascadeOnDelete();
            $table->foreignUuid('person_b')->constrained('persons')->cascadeOnDelete();
            $table->string('relation_type'); // parent, spouse, sibling, adopted, guardian, step_parent
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationships');
    }
};
