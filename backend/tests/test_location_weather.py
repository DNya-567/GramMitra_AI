import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app

# Override the auth dependency to bypass authentication for testing
from app.auth.dependencies import require_auth

def fake_require_auth():
    return {"uid": "test-user", "email": "test@example.com", "role": "farmer"}

# Patch the dependency
app.dependency_overrides[require_auth] = fake_require_auth

client = TestClient(app)

# Test weather endpoint with lat/lon for Delhi (approx: 28.6139, 77.2090)
# And Pune (approx: 18.5204, 73.8567)
test_cases = [
    {"lat": 28.6139, "lon": 77.2090, "name": "Delhi"},
    {"lat": 18.5204, "lon": 73.8567, "name": "Pune"},
    {"lat": 12.9716, "lon": 77.5946, "name": "Bangalore"},
    {"region": "Delhi", "name": "Delhi by region"},
    {"region": "Pune", "name": "Pune by region"}
]

print("Testing weather endpoint with location parameters:")
print("=" * 60)

for case in test_cases:
    name = case.pop("name")
    print(f"\nTesting {name}:")
    try:
        # Build query string
        params = []
        if "lat" in case:
            params.append(f"lat={case['lat']}")
        if "lon" in case:
            params.append(f"lon={case['lon']}")
        if "region" in case:
            params.append(f"region={case['region']}")

        query_string = "&".join(params)
        url = f"/api/v1/weather/weather-advisory?{query_string}" if query_string else "/api/v1/weather/weather-advisory"

        response = client.get(url)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Region/Place: {data.get('place_name') or data.get('region', 'N/A')}")
            print(f"  Coordinates: Lat={data.get('latitude')}, Lon={data.get('longitude')}")
            print(f"  Forecast days: {len(data.get('forecast', []))}")
            print(f"  Best spray window slots: {len(data.get('best_spray_window', []))}")

            # Show sample forecast day
            forecast = data.get('forecast', [])
            if forecast:
                day0 = forecast[0]
                print(f"  Sample forecast:")
                print(f"    Date: {day0.get('date')}")
                print(f"    Temp: {day0.get('min_temp')}°/{day0.get('max_temp')}°C")
                print(f"    Rain: {day0.get('rain_probability')}% ({day0.get('rain_mm')} mm)")
                print(f"    Wind: {day0.get('wind_max')} km/h max")
                print(f"    ET0: {day0.get('et0')} mm/day")
                print(f"    UV Index: {day0.get('uv_index')}")
        else:
            print(f"  Error: {response.json()}")
    except Exception as e:
        print(f"  Exception: {e}")

# Clear overrides
app.dependency_overrides.clear()

print("\n" + "=" * 60)
print("Location-based weather test completed.")