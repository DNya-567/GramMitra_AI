import os
import requests

MANDI_API_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"


def get_price(commodity: str, state: str = None, district: str = None, limit: int = 20) -> dict:
    """
    Fetches modal/min/max mandi prices for a commodity from the
    data.gov.in Agmarknet dataset. Get your own free API key at
    data.gov.in before the demo -- the public sample key is capped
    at 10 records per request.
    """
    params = {
        "api-key": os.getenv("MANDI_API_KEY"),
        "format": "json",
        "limit": limit,
        "filters[commodity]": commodity,
    }
    if state:
        params["filters[state]"] = state
    if district:
        params["filters[district]"] = district

    response = requests.get(MANDI_API_URL, params=params, timeout=10)
    response.raise_for_status()
    return response.json()
