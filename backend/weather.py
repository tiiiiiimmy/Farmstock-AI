"""
Open-Meteo API integration for weather-based farm alerts.
Free API, no key required.
"""
import httpx
from typing import Optional

# NZ region coordinates (approximate farm centroids)
REGION_COORDS = {
    "Canterbury": (-43.5, 172.0),
    "Waikato": (-37.8, 175.3),
    "Southland": (-45.9, 168.4),
    "Hawke's Bay": (-39.5, 176.9),
    "Otago": (-45.2, 169.3),
    "Manawatu": (-40.3, 175.6),
    "Marlborough": (-41.5, 173.9),
    "Bay of Plenty": (-38.1, 176.2),
    "Northland": (-35.7, 174.3),
    "Wellington": (-41.3, 174.8),
}
DEFAULT_COORDS = (-43.5, 172.0)  # Canterbury


async def get_forecast(region: str) -> Optional[dict]:
    """Fetch 7-day weather forecast for a NZ region."""
    lat, lon = REGION_COORDS.get(region, DEFAULT_COORDS)
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max"
        f"&forecast_days=7&timezone=Pacific%2FAuckland"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.is_success:
                return resp.json()
    except Exception as e:
        print(f"[Weather] Failed to fetch forecast for {region}: {e}")
    return None


def _analyse_forecast(forecast: dict) -> list:
    """Returns list of weather alerts from a 7-day forecast."""
    alerts = []
    if not forecast or "daily" not in forecast:
        return alerts

    daily = forecast["daily"]
    for i, day in enumerate(daily.get("time", [])):
        temp_min = daily["temperature_2m_min"][i]
        temp_max = daily["temperature_2m_max"][i]
        rain = daily["precipitation_sum"][i] or 0
        wind = daily["windspeed_10m_max"][i] or 0

        if temp_min is not None and temp_min < -2:
            alerts.append({
                "date": day, "type": "cold_snap",
                "message": f"Cold snap forecast {day}: minimum {temp_min:.0f}°C. Feed consumption may increase 30-40%.",
                "severity": "high" if temp_min < -5 else "medium",
            })
        if rain > 50:
            alerts.append({
                "date": day, "type": "heavy_rain",
                "message": f"Heavy rain forecast {day}: {rain:.0f}mm. Postpone fertiliser application.",
                "severity": "medium",
            })
        if wind > 80:
            alerts.append({
                "date": day, "type": "high_wind",
                "message": f"High winds forecast {day}: {wind:.0f}km/h. Secure storage covers.",
                "severity": "medium",
            })

    return alerts


async def get_farm_weather_alerts(region: str) -> list:
    """Returns actionable weather alerts for a farm's region."""
    forecast = await get_forecast(region)
    return _analyse_forecast(forecast)
