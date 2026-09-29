@extends('reports.pdf.layout')

@section('content')
<table>
    <thead>
        <tr>
            <th>Produk</th>
            <th>SKU</th>
            <th class="num">Qty Bersih</th>
            <th class="num">Pendapatan</th>
            <th class="num">Refund</th>
            <th class="num">HPP</th>
            <th class="num">Marjin</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['sku'] }}</td>
                <td class="num">{{ $row['qty'] }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['revenue']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['refunds']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['cogs']) }}</td>
                <td class="num">{{ \App\Services\ReportPdf::rupiah($row['margin']) }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

<table class="summary">
    <tr><td>HPP kotor</td><td class="num">{{ \App\Services\ReportPdf::rupiah($cogs['gross_cogs']) }}</td></tr>
    <tr><td>HPP diretur</td><td class="num">{{ \App\Services\ReportPdf::rupiah($cogs['returned_cogs']) }}</td></tr>
    <tr><td>HPP bersih</td><td class="num">{{ \App\Services\ReportPdf::rupiah($cogs['net_cogs']) }}</td></tr>
    <tr><td>Marjin kotor</td><td class="num">{{ \App\Services\ReportPdf::rupiah($cogs['gross_margin']) }}</td></tr>
</table>
@endsection
