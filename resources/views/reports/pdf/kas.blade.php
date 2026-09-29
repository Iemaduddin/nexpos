@extends('reports.pdf.layout')

@section('content')
<table class="summary" style="margin-left: 0; width: 100%; margin-top: 0;">
    <tr><td>Saldo awal</td><td class="num">{{ \App\Services\ReportPdf::rupiah($flow['opening_balance']) }}</td></tr>
    <tr><td>Kas masuk penjualan</td><td class="num">{{ \App\Services\ReportPdf::rupiah($flow['cash_in']) }}</td></tr>
    <tr><td>Bayar pemasok</td><td class="num">{{ \App\Services\ReportPdf::rupiah($flow['cash_out_purchases']) }}</td></tr>
    <tr><td>Refund pelanggan</td><td class="num">{{ \App\Services\ReportPdf::rupiah($flow['cash_out_refunds']) }}</td></tr>
    <tr><td>Arus bersih</td><td class="num">{{ \App\Services\ReportPdf::rupiah($flow['net_flow']) }}</td></tr>
    <tr><td><strong>Saldo akhir</strong></td><td class="num"><strong>{{ \App\Services\ReportPdf::rupiah($flow['closing_balance']) }}</strong></td></tr>
</table>

<table>
    <thead>
        <tr>
            <th>Tanggal</th>
            <th class="num">Masuk</th>
            <th class="num">Keluar</th>
            <th class="num">Bersih</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($flow['daily'] as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['in']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['out']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['net']) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>
@endsection
