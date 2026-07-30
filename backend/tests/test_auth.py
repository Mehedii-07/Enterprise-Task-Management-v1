def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"


def test_ceo_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "ceo@enterprise.com",
        "password": "CeoSuperAdmin123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_invalid_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "ceo@enterprise.com",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401
