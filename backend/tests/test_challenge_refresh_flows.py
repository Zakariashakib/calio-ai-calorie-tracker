"""
End-to-end tests for the scan → save → challenge and voice → save → challenge flows.

These tests use FastAPI's TestClient (in-process, mongomock DB) so they run without
a live server or real MongoDB.  AI calls (analyze_food, transcribe_and_parse) are
patched to avoid external network calls.
"""

import io
import struct
import wave
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Import the app and the module-level `db` reference so we can seed data.
import server
from server import app, db

# ── Helpers ──────────────────────────────────────────────────────────────────

TEST_USER_ID  = "test_challenge_flow_uid"
TEST_EMAIL    = "challenge.test@emergent.local"
TEST_TOKEN    = "challenge-test-token-2026"

MEAL_ITEM = {
    "name": "TEST_Rice",
    "portion": "150 g",
    "estimated_weight_g": 150,
    "calories": 195,
    "protein_g": 4,
    "carbs_g": 43,
    "fat_g": 0.4,
    "fiber_g": 0.6,
    "sugar_g": 0,
    "sodium_mg": 5,
    "confidence": 0.95,
}

SCAN_RETURN = {
    "foods": [MEAL_ITEM],
    "totals": {
        "calories": 195, "protein_g": 4, "carbs_g": 43,
        "fat_g": 0.4, "fiber_g": 0.6, "sugar_g": 0, "sodium_mg": 5,
    },
    "confidence": 0.95,
    "warnings": [],
    "description": "White rice",
}

VOICE_RETURN = {
    "title": "Rice and vegetables",
    "meal_type": "Lunch",
    "transcript": "I had rice and some veggies",
    "items": [MEAL_ITEM],
}


def _authed_headers() -> dict:
    return {"Authorization": f"Bearer {TEST_TOKEN}"}


def _meal_payload(title: str) -> dict:
    return {
        "meal_type": "Lunch",
        "title": title,
        "eaten_at": datetime.now(timezone.utc).isoformat(),
        "source": "camera",
        "items": [MEAL_ITEM],
    }


