# NEXPOS

Platform **Point of Sale (POS)** dan business intelligence berbasis AI untuk
satu bisnis.

NEXPOS bukan aplikasi multi-tenant dan bukan SaaS. Laravel berperan sebagai
`source of truth` untuk business rules, authorization, validation, transaction,
inventory, financial calculation, dan eksekusi AI tool.

## Fitur Utama

- POS dengan pencarian barcode, cart, discount, split payment, kembalian, dan receipt.
- Master data produk, variant, category, brand, unit, customer, supplier, dan store.
- Ledger-based inventory dengan purchase, stock adjustment, return, dan audit history.
- Cash session dengan opening dan closing balance per store.
- Sales return dengan proportional refund dan pengembalian stok.
- Report dengan KPI, daily trend, produk terlaris, inventory value, dan chart.
- AI assistant berbahasa Indonesia menggunakan Ollama dan Qwen3.
- Deterministic AI business tool untuk sales, inventory, customer, purchase, dan report.
- Python ML service untuk forecasting, anomaly detection, recommendation, segmentation, dan OCR.

## Technology Stack

| Area | Teknologi |
| --- | --- |
| Backend | Laravel 13, PHP 8.3 |
| Frontend | React, TypeScript, Inertia.js v3, Tailwind CSS |
| UI dan chart | shadcn/ui, Lucide, Nivo |
| Database | PostgreSQL atau SQLite untuk local development |
| Permission | Spatie Laravel Permission |
| LLM | Ollama dengan Qwen3 |
| ML service | Python, FastAPI, pandas, NumPy, scikit-learn, statsmodels |

## Arsitektur

```text
Browser
  |
  v
React + Inertia
  |
  v
Laravel application --------------------> PostgreSQL / SQLite
  |                                        business source of truth
  |
  +--> Ollama / Qwen3
  |      |
  |      +--> registered Laravel business tools
  |
  +--> FastAPI ML service :8001
         statistical and machine-learning computations only
```

LLM tidak pernah terhubung langsung ke database, mengeksekusi SQL, atau
menentukan authorization user. Laravel melakukan validation dan authorization
untuk setiap tool call. ML service menerima aggregated dataset dan mengembalikan
hasil komputasi; service ini tidak memiliki business authorization atau akses
database.

## Prasyarat

- PHP 8.3+
- Composer
- Node.js and npm
- PostgreSQL, atau SQLite untuk local setup yang ringan
- Python 3.10+ untuk ML service
- Ollama untuk AI chat dan AI-assisted analysis

Pengguna Windows dapat menjalankan project ini menggunakan Laragon.

## Quick Start

### Laravel Application

```powershell
git clone <repository-url>
cd nexpos

composer install
Copy-Item .env.example .env
php artisan key:generate

npm install
php artisan migrate --seed
npm run build
```

Akun administrator dari seeder:

```text
Email: admin@example.com
Password: password
```

Ganti password tersebut sebelum aplikasi digunakan di luar local development.

### Menjalankan Development Environment

```powershell
composer run dev
```

Laravel development server, queue worker, log process, dan Vite development
server dijalankan melalui Composer script project.

Jika ingin menjalankan setiap process secara terpisah:

```powershell
php artisan serve
npm run dev
php artisan queue:work
```

### Konfigurasi

Salin `.env.example` menjadi `.env`, lalu sesuaikan konfigurasi database.
Environment variable penting untuk local AI:

```dotenv
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_MODEL_FAST=qwen3:4b
OLLAMA_TIMEOUT=180

ML_URL=http://127.0.0.1:8001
ML_API_TOKEN=use-a-local-secret
ML_TIMEOUT=60
```

Jangan commit `.env`, API token, database credential, model file, atau database dump.

## Ollama

Install Ollama secara terpisah, lalu pull model yang dikonfigurasi di `.env`:

```powershell
ollama pull qwen3:8b
ollama pull qwen3:4b
```

Ollama bersifat optional untuk halaman POS dan report, tetapi wajib untuk
natural-language AI assistant.

## ML Service

ML service bersifat compute-only. Jalankan dari root repository:

```powershell
python -m venv ml\.venv
ml\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt

$env:ML_API_TOKEN='use-the-same-value-as-.env'
ml\.venv\Scripts\python.exe -m uvicorn app:app `
    --host 127.0.0.1 --port 8001 --app-dir ml
```

Verifikasi bahwa service berjalan:

```powershell
Invoke-WebRequest http://127.0.0.1:8001/health
```

Endpoint yang tersedia:

| Endpoint | Fungsi |
| --- | --- |
| `GET /health` | Service health check |
| `POST /forecast` | Demand forecast |
| `POST /anomalies` | Revenue and transaction anomaly detection |
| `POST /recommend` | Product co-occurrence recommendations |
| `POST /segment` | RFM customer segmentation |
| `POST /ocr/invoice` | Invoice OCR |

Generate hasil ML dari Laravel setelah service berjalan:

```powershell
php artisan forecast:generate
php artisan anomalies:scan
php artisan recommend:generate
php artisan customers:segment
```

Command tersebut melakukan aggregation data di Laravel, memanggil Python service,
lalu menyimpan hasilnya ke application table untuk dashboard dan report.

## Built-in Role

| Role | Ruang lingkup |
| --- | --- |
| `admin` | Akses penuh ke aplikasi |
| `manager` | Business operation, report, dan AI; tanpa akses user dan settings management |
| `cashier` | POS, product, inventory viewing, sales, customer, dan AI |

Authorization ditegakkan melalui Laravel middleware, policy, dan form request.

## Testing dan Quality Check

Jalankan check paling spesifik saat development:

```powershell
php artisan test --compact tests/Feature/Reports/ReportTest.php
npm run types:check
```

Jalankan seluruh project check sebelum publish perubahan:

```powershell
php artisan test --compact
vendor/bin/pint --format agent
vendor/bin/phpstan analyse --no-progress
npm run check
npm run types:check
npm run build
```

## Struktur Project

```text
app/              Laravel controller, model, policy, service, dan AI tool
database/         migration, factory, dan seeder
ml/               FastAPI ML service dan statistical workload
resources/js/     Inertia React page, component, layout, dan type
routes/           web, settings, dan console route
tests/            Pest feature dan unit test
```
## Roadmap

Foundation yang sudah tersedia:

- Authentication, role, dan permission
- Master data dan store management
- Inventory ledger, purchase, adjustment, dan return
- POS, cash session, payment, dan receipt
- Report, dashboard, chart, dan business settings
- AI assistant, deterministic business tool, dan daily briefing
- ML forecasting, anomaly detection, recommendation, segmentation, dan OCR foundation

Prioritas berikutnya:

- Menyelesaikan document intelligence dan invoice verification workflow
- Memperluas operational dan financial reporting
- Meningkatkan scheduled ML execution dan monitoring
- Menambahkan dokumentasi production deployment dan observability

## License

Project ini saat ini dikelola sebagai portfolio dan development project.
