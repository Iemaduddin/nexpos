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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name');
            $table->string('phone', 30)->unique()->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->date('birthdate')->nullable();
            $table->integer('loyalty_points')->default(0);
            $table->unsignedBigInteger('total_spent')->default(0);
            $table->unsignedInteger('transaction_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
