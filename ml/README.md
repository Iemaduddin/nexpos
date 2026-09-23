# NEXPOS ML Service

Compute-only Python service for statistical workloads. Laravel sends
aggregated datasets; this service returns numbers. No database access,
no auth logic, no direct frontend calls.

## Endpoints

| Method            | Keterangan                                 |
| ----------------- | ------------------------------------------ |
| `GET /health`     | Cek hidup                                  |
| `POST /forecast`  | Proyeksi Holt-Winters + fallback rata-rata |
| `POST /anomalies` | Deteksi z-score revenue & transaksi        |
| `POST /recommend` | Pasangan co-occurrence                     |
| `POST /segment`   | RFM + KMeans (deterministik)               |

Semua endpoint POST wajib header `X-ML-Token` berisi `ML_API_TOKEN`.

## Menjalankan (Windows + Laragon)

```powershell
# Sekali saja
D:\STUDY\PROJECT\laragon\bin\python\python-3.10\python.exe -m venv ml\.venv
ml\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt

# Setiap mulai dev (ganti token dengan milikmu, sama dengan .env Laravel)
$env:ML_API_TOKEN='isi-token-disini'
ml\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8001 --app-dir ml
```

## Generates (dari Laravel)

```powershell
php artisan forecast:generate          # mingguan (scheduler Senin 01:00)
php artisan anomalies:scan             # harian (scheduler 06:00)
php artisan recommend:generate         # mingguan (scheduler Selasa 02:00)
php artisan customers:segment          # bulanan (scheduler tgl 1, 03:00)
```
