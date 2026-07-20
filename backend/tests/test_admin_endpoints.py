import pytest
from fastapi.testclient import TestClient
from server import app


client = TestClient(app)
DEFAULT_PIN = "calsnap2026"


def test_admin_config_unauthorized():
    response = client.get("/api/admin/config")
    assert response.status_code == 401
    assert "Invalid Admin PIN" in response.json()["detail"]


def test_admin_config_get_and_update():
    # 1. Get current config with default PIN
    response = client.get(
        "/api/admin/config",
        headers={"X-Admin-Pin": DEFAULT_PIN},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["active_provider"] in ("openrouter", "gemini")
    assert "calsnap2026" not in data.get("admin_pin", "")  # Should not expose raw PIN in public model

    # 2. Update provider to gemini
    update_payload = {
        "active_provider": "gemini",
        "gemini_model": "gemini-2.5-flash",
        "temperature": 0.4,
    }
    update_resp = client.put(
        "/api/admin/config",
        headers={"X-Admin-Pin": DEFAULT_PIN},
        json=update_payload,
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["active_provider"] == "gemini"
    assert updated_data["gemini_model"] == "gemini-2.5-flash"
    assert updated_data["temperature"] == 0.4


def test_admin_stats_and_logs():
    stats_resp = client.get(
        "/api/admin/stats",
        headers={"X-Admin-Pin": DEFAULT_PIN},
    )
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "active_provider" in stats
    assert "total_scans" in stats
    assert "recent_logs" in stats

    logs_resp = client.get(
        "/api/admin/logs?limit=10",
        headers={"X-Admin-Pin": DEFAULT_PIN},
    )
    assert logs_resp.status_code == 200
    assert "logs" in logs_resp.json()


def test_admin_models():
    models_resp = client.get(
        "/api/admin/models",
        headers={"X-Admin-Pin": DEFAULT_PIN},
    )
    assert models_resp.status_code == 200
    models_data = models_resp.json()
    assert "openrouter_free_models" in models_data
    assert "gemini_studio_models" in models_data
    assert len(models_data["openrouter_free_models"]) > 0
    assert len(models_data["gemini_studio_models"]) > 0
