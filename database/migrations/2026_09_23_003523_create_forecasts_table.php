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
        Schema::create('forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->date('target_date');
            $table->unsignedTinyInteger('horizon_days')->default(7);
            $table->decimal('predicted_qty', 10, 2)->default(0);
            $table->decimal('lower_qty', 10, 2)->default(0);
            $table->decimal('upper_qty', 10, 2)->default(0);
            $table->string('model', 50)->default('unknown');
            $table->string('confidence', 20)->default('low');
            $table->string('model_version', 20)->default('hw-1');
            $table->timestamps();

            $table->index(['product_id', 'target_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('forecasts');
    }
};
