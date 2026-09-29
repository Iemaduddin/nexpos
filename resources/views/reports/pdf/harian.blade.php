@extends('reports.pdf.layout')

@section('content')
<table>
    <thead>
        <tr>
            <th>Tanggal</th>
            <th class="num">Transaksi</th>
            <th class="num">Omzet</th>
            <th class="num">Refund</th>
            <th class="num">HPP</th>
            <th class="num">Laba</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($daily as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="num">{{ $row['transactions'] }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['revenue']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['refunds']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($cogsByDate[$row['date']]['cogs'] ?? 0) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['profit']) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<table class="summary">
    <tr><td>Pendapatan kotor</td><td class="num">{{ \App\Services\ReportPdf::rupiah($overview['revenue']) }}</td></tr>
    <tr><td>Refund</td><td class="num">{{ \App\Services\ReportPdf::rupiah($overview['refunds']) }}</td></tr>
    <tr><td>Pendapatan bersih</td><td class="num">{{ \App\Services\ReportPdf::rupiah($overview['net_revenue']) }}</td></tr>
    <tr><td>Laba kotor</td><td class="num">{{ \App\Services\ReportPdf::rupiah($overview['profit']) }}</td></tr>
</table>
@endsection
