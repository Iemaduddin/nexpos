"""Demand forecasting: Holt-Winters with naive fallbacks.

Pure functions, no I/O. Laravel sends the daily series and assigns dates.
"""

from __future__ import annotations

import numpy as np


def _seasonal_naive(values: list[float], horizon: int, season: int = 7) -> list[float]:
    if not values:
        return [0.0] * horizon
    history = values[-season:] or [0.0]
    return [history[i % len(history)] for i in range(horizon)]


def _moving_average(values: list[float], horizon: int, window: int = 7) -> list[float]:
    if not values:
        return [0.0] * horizon
    avg = float(np.mean(values[-window:]))
    return [avg] * horizon


def _holt_winters(values: list[float], horizon: int) -> tuple[list[float], str] | None:
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
    except ImportError:
        return None

    try:
        seasonal = 7 if len(values) >= 21 else None
        fit = ExponentialSmoothing(
            values,
            trend='add',
            seasonal='add' if seasonal else None,
            seasonal_periods=seasonal,
        ).fit(optimized=True, use_brute=True)
        preds = [max(0.0, float(v)) for v in fit.forecast(horizon)]
        return preds, 'holt-winters-weekly' if seasonal else 'holt-winters-trend'
    except Exception:
        return None


def forecast(values: list[float], horizon: int) -> dict:
    """Return quantities with an 80% interval and the model used."""
    horizon = max(1, min(int(horizon), 30))
    clean = [max(0.0, float(v)) for v in values]

    if len(clean) >= 14 and sum(clean) > 0:
        hw = _holt_winters(clean, horizon)
        if hw is not None:
            preds, model = hw
        else:
            preds, model = _moving_average(clean, horizon), 'moving-average-7d'
    elif clean:
        preds, model = _moving_average(clean, horizon), 'moving-average-7d'
    else:
        preds, model = [0.0] * horizon, 'naive-zero'

    resid = np.array(clean[-14:]) - np.mean(clean[-14:]) if len(clean) >= 2 else np.array([0.0])
    sigma = float(np.std(resid)) if resid.size else 0.0
    margin = 1.28 * sigma

    quantities = [round(v, 2) for v in preds]
    lower = [round(max(0.0, v - margin), 2) for v in preds]
    upper = [round(v + margin, 2) for v in preds]
    confidence = 'high' if model.startswith('holt-winters') and sigma <= (np.mean(clean) or 1) * 0.5 else 'medium' if model != 'naive-zero' else 'low'

    return {
        'quantities': quantities,
        'lower': lower,
        'upper': upper,
        'model': model,
        'confidence': confidence,
    }


def weekly_total(quantities: list[float]) -> float:
    return round(sum(quantities[:7]), 2)
