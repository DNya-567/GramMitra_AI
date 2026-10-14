import sys
import os
# Set the ML_ARTIFACTS_DIR environment variable before importing the app
artifacts_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "artifacts")
os.environ["ML_ARTIFACTS_DIR"] = os.path.abspath(artifacts_dir)

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

# Test cases: we'll use known state, district, season from the data
# We'll pick one that we know exists from the earlier run: state="Andaman And Nicobar Islands", district="Nicobars", season="Autumn"
# We know from the district_crop_season.csv that there is data for this combination.

def test_local_crops_endpoint():
    print("Testing local crops endpoint...")
    response = client.get("/api/v1/crops/local", params={"state": "Andaman And Nicobar Islands", "district": "Nicobars", "season": "Autumn"})
    print(f"Status: {response.status_code}")
    print(f"JSON: {response.json()}")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    data = response.json()
    assert "crops" in data, "Response missing 'crops' key"
    crops = data["crops"]
    assert isinstance(crops, list), "'crops' should be a list"
    # We expect at least one crop
    assert len(crops) > 0, "Expected at least one crop in the response"
    # Check the structure of the first crop
    first = crops[0]
    assert "crop_name" in first, "Missing crop_name"
    assert "area_share_in_season" in first, "Missing area_share_in_season"
    assert "mean_area_5y" in first, "Missing mean_area_5y"
    assert "mean_yield_5y" in first, "Missing mean_yield_5y"
    print("Test passed.")

if __name__ == '__main__':
    test_local_crops_endpoint()