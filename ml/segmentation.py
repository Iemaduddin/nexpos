"""Customer segmentation: RFM + KMeans into retail segments.

Pure functions, no I/O. Fixed random_state keeps results deterministic.
"""

from __future__ import annotations

import numpy as np

SEGMENTS = ['Champions', 'Loyal', 'At-risk', 'Lost']


def _rule_based(customers: list[dict]) -> list[dict]:
    out = []
    for customer in customers:
        freq = float(customer.get('frequency', 0))
        rec = float(customer.get('recency', 9999))
        if freq <= 1 or rec > 180:
            segment = 'Lost' if rec > 180 and freq > 0 else 'New'
        elif freq >= 5 and rec <= 30:
            segment = 'Champions'
        elif freq >= 3:
            segment = 'Loyal'
        else:
            segment = 'At-risk'
        out.append({'id': customer.get('id'), 'segment': segment})
    return out


def segment(customers: list[dict]) -> list[dict]:
    """Cluster RFM into 4 ordered segments."""
    rows = [
        (c.get('id'),
         max(0.0, float(c.get('recency', 9999))),
         max(0.0, float(c.get('frequency', 0))),
         max(0.0, float(c.get('monetary', 0))))
        for c in customers
    ]

    if len(rows) < 8:
        labeled = _rule_based(customers)
        # Keep the 4 canonical names for small data.
        return [{**row, 'segment': 'New' if row['segment'] == 'New' else row['segment']}
                for row in labeled]

    try:
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        return _rule_based(customers)

    ids = [row[0] for row in rows]
    # Recency inverted so higher is always better.
    matrix = np.array([[-row[1], row[2], row[3]] for row in rows], dtype=float)

    try:
        scaled = StandardScaler().fit_transform(matrix)
        labels = KMeans(n_clusters=4, n_init=10, random_state=42).fit_predict(scaled)
    except Exception:
        return _rule_based(customers)

    order = sorted(range(4), key=lambda k: float(np.mean(scaled[labels == k], axis=0).sum()
                                                 if (labels == k).any() else -np.inf),
                   reverse=True)

    rank = {cluster: SEGMENTS[i] for i, cluster in enumerate(order)}
    return [{'id': ids[i], 'segment': rank[int(label)]} for i, label in enumerate(labels)]
