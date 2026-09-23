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
        Schema::table('business_settings', function (Blueprint $table) {
            $table->json('enabled_payment_methods')->nullable();
            $table->unsignedInteger('rounding_unit')->default(1);
            $table->decimal('max_discount_percent', 5, 2)->default(100);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn([
                'enabled_payment_methods',
                'rounding_unit',
                'max_discount_percent',
            ]);
        });
    }
};
