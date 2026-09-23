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
        Schema::create('anomaly_detections', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('type', 30);
            $table->string('severity', 20)->default('medium');
            $table->decimal('score', 5, 2)->default(0);
            $table->json('detail')->nullable();
            $table->string('status', 20)->default('new');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['date', 'type']);
            $table->index(['status', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('anomaly_detections');
    }
};
