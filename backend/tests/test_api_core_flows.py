"""Core CalSnap backend integration tests for auth, dashboard, CRUD, and AI endpoints."""

import base64
from datetime import datetime, timezone
from pathlib import Path

import pytest


TEST_PREFIX = "TEST_CalSnap_Agent"


def _food_image_b64() -> str:
    image_path = Path("/app/tests/assets/food_sample.jpg")
    raw = image_path.read_bytes()
    return base64.b64encode(raw).decode("utf-8")


def _meal_payload(title_suffix: str = "meal") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "meal_type": "Lunch",
        "title": f"{TEST_PREFIX}_{title_suffix}",
        "eaten_at": now,
        "source": "manual",
        "items": [
            {
                "name": "TEST_Chicken Breast",
                "portion": "120 g",
                "estimated_weight_g": 120,
                "calories": 198,
                "protein_g": 37,
                "carbs_g": 0,
                "fat_g": 4,
                "fiber_g": 0,
                "sugar_g": 0,
                "sodium_mg": 82,
                "confidence": 0.98,
            }
        ],
    }


class TestCalSnapCoreFlows:
    """Critical APIs requested in testing plan."""

    # Auth and profile basics
    def test_auth_me(self, api_client, base_url):
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "calsnap.test@emergent.local"
        assert isinstance(data["onboarding_complete"], bool)

    def test_profile_put_get(self, api_client, base_url):
        payload = {
            "gender": "female",
            "age": 29,
            "height_cm": 165,
            "weight_kg": 69,
            "activity_level": "moderate",
            "goal": "maintain",
            "target_weight_kg": 68,
        }
        put_response = api_client.put(f"{base_url}/api/profile", json=payload)
        assert put_response.status_code == 200
        created = put_response.json()
        assert created["gender"] == payload["gender"]
        assert created["goals"]["calories"] >= 1200

        get_response = api_client.get(f"{base_url}/api/profile")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["age"] == payload["age"]
        assert fetched["goal"] == payload["goal"]

    # Meal CRUD + history
    def test_meal_crud_with_persistence(self, api_client, base_url):
        create_payload = _meal_payload("crud_create")
        create_response = api_client.post(f"{base_url}/api/meals", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        meal_id = created["meal_id"]
        assert created["title"] == create_payload["title"]
        assert "_id" not in created

        history_response = api_client.get(f"{base_url}/api/history")
        assert history_response.status_code == 200
        history = history_response.json()
        target = next((x for x in history if x["meal_id"] == meal_id), None)
        assert target is not None
        assert target["title"] == create_payload["title"]

        update_payload = _meal_payload("crud_updated")
        update_payload["meal_type"] = "Dinner"
        update_response = api_client.put(f"{base_url}/api/meals/{meal_id}", json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["title"] == update_payload["title"]
        assert updated["meal_type"] == "Dinner"

        verify_after_update = api_client.get(f"{base_url}/api/history")
        assert verify_after_update.status_code == 200
        updated_target = next((x for x in verify_after_update.json() if x["meal_id"] == meal_id), None)
        assert updated_target is not None
        assert updated_target["title"] == update_payload["title"]

        delete_response = api_client.delete(f"{base_url}/api/meals/{meal_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["ok"] is True

        verify_delete = api_client.get(f"{base_url}/api/history")
        assert verify_delete.status_code == 200
        deleted_target = next((x for x in verify_delete.json() if x["meal_id"] == meal_id), None)
        assert deleted_target is None

    # Dashboard / water / report
    def test_dashboard_water_weekly_report(self, api_client, base_url):
        water_response = api_client.post(
            f"{base_url}/api/water", json={"amount_ml": 250, "logged_at": datetime.now(timezone.utc).isoformat()}
        )
        assert water_response.status_code == 200
        water_data = water_response.json()
        assert water_data["amount_ml"] == 250
        assert "_id" not in water_data

        dashboard_response = api_client.get(f"{base_url}/api/dashboard")
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        assert "goals" in dashboard
        assert "totals" in dashboard
        assert dashboard["water_ml"] >= 250

        report_response = api_client.get(f"{base_url}/api/reports/weekly")
        assert report_response.status_code == 200
        report = report_response.json()
        assert isinstance(report["series"], list)
        assert len(report["series"]) == 7

    # Barcode endpoint
    def test_barcode_open_food_facts(self, api_client, base_url):
        response = api_client.get(f"{base_url}/api/barcode/3017624010701")
        assert response.status_code == 200
        data = response.json()
        assert data["barcode"] == "3017624010701"
        assert "item" in data
        assert data["item"]["calories"] >= 0
        assert "_id" not in data

    # Coach endpoint
    def test_coach_clean_reply(self, api_client, base_url):
        response = api_client.post(
            f"{base_url}/api/coach", json={"message": "Give me one practical protein-focused dinner idea."}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("reply"), str)
        assert data["reply"].strip() != ""

    # Scan + save flow
    def test_scan_then_save_meal(self, api_client, base_url):
        image_base64 = _food_image_b64()
        scan_response = api_client.post(
            f"{base_url}/api/scan",
            json={"image_base64": image_base64, "mime_type": "image/jpeg", "mode": "meal"},
            timeout=90,
        )
        assert scan_response.status_code == 200
        scan_data = scan_response.json()
        assert isinstance(scan_data.get("foods"), list)
        assert len(scan_data["foods"]) >= 1
        assert 0 <= float(scan_data["confidence"]) <= 1
        assert "totals" in scan_data
        assert isinstance(scan_data.get("warnings"), list)

        save_payload = {
            "meal_type": "Lunch",
            "title": f"{TEST_PREFIX}_scan_save",
            "eaten_at": datetime.now(timezone.utc).isoformat(),
            "items": scan_data["foods"],
            "source": "camera",
            "image_base64": image_base64,
        }
        save_response = api_client.post(f"{base_url}/api/meals", json=save_payload)
        assert save_response.status_code == 200
        saved = save_response.json()
        assert saved["title"] == save_payload["title"]
        assert "_id" not in saved

        cleanup = api_client.delete(f"{base_url}/api/meals/{saved['meal_id']}")
        assert cleanup.status_code == 200

    # Weight / fasting / challenges
    def test_weight_fasting_challenges(self, api_client, base_url):
        add_weight = api_client.post(
            f"{base_url}/api/weight", json={"weight_kg": 68.4, "logged_at": datetime.now(timezone.utc).isoformat()}
        )
        assert add_weight.status_code == 200
        weight_data = add_weight.json()
        assert weight_data["weight_kg"] == 68.4

        list_weight = api_client.get(f"{base_url}/api/weight")
        assert list_weight.status_code == 200
        logs = list_weight.json()
        assert isinstance(logs, list)
        assert any(abs(float(x["weight_kg"]) - 68.4) < 0.001 for x in logs)

        fasting_put = api_client.put(
            f"{base_url}/api/fasting", json={"start_hour": 12, "end_hour": 20, "enabled": True}
        )
        assert fasting_put.status_code == 200
        fasting_get = api_client.get(f"{base_url}/api/fasting")
        assert fasting_get.status_code == 200
        fasting_data = fasting_get.json()
        assert fasting_data["enabled"] is True
        assert fasting_data["start_hour"] == 12

        join_challenge = api_client.post(f"{base_url}/api/challenges", json={"challenge_id": "healthy-7"})
        assert join_challenge.status_code == 200
        challenge_data = join_challenge.json()
        assert challenge_data["challenge_id"] == "healthy-7"

        list_challenges = api_client.get(f"{base_url}/api/challenges")
        assert list_challenges.status_code == 200
        challenge_list = list_challenges.json()
        assert any(x["challenge_id"] == "healthy-7" for x in challenge_list)
