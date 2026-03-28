import sqlite3
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


def get_test_db():
    """Create an in-memory DB and run init_db on it."""
    from backend.database import init_db
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)
    return conn


def test_users_table_exists():
    conn = get_test_db()
    tables = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    names = [r['name'] for r in tables]
    assert 'users' in names, f"users table not found. Tables: {names}"


def test_users_table_columns():
    conn = get_test_db()
    cols = conn.execute("PRAGMA table_info(users)").fetchall()
    names = [c['name'] for c in cols]
    assert 'id' in names
    assert 'email' in names
    assert 'hashed_password' in names
    assert 'full_name' in names
    assert 'telegram_chat_id' in names
    assert 'trial_ends_at' in names
    assert 'stripe_customer_id' in names
    assert 'stripe_subscription_id' in names
    assert 'subscription_status' in names
    assert 'created_at' in names
    assert 'updated_at' in names


def test_farms_has_user_id_column():
    conn = get_test_db()
    cols = conn.execute("PRAGMA table_info(farms)").fetchall()
    names = [c['name'] for c in cols]
    assert 'user_id' in names, f"user_id not found in farms. Columns: {names}"
