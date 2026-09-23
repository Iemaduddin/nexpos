<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Invoice OCR via the Python ML service.
 *
 * Returns the extracted payload or null when unavailable.
 * Callers decide the document status; nothing is auto-created.
 */
class DocumentOcr
{
    /**
     * @return array<string, mixed>|null
     */
    public function extract(UploadedFile $file): ?array
    {
        $contents = file_get_contents($file->getRealPath());

        if ($contents === false) {
            return null;
        }

        return $this->send($contents, $file->getClientOriginalName());
    }

    /**
     * Extract from an already-stored file. Null when unavailable.
     *
     * @return array<string, mixed>|null
     */
    public function extractStored(string $path): ?array
    {
        $contents = Storage::disk('local')->get($path);

        if ($contents === null) {
            return null;
        }

        return $this->send($contents, basename($path));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function send(string $contents, string $filename): ?array
    {
        try {
            $response = Http::baseUrl((string) config('services.ml.url'))
                ->withHeader('X-ML-Token', (string) config('services.ml.token'))
                ->timeout((int) config('services.ml.timeout', 60))
                ->attach('file', $contents, $filename)
                ->post('/ocr/invoice');

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();

            return is_array($data) ? $data : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
