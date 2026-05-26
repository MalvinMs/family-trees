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
        Schema::create('persons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tree_id')->constrained('trees')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('gender')->default('other'); // male, female, other
            $table->date('birth_date')->nullable();
            $table->date('death_date')->nullable();
            $table->text('biography')->nullable();
            $table->jsonb('dynamic_data')->nullable(); // holds values for custom fields
            $table->jsonb('ui_metadata')->nullable();  // visual rendering config (e.g. coordinates, colors)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('persons');
    }
};
