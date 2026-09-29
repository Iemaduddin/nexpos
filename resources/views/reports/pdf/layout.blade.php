<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Laporan' }}</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .meta { color: #555; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 5px 7px; }
        th { background: #eee; text-align: left; }
        td.num, th.num { text-align: right; }
        .summary { margin-top: 12px; width: 60%; margin-left: 40%; }
        .summary td { border: none; border-top: 1px solid #999; }
        .footer { margin-top: 16px; color: #777; font-size: 10px; }
    </style>
</head>
<body>
    <h1>{{ $business }}</h1>
    <div class="meta">{{ $title ?? 'Laporan' }} &middot; {{ $rangeLabel ?? '' }} &middot; Dicetak {{ $printedAt }}</div>
    @yield('content')
    <div class="footer">NEXPOS &middot; dokumen dihasilkan otomatis dari data aplikasi.</div>
</body>
</html>
