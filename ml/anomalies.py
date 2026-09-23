"""Anomaly detection: z-score on daily revenue and transactions.

Pure functions, no I/O. Laravel sends the daily series and stores results.
"""

from __future__ import annotations

import numpy as np


def _zscores(values: list[float]) -> list[float]:
    arr = np.array(values, dtype=float)
    if arr.size < 7:
        return [0.0] * arr.size
    std = float(np.std(arr))
    if std == 0:
        return [0.0] * arr.size
    mean = float(np.mean(arr))
    return [abs(float(v) - mean) / std for v in values]


def detect(points: list[dict]) -> list[dict]:
    """Flag days with |z| >= 2 on revenue or transactions."""
    revenues = [max(0.0, float(p.get('revenue', 0))) for p in points]
    counts = [max(0.0, float(p.get('transactions', 0))) for p in points]

    rz = _zscores(revenues)
    tz = _zscores(counts)

    findings: list[dict] = []
    means = {'revenue': float(np.mean(revenues)) if revenues else 0.0,
             'transactions': float(np.mean(counts)) if counts else 0.0}

    for i, point in enumerate(points):
        for metric, z, value in (('revenue', rz[i], revenues[i]), ('transactions', tz[i], counts[i])):
            if z < 2.0:
                continue
            direction = 'spike' if value >= means[metric] else 'drop'
            findings.append({
                'date': str(point.get('date', '')),
                'type': f'{metric}_{direction}',
                'severity': 'high' if z >= 3.0 else 'medium',
                'score': round(z, 2),
                'note': f'{metric} {value:g} menyimpang {round(z, 2)} simpangan baku dari rata-rata {round(means[metric], 2):g}',
            })

    return findings
