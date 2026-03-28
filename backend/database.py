"""
SQLite database setup, schema creation, and seed data for FarmStock AI.
"""
import sqlite3
import os
import uuid
import json
from datetime import datetime, timedelta

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional local dev dependency
    def load_dotenv(*_args, **_kwargs):
        return False

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "farmstock.db")
_DB_READY = False
LEAD_TIME_BY_CATEGORY = {
    "feed": 6,
    "fertiliser": 10,
    "veterinary": 5,
    "chemical": 7,
    "equipment": 14,
}


def get_db_path() -> str:
    db_path = os.environ.get("DATABASE_PATH", DEFAULT_DB_PATH)
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)
    return db_path


def _connect(db_path: str) -> sqlite3.Connection:
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_db_ready():
    global _DB_READY
    if _DB_READY:
        return

    init_db()
    seed_db()
    _DB_READY = True


def get_db() -> sqlite3.Connection:
    ensure_db_ready()
    return _connect(get_db_path())


def init_db(conn=None):
    """Initialize database schema. Pass an open conn for testing (won't be closed)."""
    external_conn = conn is not None
    if conn is None:
        conn = _connect(get_db_path())
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            telegram_chat_id TEXT,
            trial_ends_at TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            subscription_status TEXT NOT NULL DEFAULT 'trialing',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS farms (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            region TEXT,
            farm_type TEXT,
            herd_size INTEGER,
            land_area_ha REAL,
            whatsapp_number TEXT,
            email TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            name TEXT NOT NULL,
            contact_name TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            categories TEXT,
            FOREIGN KEY (farm_id) REFERENCES farms(id)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            date TEXT NOT NULL,
            product_name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            unit_price REAL,
            total_price REAL,
            supplier_id TEXT,
            notes TEXT,
            created_at TEXT,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            shelf_life_days INTEGER,
            shelf_life_zone TEXT,
            storage_requirements TEXT,
            max_stock_factor REAL,
            typical_unit TEXT,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            product_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS inventory_snapshots (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            current_quantity REAL NOT NULL,
            current_stock_pct REAL NOT NULL,
            estimated_daily_usage REAL NOT NULL,
            lead_time_days INTEGER NOT NULL,
            reorder_threshold_pct REAL NOT NULL,
            lead_time_consumption_pct REAL NOT NULL,
            expiry_date TEXT,
            updated_at TEXT,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS placed_orders (
            id TEXT PRIMARY KEY,
            farm_id TEXT NOT NULL,
            supplier_id TEXT NOT NULL,
            reference_number TEXT NOT NULL,
            items TEXT NOT NULL,
            total_price REAL,
            status TEXT NOT NULL DEFAULT 'sent',
            email_sent_at TEXT,
            channel TEXT DEFAULT 'email',
            created_at TEXT,
            FOREIGN KEY (farm_id) REFERENCES farms(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );
    """)

    # Migration: add user_id to farms if upgrading from v1 (column may not exist)
    existing_farm_cols = [r[1] for r in conn.execute("PRAGMA table_info(farms)").fetchall()]
    if 'user_id' not in existing_farm_cols:
        conn.execute("ALTER TABLE farms ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE")

    conn.commit()
    if not external_conn:
        conn.close()


# Backward-compatibility alias
get_db_connection = get_db


def seed_demo_farm(conn, farm_id: str, user_id: str = None):
    """Seed 6 months of demo purchase history for a newly registered farm."""
    import uuid
    import random
    from datetime import date, timedelta

    today = date.today()
    demo_orders = [
        # (product_name, category, qty, unit, unit_price, days_ago_min, days_ago_max, frequency_days)
        ("Ivomec Plus Drench 2.5L", "veterinary", 2, "units", 89.50, 0, 180, 45),
        ("Dairy Pellets 20kg", "feed", 50, "units", 18.50, 0, 180, 14),
        ("Superphosphate", "fertiliser", 5, "tonnes", 395.00, 30, 150, 90),
        ("Palm Kernel Extract", "feed", 2, "tonnes", 320.00, 0, 120, 30),
        ("Zinc Oxide Supplement", "veterinary", 10, "units", 24.00, 0, 90, 60),
        ("Ryegrass Seed 20kg", "fertiliser", 20, "units", 45.00, 60, 150, 180),
    ]

    for product_name, category, qty, unit, unit_price, min_ago, max_ago, freq in demo_orders:
        num_orders = max(1, max_ago // freq)
        for i in range(num_orders):
            days_ago = min_ago + (i * freq) + random.randint(-5, 5)
            if days_ago < 0:
                continue
            order_date = (today - timedelta(days=days_ago)).isoformat()
            variation = random.uniform(0.9, 1.1)
            order_qty = round(qty * variation, 1)
            order_price = round(unit_price * variation, 2)
            conn.execute(
                """INSERT INTO orders (id, farm_id, date, product_name, category,
                   quantity, unit, unit_price, total_price, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
                (str(uuid.uuid4()), farm_id, order_date, product_name, category,
                 order_qty, unit, order_price, round(order_qty * order_price, 2))
            )
    conn.commit()


def seed_db():
    conn = _connect(get_db_path())
    cur = conn.cursor()

    # Check if already seeded
    row = cur.execute("SELECT COUNT(*) FROM farms").fetchone()
    if row[0] > 0:
        _seed_inventory_snapshots(conn, cur, "farm-001")
        conn.commit()
        conn.close()
        return

    now = datetime.utcnow().isoformat()
    farm_id = "farm-001"
    supplier1_id = "sup-001"
    supplier2_id = "sup-002"

    # --- Farm ---
    cur.execute("""
        INSERT INTO farms (id, name, region, farm_type, herd_size, land_area_ha,
            whatsapp_number, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (farm_id, "Green Valley Dairy", "Canterbury", "dairy", 650, 320.0,
          "+64211234567", "farmer@greenvalley.co.nz", now, now))

    # --- Suppliers ---
    cur.execute("""
        INSERT INTO suppliers (id, farm_id, name, contact_name, contact_email, contact_phone, categories)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (supplier1_id, farm_id, "Farmlands Canterbury", "James Wilson",
          "james@farmlands.co.nz", "+6433441000",
          json.dumps(["feed", "fertiliser", "veterinary", "chemical", "equipment"])))

    cur.execute("""
        INSERT INTO suppliers (id, farm_id, name, contact_name, contact_email, contact_phone, categories)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (supplier2_id, farm_id, "PGG Wrightson Christchurch", "Sarah Mitchell",
          "sarah@pggw.co.nz", "+6433390500",
          json.dumps(["fertiliser", "veterinary", "chemical"])))

    # --- Products ---
    products = [
        ("prod-001", "Ivomec Plus Drench 5L", "veterinary", 730, "yellow",
         "Store below 25°C, away from direct sunlight", 0.67, "L",
         "Broad-spectrum endectocide drench for cattle"),
        ("prod-002", "Dairy Pellets 1t", "feed", 120, "yellow",
         "Store dry, off ground, covered", 0.67, "tonnes",
         "High-energy dairy pellets for lactating cows"),
        ("prod-003", "Superphosphate Fertiliser", "fertiliser", -1, "green",
         "Keep dry", 1.0, "tonnes",
         "Single superphosphate for pasture maintenance"),
        ("prod-004", "Zinc Oxide Supplement 25kg", "veterinary", 730, "yellow",
         "Store in cool dry place", 0.67, "kg",
         "Zinc supplementation to prevent facial eczema"),
        ("prod-005", "Ryegrass Seed 25kg", "feed", 365, "yellow",
         "Store dry in sealed bags", 0.67, "kg",
         "Perennial ryegrass for pasture renovation"),
        ("prod-006", "Roundup Ready 20L", "chemical", 730, "yellow",
         "Store in original container, away from frost", 0.67, "L",
         "Glyphosate herbicide for pasture renovation"),
        ("prod-007", "Mineral Lick Blocks 20kg", "feed", -1, "green",
         "Keep dry", 1.0, "units",
         "Loose mineral blocks for cattle supplementation"),
        ("prod-008", "Hay Bales", "feed", 270, "yellow",
         "Store under cover, off ground", 0.67, "units",
         "Meadow hay bales for supplementary feeding"),
        ("prod-009", "Ear Tags 100pk", "equipment", -1, "green",
         "Store in cool dry place", 1.0, "units",
         "NLIS-approved cattle ear tags"),
        ("prod-010", "Nitrogen Fertiliser Urea", "fertiliser", -1, "green",
         "Keep dry, away from moisture", 1.0, "tonnes",
         "Urea nitrogen for pasture growth stimulation"),
        ("prod-011", "Injectable Antibiotic 500mL", "veterinary", 730, "yellow",
         "Store below 25°C", 0.67, "L",
         "Broad-spectrum injectable antibiotic for cattle"),
        ("prod-012", "Cattle Vaccine 50mL", "veterinary", 180, "red",
         "Refrigerate 2-8°C, cold chain required", 0.5, "mL",
         "Leptospirosis and clostridial vaccine"),
        ("prod-013", "Feed Pellets Premium 500kg", "feed", 150, "yellow",
         "Store dry, off ground", 0.67, "tonnes",
         "Premium protein pellets for milking cows"),
        ("prod-014", "Silage Wrap", "equipment", -1, "green",
         "Store away from UV", 1.0, "units",
         "750mm bale wrap for silage making"),
        ("prod-015", "Herbicide 10L", "chemical", 730, "yellow",
         "Store in original container", 0.67, "L",
         "Selective herbicide for pasture weed control"),
        ("prod-016", "Potassium Chloride", "fertiliser", -1, "green",
         "Keep dry", 1.0, "tonnes",
         "Muriate of potash for pasture nutrition"),
        ("prod-017", "Teat Spray 5L", "veterinary", 365, "yellow",
         "Store at room temperature", 0.67, "L",
         "Iodine-based teat disinfectant spray"),
        ("prod-018", "Electric Fence Wire", "equipment", -1, "green",
         "Store dry", 1.0, "units",
         "High-tensile electric fence wire 500m roll"),
        ("prod-019", "Calf Milk Replacer 20kg", "feed", 365, "yellow",
         "Store dry, sealed", 0.67, "kg",
         "Whole-milk replacer for calf rearing"),
        ("prod-020", "Magnesium Oxide 25kg", "veterinary", 730, "yellow",
         "Store dry, away from moisture", 0.67, "kg",
         "Magnesium supplementation to prevent grass staggers"),
        ("prod-021", "Bloat Oil 20L", "veterinary", 730, "yellow",
         "Store in cool place", 0.67, "L",
         "Bloat prevention oil for high-risk pastures"),
        ("prod-022", "Copper Supplement 1kg", "veterinary", 730, "yellow",
         "Store in cool dry place", 0.67, "kg",
         "Copper bolus supplement for cattle"),
        ("prod-023", "Lime 1t", "fertiliser", -1, "green",
         "Keep dry", 1.0, "tonnes",
         "Agricultural lime for soil pH correction"),
        ("prod-024", "Detergent 20L", "chemical", 730, "yellow",
         "Store at room temperature", 0.67, "L",
         "Dairy shed alkaline detergent for plant cleaning"),
        ("prod-025", "Water Trough Valve", "equipment", -1, "green",
         "Store dry", 1.0, "units",
         "Float valve assembly for water troughs"),
    ]

    for p in products:
        cur.execute("""
            INSERT INTO products (id, name, category, shelf_life_days, shelf_life_zone,
                storage_requirements, max_stock_factor, typical_unit, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, p)

    # --- Orders (180+ generated programmatically) ---
    # Define purchasing patterns per product: (product_name, category, base_interval_days,
    #   winter_multiplier, base_qty, unit, base_unit_price, supplier_id, seasonal_months)
    # seasonal_months: None = year-round, list = only those months
    patterns = [
        # Feed - heavy winter purchasing (Jun-Aug = months 6,7,8)
        ("Dairy Pellets 1t", "feed", 30, 2.0, 8.0, "tonnes", 520.0, supplier1_id, None),
        ("Hay Bales", "feed", 45, 3.0, 50.0, "units", 18.0, supplier1_id, [5, 6, 7, 8, 9]),
        ("Feed Pellets Premium 500kg", "feed", 35, 1.8, 4.0, "tonnes", 680.0, supplier1_id, None),
        ("Calf Milk Replacer 20kg", "feed", 21, 1.0, 10.0, "kg", 85.0, supplier1_id, [8, 9, 10, 11]),
        ("Mineral Lick Blocks 20kg", "feed", 60, 1.2, 20.0, "units", 28.0, supplier1_id, None),
        ("Ryegrass Seed 25kg", "feed", 180, 1.0, 40.0, "kg", 42.0, supplier1_id, [3, 4, 9, 10]),
        # Fertiliser - spring (Sep-Nov)
        ("Superphosphate Fertiliser", "fertiliser", 90, 1.0, 10.0, "tonnes", 380.0, supplier1_id, [9, 10, 11, 2, 3]),
        ("Nitrogen Fertiliser Urea", "fertiliser", 60, 1.0, 5.0, "tonnes", 720.0, supplier1_id, [9, 10, 11, 1, 2, 3]),
        ("Potassium Chloride", "fertiliser", 120, 1.0, 3.0, "tonnes", 560.0, supplier2_id, [9, 10, 11]),
        ("Lime 1t", "fertiliser", 180, 1.0, 15.0, "tonnes", 120.0, supplier1_id, [3, 4, 9, 10]),
        # Veterinary - year-round with seasonal variation
        ("Ivomec Plus Drench 5L", "veterinary", 75, 1.0, 3.0, "L", 145.0, supplier1_id, None),
        ("Zinc Oxide Supplement 25kg", "veterinary", 60, 1.0, 4.0, "kg", 38.0, supplier1_id, [11, 12, 1, 2, 3]),
        ("Injectable Antibiotic 500mL", "veterinary", 90, 1.0, 2.0, "L", 185.0, supplier1_id, None),
        ("Cattle Vaccine 50mL", "veterinary", 180, 1.0, 5.0, "mL", 95.0, supplier2_id, [7, 8, 9]),
        ("Teat Spray 5L", "veterinary", 45, 1.0, 4.0, "L", 62.0, supplier1_id, None),
        ("Magnesium Oxide 25kg", "veterinary", 45, 1.5, 6.0, "kg", 48.0, supplier1_id, [8, 9, 10, 11]),
        ("Bloat Oil 20L", "veterinary", 60, 1.0, 2.0, "L", 88.0, supplier1_id, [10, 11, 12]),
        ("Copper Supplement 1kg", "veterinary", 120, 1.0, 3.0, "kg", 72.0, supplier2_id, None),
        # Chemical
        ("Roundup Ready 20L", "chemical", 90, 1.0, 2.0, "L", 135.0, supplier1_id, [9, 10, 11, 3, 4]),
        ("Herbicide 10L", "chemical", 120, 1.0, 2.0, "L", 98.0, supplier2_id, [9, 10, 11]),
        ("Detergent 20L", "chemical", 30, 1.0, 4.0, "L", 45.0, supplier1_id, None),
        # Equipment
        ("Ear Tags 100pk", "equipment", 90, 1.0, 2.0, "units", 52.0, supplier1_id, None),
        ("Silage Wrap", "equipment", 120, 1.0, 10.0, "units", 38.0, supplier1_id, [2, 3, 4, 5]),
        ("Electric Fence Wire", "equipment", 180, 1.0, 3.0, "units", 145.0, supplier1_id, None),
        ("Water Trough Valve", "equipment", 240, 1.0, 5.0, "units", 28.0, supplier1_id, None),
    ]

    start_date = datetime(2023, 7, 1)
    end_date = datetime(2026, 2, 28)
    order_rows = []

    import random
    random.seed(42)

    for (product_name, category, base_interval, winter_mult, base_qty,
         unit, base_price, sup_id, seasonal_months) in patterns:

        current_date = start_date + timedelta(days=random.randint(0, base_interval))
        while current_date <= end_date:
            month = current_date.month

            # Skip if not in seasonal window
            if seasonal_months and month not in seasonal_months:
                current_date += timedelta(days=base_interval // 2)
                continue

            # Adjust quantity for winter months (Jun-Aug)
            qty_mult = winter_mult if month in (6, 7, 8) else 1.0
            qty = round(base_qty * qty_mult * random.uniform(0.8, 1.2), 2)
            if unit in ("tonnes", "L") and qty < 0.5:
                qty = 0.5

            # Slight price variation over time (inflation)
            months_elapsed = (current_date.year - 2023) * 12 + current_date.month - 7
            price_factor = 1 + (months_elapsed * 0.002) + random.uniform(-0.03, 0.03)
            unit_price = round(base_price * price_factor, 2)
            total_price = round(qty * unit_price, 2)

            order_rows.append((
                str(uuid.uuid4()),
                farm_id,
                current_date.strftime("%Y-%m-%d"),
                product_name,
                category,
                qty,
                unit,
                unit_price,
                total_price,
                sup_id,
                None,
                now,
            ))

            # Next order date: base interval + winter compression + jitter
            interval_days = base_interval
            if month in (6, 7, 8) and category == "feed":
                interval_days = max(14, int(base_interval / winter_mult))
            interval_days = max(7, int(interval_days * random.uniform(0.85, 1.15)))
            current_date += timedelta(days=interval_days)

    for row in order_rows:
        cur.execute("""
            INSERT INTO orders (id, farm_id, date, product_name, category, quantity,
                unit, unit_price, total_price, supplier_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, row)

    # --- Alerts ---
    alerts = [
        ("alert-001", farm_id, "low_stock", "Low Stock: Ivomec Plus Drench",
         "Ivomec Plus Drench 5L is estimated to run out in 8 days. Last ordered 75 days ago. Recommended order: 3 x 5L from Farmlands Canterbury.",
         "prod-001", "pending", (datetime.utcnow() - timedelta(days=1)).isoformat()),
        ("alert-002", farm_id, "weather", "Adverse Weather Alert: Flooding Risk",
         "MetService has issued a heavy rain warning for Canterbury. Consider stocking additional feed (hay bales, dairy pellets) as pasture access may be limited for up to 5 days.",
         None, "pending", (datetime.utcnow() - timedelta(hours=3)).isoformat()),
        ("alert-003", farm_id, "disease", "Facial Eczema Risk: High Spore Count",
         "Spore counts in Canterbury are approaching the warning threshold. Zinc supplementation should commence immediately. Ensure adequate stock of Zinc Oxide 25kg.",
         "prod-004", "sent", (datetime.utcnow() - timedelta(days=3)).isoformat()),
        ("alert-004", farm_id, "price_drop", "Price Drop: Superphosphate Fertiliser",
         "Superphosphate Fertiliser has dropped 8% to $349/tonne at Farmlands Canterbury. Current spring application window is ideal. Consider forward buying 20+ tonnes.",
         "prod-003", "dismissed", (datetime.utcnow() - timedelta(days=7)).isoformat()),
        ("alert-005", farm_id, "monthly_summary", "Monthly Spending Summary: February 2026",
         "February 2026 total spend: $18,450. Feed: $9,200 (50%), Fertiliser: $4,800 (26%), Veterinary: $3,200 (17%), Other: $1,250 (7%). YoY change: +4.2%.",
         None, "actioned", (datetime.utcnow() - timedelta(days=2)).isoformat()),
    ]

    for a in alerts:
        cur.execute("""
            INSERT INTO alerts (id, farm_id, type, title, message, product_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, a)

    _seed_inventory_snapshots(conn, cur, farm_id)

    conn.commit()
    conn.close()


def _seed_inventory_snapshots(conn, cur, farm_id: str):
    existing = cur.execute(
        "SELECT COUNT(*) FROM inventory_snapshots WHERE farm_id = ?",
        (farm_id,),
    ).fetchone()[0]
    if existing > 0:
        return

    product_rows = cur.execute(
        "SELECT * FROM products ORDER BY category, name"
    ).fetchall()
    now = datetime.utcnow()

    for index, product in enumerate(product_rows):
        order_rows = cur.execute("""
            SELECT date, quantity
            FROM orders
            WHERE farm_id = ? AND product_name = ?
            ORDER BY date
        """, (farm_id, product["name"])).fetchall()
        if not order_rows:
            continue

        quantities = [row["quantity"] for row in order_rows]
        recent_quantities = quantities[-3:]
        avg_quantity = sum(recent_quantities) / len(recent_quantities)

        dates = [datetime.strptime(row["date"], "%Y-%m-%d") for row in order_rows]
        if len(dates) > 1:
            intervals = [
                (dates[i + 1] - dates[i]).days
                for i in range(len(dates) - 1)
            ]
            avg_interval = max(7, int(sum(intervals) / len(intervals)))
        else:
            avg_interval = 30

        lead_time_days = LEAD_TIME_BY_CATEGORY.get(product["category"], 7) + (index % 3)
        lead_time_consumption_pct = round(
            min(95.0, (lead_time_days / avg_interval) * 100),
            1,
        )
        reorder_threshold_pct = round(
            min(75.0, max(8.0, lead_time_consumption_pct + 5.0)),
            1,
        )

        if index % 6 == 0:
            current_stock_pct = max(4.0, reorder_threshold_pct - 6.0)
        elif index % 4 == 0:
            current_stock_pct = min(95.0, reorder_threshold_pct + 4.0)
        else:
            current_stock_pct = min(95.0, reorder_threshold_pct + 12.0 + (index % 5) * 6.0)

        current_quantity = round(avg_quantity * (current_stock_pct / 100.0), 2)
        estimated_daily_usage = round(avg_quantity / avg_interval, 3)

        expiry_date = None
        if product["shelf_life_days"] and product["shelf_life_days"] > 0:
            remaining_days = max(
                5,
                min(
                    product["shelf_life_days"],
                    int(product["shelf_life_days"] * (0.18 + (index % 5) * 0.09)),
                ),
            )
            expiry_date = (now + timedelta(days=remaining_days)).strftime("%Y-%m-%d")

        cur.execute("""
            INSERT INTO inventory_snapshots (
                id, farm_id, product_id, current_quantity, current_stock_pct,
                estimated_daily_usage, lead_time_days, reorder_threshold_pct,
                lead_time_consumption_pct, expiry_date, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"inv-{index + 1:03d}",
            farm_id,
            product["id"],
            current_quantity,
            round(current_stock_pct, 1),
            estimated_daily_usage,
            lead_time_days,
            reorder_threshold_pct,
            lead_time_consumption_pct,
            expiry_date,
            now.isoformat(),
        ))
