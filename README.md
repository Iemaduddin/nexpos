# NEXPOS — AI-Powered POS & Business Intelligence

Aplikasi kasir (POS) dan analitik bisnis untuk **satu bisnis** (bukan multi-tenant,
bukan SaaS). Laravel sebagai sumber kebenaran, PostgreSQL untuk data bisnis,
Python untuk komputasi statistik/ML, dan Qwen3 8B (via Ollama, lokal) sebagai
antarmuka bahasa alami lewat tool calling yang terkontrol.

## Fitur

- **Kasir (POS)** — pencarian/scan barcode, keranjang, diskon, split pembayaran,
  kembalian, struk cetak. Checkout wajib sesi kas terbuka.
- **Master data** — produk (+varian, gambar), kategori, brand, satuan,
  pelanggan, supplier, toko.
- **Inventaris ledger** — pembelian (draf → dipesan → diterima), penyesuaian
  opname (draf → disetujui), semua mutasi tercatat (`stock_movements`).
- **Sesi kas** — buka/tutup per toko dengan ekspektasi laci
  (saldo awal + tunai − refund).
- **Retur penjualan** — refund proporsional, stok dikembalikan via ledger.
- **Laporan** — dashboard KPI, tren harian, produk terlaris, nilai inventaris,
  proyeksi, afinitas, segmentasi.
- **AI Asisten** — chat Bahasa Indonesia di atas 15 tool bisnis deterministik,
  briefing pagi harian, deteksi anomali. Hybrid model: `qwen3:4b` untuk
  pertanyaan sederhana, `qwen3:8b` untuk analisis.
- **ML (layanan `ml/`)** — forecast Holt-Winters, anomali z-score, afinitas
  co-occurrence, segmentasi RFM + KMeans. Dijadwalkan via Laravel scheduler.

## Arsitektur

```text
React (Inertia) → Laravel → PostgreSQL
                      ↓ → Ollama (qwen3:8b) → Tool → Laravel → jawaban
                      ↓ → FastAPI :8001 (dataset agregat → angka)
```

Aturan keras: model LLM tidak pernah akses database, tidak menghitung angka
bisnis, dan tidak memutuskan otorisasi. Lihat `AGENTS.md` untuk kontrak penuh.

## Menjalankan (Windows + Laragon)

```powershell
# 1. Database & app
php artisan migrate
php artisan db:seed              # peran, data dasar, admin@example.com / password

# 2. AI lokal (wajib untuk chat; Ollama + model qwen3:8b)
#    set OLLAMA_URL / OLLAMA_MODEL di .env bila non-default

# 3. Layanan ML (opsional, untuk forecast/anomali/segmentasi)
$env:ML_API_TOKEN='samakan-dengan-.env'
ml\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8001 --app-dir ml
# setup sekali: python -m venv ml\.venv; ml\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt

# 4. Generate ML awal
php artisan forecast:generate
php artisan anomalies:scan
php artisan recommend:generate
php artisan customers:segment

# 5. Dev server
composer run dev
```

Variabel env tambahan: lihat `.env.example`
(`OLLAMA_*`, `ML_URL`, `ML_API_TOKEN`, `ML_TIMEOUT`).

## Peran bawaan

| Peran     | Akses                                                  |
| --------- | ------------------------------------------------------ |
| `admin`   | Semua                                                  |
| `manager` | Semua kecuali kelola user & pengaturan                 |
| `cashier` | Kasir, lihat produk/inventaris/penjualan/pelanggan, AI |

Login awal: `admin@example.com` / `password` (dari seeder).

## Verifikasi

```powershell
php vendor/bin/pint --format agent app database tests   # gaya kode
npx tsc --noEmit                                        # tipe frontend
npm run check                                           # lint + format frontend
php vendor/bin/phpstan analyse --no-progress            # analisis statis (level 7)
php artisan test --compact                              # suite Pest (153 test)
npm run build                                           # build produksi
```

## Status & peta jalan

Selesai: fondasi, master data, inventaris, POS + sesi kas, reporting,
AI foundation + copilot, ML forecast/anomali/afinitas/segmentasi.
Belum: Stage 9 Document Intelligence (OCR invoice + verifikasi pembelian).
