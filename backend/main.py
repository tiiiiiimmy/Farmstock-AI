"""
FarmStock AI - FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - optional local dev dependency
    def load_dotenv(*_args, **_kwargs):
        return False

load_dotenv()

from .database import ensure_db_ready
from .routers import farms, orders, products, predictions, recommendations, alerts, place_order, spending, chat
from .routers import auth as auth_router_module
from .routers import billing as billing_router_module
from .whatsapp import webhook
from .telegram import webhook as telegram_webhook

app = FastAPI(title="FarmStock AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://farmstock.timmi.online"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    ensure_db_ready()
    from backend.scheduler import start_scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    from backend.scheduler import stop_scheduler
    stop_scheduler()


app.include_router(auth_router_module.router)
app.include_router(farms.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(place_order.router, prefix="/api")
app.include_router(spending.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(webhook.router, prefix="/api")
app.include_router(telegram_webhook.router, prefix="/api")
app.include_router(billing_router_module.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "FarmStock AI"}
