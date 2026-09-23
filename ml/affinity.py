"""Product affinity: co-occurrence pairs ("often bought together").

Pure functions, no I/O. Laravel sends baskets of product ids.
"""

from __future__ import annotations

from collections import Counter
from itertools import combinations


def recommend(baskets: list[list[int]], top: int = 50) -> list[dict]:
    """Return directed pairs with support and confidence."""
    clean = [sorted(set(basket)) for basket in baskets if len(set(basket)) >= 2]
    total = len(clean)

    if total == 0:
        return []

    pair_counts: Counter[tuple[int, int]] = Counter()
    item_counts: Counter[int] = Counter()

    for basket in clean:
        for item in basket:
            item_counts[item] += 1
        for a, b in combinations(basket, 2):
            pair_counts[(a, b)] += 1

    scored = []
    for (a, b), pair in pair_counts.items():
        support = pair / total
        if support <= 0:
            continue
        scored.append({'product_id': a, 'with_id': b,
                       'support': round(support, 4),
                       'confidence': round(pair / item_counts[a], 4)})
        scored.append({'product_id': b, 'with_id': a,
                       'support': round(support, 4),
                       'confidence': round(pair / item_counts[b], 4)})

    scored.sort(key=lambda row: (row['confidence'], row['support']), reverse=True)
    return scored[: max(1, top)]
