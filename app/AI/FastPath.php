<?php

namespace App\AI;

use App\Models\User;

/**
 * Deterministic fast path for the most common questions.
 *
 * Same tools and numbers as the LLM flow, but answered from templates
 * in milliseconds. Returns null when no intent matches so the caller
 * falls through to the model. Analytical questions are never handled
 * here — they need reasoning, not lookup.
 */
class FastPath
{
    /**
     * @var list<string>
     */
    private const ANALYTICAL_KEYWORDS = [
        'kenapa', 'mengapa', 'sebab', 'penyebab', 'analis', 'strategi',
        'banding', 'bagaimana', 'prediksi', 'proyeksi', 'insight',
        'evaluasi', 'rekomendasi', 'saran', 'tren', 'trend',
        'jelaskan', 'uraikan', 'simpulkan',
    ];

    public function __construct(private readonly ToolRegistry $registry) {}

    /**
     * @return array{reply: string}|null
     */
    public function answer(User $user, string $message): ?array
    {
        $text = mb_strtolower(trim($message));

        foreach (self::ANALYTICAL_KEYWORDS as $keyword) {
            if (str_contains($text, $keyword)) {
                return null;
            }
        }

        return $this->omzet($user, $text)
            ?? $this->transactions($user, $text)
            ?? $this->topProducts($user, $text)
            ?? $this->lowStock($user, $text)
            ?? $this->profit($user, $text);
    }

    /**
     * @return array{reply: string}|null
     */
    private function omzet(User $user, string $text): ?array
    {
        if (! str_contains($text, 'omzet') && ! str_contains($text, 'pendapatan') && ! str_contains($text, 'pemasukan')) {
            return null;
        }

        try {
            $result = $this->registry->run($user, 'get_sales_summary', ['period' => $this->period($text)]);
        } catch (AiException) {
            return null;
        }

        return ['reply' => "Omzet {$this->periodLabel($text)}: {$this->rupiah($result['revenue'])} dari {$result['transactions']} transaksi."];
    }

    /**
     * @return array{reply: string}|null
     */
    private function transactions(User $user, string $text): ?array
    {
        if (! str_contains($text, 'transaksi')) {
            return null;
        }

        if (! str_contains($text, 'berapa') && ! str_contains($text, 'jumlah')) {
            return null;
        }

        try {
            $result = $this->registry->run($user, 'get_sales_summary', ['period' => $this->period($text)]);
        } catch (AiException) {
            return null;
        }

        return ['reply' => "Transaksi {$this->periodLabel($text)}: {$result['transactions']} transaksi."];
    }

    /**
     * @return array{reply: string}|null
     */
    private function topProducts(User $user, string $text): ?array
    {
        if (! str_contains($text, 'laris') && ! str_contains($text, 'laku')) {
            return null;
        }

        // Negated questions ("tidak laku") need model nuance.
        if (str_contains($text, 'tidak') || str_contains($text, 'kurang') || str_contains($text, 'sepi')) {
            return null;
        }

        try {
            $result = $this->registry->run($user, 'get_top_products', ['period' => $this->period($text), 'limit' => 5]);
        } catch (AiException) {
            return null;
        }

        $products = $result['products'] ?? [];

        if ($products === []) {
            return ['reply' => 'Belum ada produk terjual pada periode tersebut.'];
        }

        $lines = [];

        foreach ($products as $i => $product) {
            $lines[] = ($i + 1).'. '.$product['name'].' ('.$product['qty'].' terjual)';
        }

        return ['reply' => 'Produk paling laku '.$this->periodLabel($text).":\n".implode("\n", $lines)];
    }

    /**
     * @return array{reply: string}|null
     */
    private function lowStock(User $user, string $text): ?array
    {
        if (! str_contains($text, 'stok')) {
            return null;
        }

        if (! str_contains($text, 'menipis') && ! str_contains($text, 'habis') && ! str_contains($text, 'rendah') && ! str_contains($text, 'kosong')) {
            return null;
        }

        try {
            $result = $this->registry->run($user, 'get_low_stock_products', ['limit' => 5]);
        } catch (AiException) {
            return null;
        }

        $products = $result['products'] ?? [];

        if ($products === []) {
            return ['reply' => 'Semua stok dalam batas aman.'];
        }

        $lines = [];

        foreach ($products as $i => $product) {
            $lines[] = ($i + 1).'. '.$product['name'].' (sisa '.$product['stock'].')';
        }

        return ['reply' => "Stok menipis:\n".implode("\n", $lines)];
    }

    /**
     * @return array{reply: string}|null
     */
    private function profit(User $user, string $text): ?array
    {
        if (! str_contains($text, 'laba') && ! str_contains($text, 'untung') && ! str_contains($text, 'profit')) {
            return null;
        }

        try {
            $result = $this->registry->run($user, 'get_profit_summary', ['period' => $this->period($text)]);
        } catch (AiException) {
            return null;
        }

        return ['reply' => "Laba kotor {$this->periodLabel($text)}: {$this->rupiah($result['profit'])}."];
    }

    private function period(string $text): string
    {
        if (str_contains($text, 'kemarin')) {
            return 'yesterday';
        }

        if (str_contains($text, 'minggu')) {
            return 'this_week';
        }

        if (str_contains($text, 'bulan')) {
            return 'this_month';
        }

        return 'today';
    }

    private function periodLabel(string $text): string
    {
        return match ($this->period($text)) {
            'yesterday' => 'kemarin',
            'this_week' => 'minggu ini',
            'this_month' => 'bulan ini',
            default => 'hari ini',
        };
    }

    private function rupiah(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }
}