def _make_wav_bytes() -> bytes:
    """Return a minimal valid WAV file (1 second of silence at 16 kHz mono)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(struct.pack("<" + "16000h", *([0] * 16000)))
    return buf.getvalue()


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def seed_test_user():
    """Seed a test user + session directly into the mongomock DB."""
    import asyncio

    async def _seed():
        await db.users.update_one(
            {"user_id": TEST_USER_ID},
            {
                "$set": {
                    "user_id": TEST_USER_ID,
                    "email": TEST_EMAIL,
                    "name": "Challenge Flow Tester",
                    "picture": None,
                    "onboarding_complete": True,
                }
            },
            upsert=True,
        )
        await db.user_sessions.update_one(
            {"session_token": TEST_TOKEN},
            {
                "$set": {
                    "session_token": TEST_TOKEN,
                    "user_id": TEST_USER_ID,
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                }
            },
            upsert=True,
        )

    asyncio.get_event_loop().run_until_complete(_seed())
    yield

    # Teardown: wipe test-user data so other test runs start clean.
    async def _teardown():
        await db.users.delete_many({"user_id": TEST_USER_ID})
        await db.user_sessions.delete_many({"session_token": TEST_TOKEN})
        await db.meals.delete_many({"user_id": TEST_USER_ID})
        await db.challenges.delete_many({"user_id": TEST_USER_ID})
        await db.water_logs.delete_many({"user_id": TEST_USER_ID})

    asyncio.get_event_loop().run_until_complete(_teardown())


@pytest.fixture(autouse=True)
def reset_challenges():
    """Clear joined challenges before each test to keep state isolated."""
    import asyncio

    async def _clear():
        await db.challenges.delete_many({"user_id": TEST_USER_ID})
        await db.meals.delete_many({"user_id": TEST_USER_ID})
        await db.water_logs.delete_many({"user_id": TEST_USER_ID})

    asyncio.get_event_loop().run_until_complete(_clear())
    yield


# ── Test client ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestChallengeRefreshFlows:
    """Confirm that challenge progress refreshes correctly through each logging path."""

    # 1. POST /scan → POST /meals → GET /challenges ───────────────────────────

    def test_scan_save_updates_challenge_streak(self, client):
        """After AI scan + meal save, GET /challenges must reflect today's progress."""
        hdrs = _authed_headers()

        # Join a challenge
        join = client.post("/api/challenges", json={"challenge_id": "healthy-7"}, headers=hdrs)
        assert join.status_code == 200, join.text

        # Patch analyze_food so no real network call is made
        from models import ScanResponse, Nutrients, MealItem
        mock_scan_result = ScanResponse(
            scan_id="test-scan-001",
            meal_name="White Rice",
            total_weight_g=150.0,
            foods=[MealItem(**MEAL_ITEM)],
            totals=Nutrients(
                calories=195, protein_g=4, carbs_g=43,
                fat_g=0.4, fiber_g=0.6, sugar_g=0, sodium_mg=5,
            ),
            confidence=0.95,
            warnings=[],
            guidance="Looks like a healthy meal.",
        )
        # image_base64 must be ≥ 100 chars per model validation
        fake_b64 = "A" * 120
        with patch("server.analyze_food", new=AsyncMock(return_value=mock_scan_result)):
            scan = client.post(
                "/api/scan",
                json={"image_base64": fake_b64, "mime_type": "image/jpeg", "mode": "meal"},
                headers=hdrs,
            )
        assert scan.status_code == 200, scan.text
        scan_data = scan.json()
        assert len(scan_data["foods"]) >= 1

        # Save scanned meal
        save = client.post(
            "/api/meals",
            json=_meal_payload("test_scan_challenge"),
            headers=hdrs,
        )
        assert save.status_code == 200, save.text
        meal_id = save.json()["meal_id"]

        # Challenge progress must reflect the saved meal
        challenges = client.get("/api/challenges", headers=hdrs)
        assert challenges.status_code == 200, challenges.text
        clist = challenges.json()
        healthy7 = next((c for c in clist if c["challenge_id"] == "healthy-7"), None)
        assert healthy7 is not None, "healthy-7 missing from challenge list"
        assert healthy7["progress"] >= 1, (
            f"Expected progress ≥ 1 after meal save, got {healthy7['progress']}"
        )
        assert healthy7["streak"] >= 1, (
            f"Expected streak ≥ 1 after meal save today, got {healthy7['streak']}"
        )

        # Cleanup
        client.delete(f"/api/meals/{meal_id}", headers=hdrs)

    # 2. POST /voice/parse → POST /meals → GET /challenges ────────────────────

    def test_voice_save_updates_challenge_streak(self, client):
        """After voice parse + meal save, GET /challenges must reflect today's progress."""
        hdrs = _authed_headers()

        # Join the healthy-7 challenge
        join = client.post("/api/challenges", json={"challenge_id": "healthy-7"}, headers=hdrs)
        assert join.status_code == 200, join.text

        # Patch transcribe_and_parse to avoid real audio/AI calls
        with patch("server.transcribe_and_parse", new=AsyncMock(return_value=VOICE_RETURN)):
            voice = client.post(
                "/api/voice/parse",
                files={"file": ("meal.wav", _make_wav_bytes(), "audio/wav")},
                headers=hdrs,
            )
        assert voice.status_code == 200, (
            f"Voice parse returned {voice.status_code}: {voice.text[:300]}"
        )
        voice_data = voice.json()
        assert "items" in voice_data, "Voice response must contain items"

        # Save the voice-logged meal
        save = client.post(
            "/api/meals",
            json={
                "meal_type": voice_data.get("meal_type", "Lunch"),
                "title": "test_voice_challenge",
                "eaten_at": datetime.now(timezone.utc).isoformat(),
                "source": "voice",
                "items": voice_data["items"],
            },
            headers=hdrs,
        )
        assert save.status_code == 200, save.text
        meal_id = save.json()["meal_id"]

        # Challenge progress must be updated after voice → save
        challenges = client.get("/api/challenges", headers=hdrs)
        assert challenges.status_code == 200, challenges.text
        clist = challenges.json()
        healthy7 = next((c for c in clist if c["challenge_id"] == "healthy-7"), None)
        assert healthy7 is not None, "healthy-7 missing after voice+save"
        assert healthy7["progress"] >= 1, (
            f"Expected progress ≥ 1 after voice meal save, got {healthy7['progress']}"
        )
        assert healthy7["streak"] >= 1, (
            f"Expected streak ≥ 1 after voice meal save today, got {healthy7['streak']}"
        )

        # Cleanup
        client.delete(f"/api/meals/{meal_id}", headers=hdrs)

    # 3. No-AI fallback: POST /meals directly still updates challenges ─────────

    def test_manual_meal_save_updates_challenge_no_ai_key(self, client):
        """POST /meals without any prior AI call must still refresh challenge progress.

        This is the fallback path: when EMERGENT_LLM_KEY is absent (or scan fails),
        the user logs meals manually — the challenge streak must still advance, and
        the meal save must not error out due to challenge refresh issues.
        """
        hdrs = _authed_headers()

        # Join both challenges so we can verify both get refreshed
        for cid in ("healthy-7", "water-14"):
            r = client.post("/api/challenges", json={"challenge_id": cid}, headers=hdrs)
            assert r.status_code == 200, r.text

        # Simulate missing AI key: patch refresh_all_challenges to throw, then confirm
        # the meal save still succeeds (the try/except in create_meal absorbs it).
        from nutrition import refresh_all_challenges as real_refresh

        call_log = []

        async def tracking_refresh(db, user_id):
            call_log.append(user_id)
            await real_refresh(db, user_id)

        with patch("server.refresh_all_challenges", new=tracking_refresh):
            save = client.post(
                "/api/meals",
                json={
                    "meal_type": "Breakfast",
                    "title": "test_manual_no_ai",
                    "eaten_at": datetime.now(timezone.utc).isoformat(),
                    "source": "manual",
                    "items": [MEAL_ITEM],
                },
                headers=hdrs,
            )
        assert save.status_code == 200, (
            f"Manual meal save failed: {save.status_code} {save.text[:200]}"
        )
        meal_id = save.json()["meal_id"]

        # refresh_all_challenges must have been called
        assert call_log, "refresh_all_challenges was never called during meal save"

        # Challenge progress must reflect the saved meal
        challenges = client.get("/api/challenges", headers=hdrs)
        assert challenges.status_code == 200, challenges.text
        clist = challenges.json()

        healthy7 = next((c for c in clist if c["challenge_id"] == "healthy-7"), None)
        assert healthy7 is not None, "healthy-7 missing after manual save"
        assert healthy7["progress"] >= 1, (
            f"healthy-7 progress should be ≥ 1 after manual meal, got {healthy7['progress']}"
        )

        # 4b. Verify that even if refresh_all_challenges raises, the meal save still returns 200
        async def failing_refresh(db, user_id):
            raise RuntimeError("Simulated challenge DB failure (e.g. no AI key path)")

        with patch("server.refresh_all_challenges", new=failing_refresh):
            save2 = client.post(
                "/api/meals",
                json={
                    "meal_type": "Dinner",
                    "title": "test_manual_no_ai_error_path",
                    "eaten_at": datetime.now(timezone.utc).isoformat(),
                    "source": "manual",
                    "items": [MEAL_ITEM],
                },
                headers=hdrs,
            )
        assert save2.status_code == 200, (
            "Meal save must succeed even when challenge refresh throws "
            f"(got {save2.status_code}: {save2.text[:200]})"
        )
        meal_id2 = save2.json()["meal_id"]

        # Cleanup
        client.delete(f"/api/meals/{meal_id}", headers=hdrs)
        client.delete(f"/api/meals/{meal_id2}", headers=hdrs)
