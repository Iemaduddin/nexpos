<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Quantities become decimal(12,3) to support weighed goods
 * (e.g. 0.5 kg sugar) and manual split packs. Money stays integer.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_levels', function (Blueprint $table) {
            $table->decimal('qty_on_hand', 12, 3)->default(0)->change();
            $table->decimal('qty_reserved', 12, 3)->default(0)->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->decimal('qty_change', 12, 3)->change();
            $table->decimal('qty_before', 12, 3)->change();
            $table->decimal('qty_after', 12, 3)->change();
        });

        Schema::table('purchase_items', function (Blueprint $table) {
            $table->decimal('qty_ordered', 12, 3)->change();
            $table->decimal('qty_received', 12, 3)->default(0)->change();
        });

        Schema::table('stock_adjustment_items', function (Blueprint $table) {
            $table->decimal('qty_system', 12, 3)->change();
            $table->decimal('qty_actual', 12, 3)->change();
            $table->decimal('qty_diff', 12, 3)->change();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('qty', 12, 3)->change();
        });

        Schema::table('sale_return_items', function (Blueprint $table) {
            $table->decimal('qty', 12, 3)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_return_items', function (Blueprint $table) {
            $table->integer('qty')->change();
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->integer('qty')->change();
        });

        Schema::table('stock_adjustment_items', function (Blueprint $table) {
            $table->integer('qty_system')->change();
            $table->integer('qty_actual')->change();
            $table->integer('qty_diff')->change();
        });

        Schema::table('purchase_items', function (Blueprint $table) {
            $table->integer('qty_ordered')->change();
            $table->integer('qty_received')->default(0)->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->integer('qty_change')->change();
            $table->integer('qty_before')->change();
            $table->integer('qty_after')->change();
        });

        Schema::table('stock_levels', function (Blueprint $table) {
            $table->integer('qty_on_hand')->default(0)->change();
            $table->integer('qty_reserved')->default(0)->change();
        });
    }
};
