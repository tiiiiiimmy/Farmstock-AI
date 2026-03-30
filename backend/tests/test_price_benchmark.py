import sqlite3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


def get_test_db():
    from backend.database import init_db
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)
    return conn


def _seed(conn, farms, orders):
    """Insert farms and orders for testing. farms: list of (id, region). orders: list of (farm_id, product_name, unit_price, date, unit)."""
    import uuid
    now = "2026-01-01T00:00:00"
    for farm_id, region in farms:
        conn.execute(
            "INSERT INTO users (id, email, hashed_password, trial_ends_at, subscription_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (farm_id + "-user", farm_id + "@test.com", "x", now, "active", now, now)
        )
        conn.execute(
            "INSERT INTO farms (id, user_id, name, region, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (farm_id, farm_id + "-user", farm_id, region, now, now)
        )
    for farm_id, product_name, unit_price, date, unit in orders:
        conn.execute(
            "INSERT INTO orders (id, farm_id, date, product_name, category, quantity, unit, unit_price, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), farm_id, date, product_name, "feed", 100, unit, unit_price, now)
        )
    conn.commit()


def test_compute_benchmark_returns_aggregates():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "Mixed Grain", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    assert result["data_available"] is True
    assert result["farm_count"] == 3
    assert abs(result["regional_avg"] - 0.80) < 0.01
    assert abs(result["regional_min"] - 0.60) < 0.01
    assert abs(result["regional_max"] - 1.00) < 0.01
    assert result["your_latest_price"] == 0.80
    # farm-a pays 0.80; farm-b pays 1.00 (higher), farm-c pays 0.60 (lower)
    # 1 out of 2 other farms pays more → 50th percentile
    assert result["your_percentile"] == 50


def test_compute_benchmark_case_insensitive():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "mixed grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "MIXED GRAIN", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    assert result["farm_count"] == 3


def test_compute_benchmark_below_threshold_hides_regional_data():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Southland"), ("farm-b", "Southland")],
        orders=[
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Southland", "Mixed Grain")
    assert result["data_available"] is False
    # trend should still be present for current farm
    assert len(result["trend"]) == 1


def test_compute_benchmark_trend_ordered_by_date():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", "Waikato"), ("farm-b", "Waikato"), ("farm-c", "Waikato")],
        orders=[
            ("farm-a", "Mixed Grain", 0.90, "2026-03-01", "kg"),
            ("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg"),
            ("farm-b", "Mixed Grain", 1.00, "2026-01-01", "kg"),
            ("farm-c", "Mixed Grain", 0.60, "2026-01-01", "kg"),
        ]
    )
    result = compute_benchmark(conn, "farm-a", "Waikato", "Mixed Grain")
    dates = [t["date"] for t in result["trend"]]
    assert dates == sorted(dates)
    assert result["your_latest_price"] == 0.90


def test_compute_benchmark_no_region_returns_unavailable():
    from backend.routers.price_benchmark import compute_benchmark
    conn = get_test_db()
    _seed(conn,
        farms=[("farm-a", None)],
        orders=[("farm-a", "Mixed Grain", 0.80, "2026-01-01", "kg")]
    )
    result = compute_benchmark(conn, "farm-a", None, "Mixed Grain")
    assert result["data_available"] is False
