import os
import requests

WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"


def get_advisory(region: str) -> dict:
    # TODO: geocode region -> lat/lon, call WEATHER_API_URL with
    # WEATHER_API_KEY, then translate the raw forecast into one short
    # actionable tip (e.g. "rain expected, delay spraying").
    return {"region": region, "conditions": None, "advisory_tip": None}
