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
    print(f"Status: {response.status_code}")
    print(f"Body: {response.json()}")
    assert response.status_code == 422

if __name__ == "__main__":
    test_negative()
    print("Test passed")