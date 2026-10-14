from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import require_auth

# Override the authentication dependency for testing
def override_require_auth():
    return {"id": 1, "email": "test@example.com"}

app.dependency_overrides[require_auth] = override_require_auth

client = TestClient(app)

def test_crop_recommendation_negative_values():
    print("Running test_crop_recommendation_negative_values")
    response = client.post(
        "/api/v1/crop/recommend",
        json={
            "nitrogen": -1,
            "phosphorus": 10,
            "potassium": 10,
            "temperature": 10,
            "humidity": 10,
            "ph": 7,
            "rainfall_mm": 100,
        },
    )
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.json()}")
    assert response.status_code == 422
    # Check that the error mentions nitrogen
    data = response.json()
    assert any("nitrogen" in str(err).lower() for err in data["detail"])

def test_crop_recommendation_above_maximum():
    response = client.post(
        "/api/v1/crop/recommend",
        json={
            "nitrogen": 151,
            "phosphorus": 10,
            "potassium": 10,
            "temperature": 10,
            "humidity": 10,
            "ph": 7,
            "rainfall_mm": 100,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert any("nitrogen" in str(err).lower() for err in data["detail"])

def test_crop_recommendation_empty_input():
    # We'll test by sending empty strings? Actually the endpoint expects numbers.
    # Sending empty string will cause a validation error because it cannot be converted to float.
    response = client.post(
        "/api/v1/crop/recommend",
        json={
            "nitrogen": "",
            "phosphorus": 10,
            "potassium": 10,
            "temperature": 10,
            "humidity": 10,
            "ph": 7,
            "rainfall_mm": 100,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert any("nitrogen" in str(err).lower() for err in data["detail"])

def test_crop_recommendation_valid_example():
    # Use a known valid input; we don't know the exact output but we can check structure.
    response = client.post(
        "/api/v1/crop/recommend",
        json={
            "nitrogen": 50,
            "phosphorus": 50,
            "potassium": 50,
            "temperature": 25,
            "humidity": 80,
            "ph": 6.5,
            "rainfall_mm": 100,
        },
    )
    assert response.status_code == 200
    data = response.json()
    # Check that the response has the expected fields
    assert "recommended_crop" in data
    assert isinstance(data["recommended_crop"], str)
    assert "confidence" in data
    assert isinstance(data["confidence"], float)
    assert 0 <= data["confidence"] <= 1
    assert "top3" in data
    assert isinstance(data["top3"], list)
    assert len(data["top3"]) == 3
    for item in data["top3"]:
        assert "crop" in item
        assert "probability" in item
        assert isinstance(item["crop"], str)
        assert isinstance(item["probability"], float)
        assert 0 <= item["probability"] <= 1
    assert "low_confidence" in data
    assert isinstance(data["low_confidence"], bool)
    # If confidence >= 0.5, low_confidence should be False; else True.
    # We don't know the exact confidence, but we can check the logic.
    if data["confidence"] >= 0.5:
        assert data["low_confidence"] == False
    else:
        assert data["low_confidence"] == True
    # Also check that top3 is sorted descending by probability
    probs = [item["probability"] for item in data["top3"]]
    assert probs == sorted(probs, reverse=True)