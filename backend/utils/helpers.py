def normalize_category(category: str) -> str:
    return category.strip().lower()


def format_distance(distance_km: float | None) -> str:
    if distance_km is None:
        return "Distance unavailable"

    if distance_km < 1:
        return f"{distance_km * 1000:.0f} m"

    return f"{distance_km:.1f} km"