<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchase_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->timestamp('paid_at')->useCurrent();
            $table->string('notes', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['purchase_id', 'paid_at']);
            $table->index(['paid_at']);
        });

        // Backfill: paid_amount yang sudah tercatat tanpa riwayat tanggal
        // menjadi satu baris pembayaran pada tanggal update terakhir.
        // Tidak ada data arus kas yang hilang; presisi tanggal sebaik
        // riwayat yang tersedia.
        $purchases = DB::table('purchases')
            ->where('paid_amount', '>', 0)
            ->get(['id', 'paid_amount', 'updated_at', 'created_at']);

        foreach ($purchases as $purchase) {
            DB::table('purchase_payments')->insert([
                'purchase_id' => $purchase->id,
                'amount' => $purchase->paid_amount,
                'paid_at' => $purchase->updated_at ?? $purchase->created_at ?? now(),
                'notes' => 'Saldo awal dari pencatatan sebelum riwayat pembayaran.',
                'created_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_payments');
    }
};
