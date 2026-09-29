<?php

namespace App\Services;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class ReportPdf
{
    /**
     * Render a known report document into a downloadable PDF response.
     *
     * The report key allow-lists the Blade view so callers can never
     * point the renderer at an arbitrary view. DejaVu Sans ships with
     * dompdf and covers Indonesian text. Remote assets stay disabled:
     * the document must be self-contained.
     *
     * @param  array<string, mixed>  $data
     */
    public function download(string $report, array $data, string $filename): Response
    {
        $view = match ($report) {
            'harian' => 'reports.pdf.harian',
            'hpp' => 'reports.pdf.hpp',
            'kas' => 'reports.pdf.kas',
            default => throw new \InvalidArgumentException("Laporan tidak dikenal: {$report}."),
        };

        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(View::make($view, $data)->render());
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return new Response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public static function rupiah(int|float $value): string
    {
        return 'Rp '.number_format((float) $value, 0, ',', '.');
    }
}
