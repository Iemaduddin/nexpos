"""Invoice OCR: RapidOCR text extraction + Indonesian invoice parsing.

Pure functions except the lazily-loaded OCR engine. Laravel always shows
the result for human verification before creating any purchase.
"""

from __future__ import annotations

import io
import re

_engine = None

MONTHS = ('januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli',
          'agustus', 'september', 'oktober', 'november', 'desember')

SKIP_WORDS = ('faktur', 'invoice', 'nota', 'kwitansi', 'toko', 'pt ', 'cv ',
              'total', 'jumlah', 'tanggal', 'kepada', 'alamat', 'telp', 'npwp')


def get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def run_ocr(image_bytes: bytes) -> dict:
    """Return OCR lines and raw text."""
    engine = get_engine()
    result, _ = engine(image_bytes)

    lines = []
    if result:
        for box, text, conf in result:
            text = (text or '').strip()
            if text:
                lines.append({'text': text, 'confidence': round(float(conf or 0), 3)})

    avg = round(sum(line['confidence'] for line in lines) / len(lines), 3) if lines else 0.0
    return {
        'lines': lines,
        'raw_text': '\n'.join(line['text'] for line in lines),
        'avg_confidence': avg,
    }


def parse_amount(raw: str) -> int | None:
    """Parse Indonesian money text into integer Rupiah."""
    cleaned = re.sub(r'[^0-9.,]', '', raw or '')
    if not cleaned:
        return None
    if ',' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    else:
        cleaned = cleaned.replace('.', '')
    try:
        return int(float(cleaned))
    except ValueError:
        return None


def find_amounts(text: str) -> list[int]:
    return [amount for amount in
            (parse_amount(match) for match in re.findall(r'[\d][\d.,]*', text))
            if amount is not None]


def parse_invoice(lines: list[dict]) -> dict:
    """Extract supplier, number, date, total, and item candidates."""
    texts = [line['text'] for line in lines]
    full = '\n'.join(texts)

    supplier = None
    for text in texts[:6]:
        lowered = text.lower()
        if len(text) >= 4 and not any(word in lowered for word in SKIP_WORDS):
            supplier = text.strip()
            break

    number = None
    match = re.search(r'(?:no\.?|nomor|number)\s*(?:faktur|invoice|nota)?\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{2,30})',
                      full, re.IGNORECASE)
    if match:
        number = match.group(1).strip()

    date = None
    match = re.search(r'(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})', full)
    if match:
        day, month, year = match.groups()
        year = f'20{year}' if len(year) == 2 else year
        date = f'{year}-{int(month):02d}-{int(day):02d}'
    else:
        months = '|'.join(MONTHS)
        match = re.search(rf'(\d{{1,2}})\s+({months})\s+(\d{{4}})', full, re.IGNORECASE)
        if match:
            day, month_name, year = match.groups()
            month = MONTHS.index(month_name.lower()) + 1
            date = f'{year}-{month:02d}-{int(day):02d}'

    total = None
    for pattern in (r'(?:grand\s*total|total\s*bayar|tagihan)[^\d\n]{0,20}([\d.,]+)',
                    r'(?:total|jumlah)[^\d\n]{0,20}([\d.,]+)'):
        matches = re.findall(pattern, full, re.IGNORECASE)
        amounts = [parse_amount(m) for m in matches]
        amounts = [a for a in amounts if a]
        if amounts:
            total = max(amounts)
            break

    items = []
    for text in texts:
        amounts = find_amounts(text)
        if len(amounts) < 2:
            continue
        lowered = text.lower()
        if any(word in lowered for word in ('total', 'jumlah', 'bayar', 'kembalian', 'tunai', 'cash', 'faktur', 'invoice', 'nota', 'tanggal', 'nomor')):
            continue
        name = re.sub(r'[\d.,x×]+', ' ', text)
        name = re.sub(r'\s+', ' ', name).strip(' -')
        if len(name) < 3:
            continue
        items.append({
            'name': name,
            'qty': amounts[0] if amounts[0] <= 10000 else 1,
            'price': amounts[-1],
        })

    return {
        'supplier_name': supplier,
        'number': number,
        'date': date,
        'total': total,
        'items': items[:50],
    }


def extract(image_bytes: bytes) -> dict:
    """Full pipeline: OCR then parse."""
    ocr = run_ocr(image_bytes)
    parsed = parse_invoice(ocr['lines'])
    return {**parsed, 'raw_text': ocr['raw_text'], 'avg_confidence': ocr['avg_confidence']}
