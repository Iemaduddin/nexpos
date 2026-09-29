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
        Schema::create('ml_runs', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 30);
            $table->string('status', 20)->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('finished_at')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->integer('result_count')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['kind', 'started_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ml_runs');
    }
};
