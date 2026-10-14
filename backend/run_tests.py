from fastapi.testclient import TestClient
from app.main import app
from app.auth.dependencies import require_auth

def override_require_auth():
    return {"id": 1, "email": "test@example.com"}

app.dependency_overrides[require_auth] = override_require_auth

client = TestClient(app)

def test_negative():
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
    assert response.status_code == 422
    data = response.json()
    assert any("nitrogen" in str(err).lower() for err in data["detail"])
    print("PASS: negative nitrogen")

def test_above_max():
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
    print("PASS: nitrogen above max")

def test_empty_input():
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
    print("PASS: empty nitrogen")

def test_valid():
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
    if data["confidence"] >= 0.5:
        assert data["low_confidence"] == False
    else:
        assert data["low_confidence"] == True
    probs = [item["probability"] for item in data["top3"]]
    assert probs == sorted(probs, reverse=True)
    print("PASS: valid input")

if __name__ == "__main__":
    try:
        test_negative()
        test_above_max()
        test_empty_input()
        test_valid()
        print("All tests passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        raise