<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessDocumentOcrJob;
use App\Models\Document;
use App\Models\Product;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Document::class);

        $documents = Document::query()
            ->with(['supplier:id,name', 'purchase:id,number'])
            ->orderByDesc('id')
            ->paginate(10);

        return Inertia::render('documents/index', [
            'documents' => $documents,
        ]);
    }

    /**
     * Store the upload and queue OCR so the request stays fast.
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', Document::class);

        $validated = $request->validate([
            'file' => ['required', 'image', 'max:5120'],
        ]);

        /** @var UploadedFile $file */
        $file = $validated['file'];
        $path = $file->store('documents', 'local');

        $document = Document::create([
            'type' => 'purchase_invoice',
            'file_path' => $path,
            'status' => 'pending',
            'uploaded_by' => $request->user()->id,
        ]);

        ProcessDocumentOcrJob::dispatch($document->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Dokumen diunggah. OCR berjalan di latar belakang, periksa lagi sesaat lagi.']);

        return to_route('documents.show', $document);
    }

    /**
     * Display the document with extraction results.
     */
    public function show(Document $document): Response
    {
        Gate::authorize('view', $document);

        $document->load(['supplier:id,name', 'purchase:id,number']);

        return Inertia::render('documents/show', [
            'document' => $document,
        ]);
    }

    /**
     * Serve the private file to authorized users.
     */
    public function file(Document $document): BinaryFileResponse
    {
        Gate::authorize('view', $document);

        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return response()->file(Storage::disk('local')->path($document->file_path));
    }

    /**
     * Show the verification form prefilled from extraction.
     */
    public function verify(Document $document): Response|RedirectResponse
    {
        Gate::authorize('verify', $document);

        if ($document->status === 'verified') {
            return to_route('purchases.show', $document->purchase_id);
        }

        if ($document->status !== 'processed') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Dokumen belum berhasil diproses.']);

            return to_route('documents.show', $document);
        }

        $extracted = $document->extracted_data ?? [];

        return Inertia::render('documents/verify', [
            'document' => $document->only(['id', 'status']),
            'initial' => [
                'supplier_id' => $this->matchSupplier($extracted['supplier_name'] ?? null),
                'store_id' => '',
                'discount' => '',
                'tax' => '',
                'notes' => isset($extracted['number']) && is_string($extracted['number'])
                    ? "Dari faktur {$extracted['number']}"
                    : '',
                'document_id' => $document->id,
            ],
            'initialItems' => $this->matchItems($extracted['items'] ?? []),
            'suppliers' => Supplier::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'stores' => Store::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'is_main']),
            'products' => Product::query()
                ->where('is_active', true)
                ->with(['variants' => fn ($query) => $query->where('is_active', true)])
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'cost_price']),
        ]);
    }

    /**
     * Re-queue OCR for a failed document.
     */
    public function retry(Document $document): RedirectResponse
    {
        Gate::authorize('verify', $document);

        if (! in_array($document->status, ['failed', 'pending'], true)) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya dokumen gagal yang dapat diproses ulang.']);

            return to_route('documents.show', $document);
        }

        $document->update(['status' => 'pending', 'processed_at' => null]);
        ProcessDocumentOcrJob::dispatch($document->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'OCR dimasukkan ke antrean. Periksa lagi sesaat lagi.']);

        return to_route('documents.show', $document);
    }

    /**
     * Reject a document so it never becomes a purchase.
     */
    public function reject(Document $document): RedirectResponse
    {
        Gate::authorize('verify', $document);

        if ($document->status === 'verified') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Dokumen yang sudah menjadi pembelian tidak dapat ditolak.']);

            return to_route('documents.show', $document);
        }

        $document->update(['status' => 'rejected']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Dokumen ditolak dan tidak akan menjadi pembelian.']);

        return to_route('documents.show', $document);
    }

    /**
     * Remove an unlinked document and its file.
     */
    public function destroy(Document $document): RedirectResponse
    {
        Gate::authorize('delete', $document);

        if ($document->status === 'verified') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Dokumen yang sudah menjadi pembelian tidak dapat dihapus.']);

            return to_route('documents.show', $document);
        }

        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Dokumen berhasil dihapus.']);

        return to_route('documents.index');
    }

    private function matchSupplier(mixed $name): string
    {
        if (! is_string($name) || trim($name) === '') {
            return '';
        }

        $words = array_values(array_filter(
            explode(' ', $name),
            fn ($word) => mb_strlen((string) $word) >= 4
        ));

        $fragment = implode(' ', array_slice($words, 0, 2));

        if ($fragment === '') {
            return '';
        }

        $id = Supplier::query()
            ->where('is_active', true)
            ->where('name', 'like', "%{$fragment}%")
            ->orderBy('id')
            ->value('id');

        return $id === null ? '' : (string) $id;
    }

    /**
     * @return list<array{key: int, product_id: string, variant_id: string, qty: string, cost: string, label: string}>
     */
    private function matchItems(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $rows = [];
        $key = 0;

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $key++;
            $name = isset($item['name']) ? (string) $item['name'] : '';
            $words = array_values(array_filter(
                explode(' ', $name),
                fn ($word) => mb_strlen((string) $word) >= 4
            ));
            $fragment = implode(' ', array_slice($words, 0, 2));

            $productId = '';

            if ($fragment !== '') {
                $found = Product::query()
                    ->where('is_active', true)
                    ->where('name', 'like', "%{$fragment}%")
                    ->orderBy('id')
                    ->value('id');

                if ($found !== null) {
                    $productId = (string) $found;
                }
            }

            $rows[] = [
                'key' => $key,
                'product_id' => $productId,
                'variant_id' => '',
                'qty' => isset($item['qty']) ? (string) (int) $item['qty'] : '',
                'cost' => isset($item['price']) ? (string) (int) $item['price'] : '',
                'label' => $name,
            ];
        }

        return $rows;
    }
}
