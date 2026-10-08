import sys
import os
sys.path.append("C:/Users/dnyanesh/OneDrive/Desktop/GramMitra/backend")

from fastapi.testclient import TestClient
from app.main import app

# Override the auth dependency to bypass authentication for testing
from app.auth.dependencies import require_auth

def fake_require_auth():
    return {"uid": "test-user", "email": "test@example.com", "role": "farmer"}

# Patch the dependency
app.dependency_overrides[require_auth] = fake_require_auth

client = TestClient(app)

# Test cases
test_regions = ["Delhi", "Pune", "Akola", "", "NonexistentCity123"]

print("Testing weather route with TestClient (auth overridden):")
print("=" * 60)

for region in test_regions:
    print(f"\nTesting region: '{region}'")
    try:
        response = client.get(f"/api/v1/weather/weather-advisory?region={region}")
        print(f"Status: {response.status_code}")
        print(f"JSON: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
