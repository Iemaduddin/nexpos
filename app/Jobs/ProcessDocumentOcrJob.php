<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\DocumentOcr;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessDocumentOcrJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 180;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 600];

    public function __construct(public readonly int $documentId)
    {
        $this->onQueue('ocr');
    }

    public function handle(DocumentOcr $ocr): void
    {
        $document = Document::query()->find($this->documentId);

        if (! $document || ! in_array($document->status, ['pending', 'uploaded', 'processing'], true)) {
            return;
        }

        $document->update(['status' => 'processing']);

        $payload = $ocr->extractStored((string) $document->file_path);

        if ($payload === null) {
            Log::warning('OCR gagal untuk dokumen.', ['document_id' => $document->id]);
            $document->update(['status' => 'failed']);

            return;
        }

        $document->update([
            'ocr_text' => is_string($payload['raw_text'] ?? $payload['text'] ?? null)
                ? ($payload['raw_text'] ?? $payload['text'])
                : $document->ocr_text,
            'extracted_data' => $payload,
            // 'processed' matches DocumentController::verify() expectation.
            'status' => 'processed',
            'processed_at' => now(),
        ]);
    }
}
