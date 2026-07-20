"""DEV-ONLY: Temporary email/password login for development & testing.

REMOVE THIS ENTIRE FILE BEFORE PRODUCTION — see the
"Temporary Development Login" section in replit.md for the removal checklist.

The endpoints below are hard-disabled in Replit production deployments
(where the REPLIT_DEPLOYMENT env var is set), so even if this file is
accidentally left in, production only supports Google Sign-In.
"""

import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import UserPublic

# Enabled only in the development workspace, never in a deployment.
DEV_LOGIN_ENABLED = os.getenv("REPLIT_DEPLOYMENT") is None

# Test account for development/testing only (documented in replit.md).
_DEV_EMAIL = "test@example.com"
_DEV_PASSWORD = "Test@123456"
_DEV_NAME = "Test User (Dev)"

dev_auth_router = APIRouter(prefix="/api/auth/dev", tags=["dev-only"])


async def purge_dev_artifacts(db) -> None:
    """Defense-in-depth: called on production startup (REPLIT_DEPLOYMENT set)
    to remove the dev test user and any dev-minted sessions, in case the
    session store is shared between development and production."""
    await db.user_sessions.delete_many(
        {"session_token": {"$regex": "^devsess_"}}
    )
    dev_user = await db.users.find_one({"email": _DEV_EMAIL}, {"_id": 0})
    if dev_user:
        await db.user_sessions.delete_many({"user_id": dev_user["user_id"]})
        await db.users.delete_one({"email": _DEV_EMAIL})


class DevLoginRequest(BaseModel):
    email: str
    password: str


@dev_auth_router.get("/status")
async def dev_login_status():
    """Lets the frontend decide whether to show the dev login UI."""
    return {"enabled": DEV_LOGIN_ENABLED}


@dev_auth_router.post("/login")
async def dev_login(payload: DevLoginRequest):
    from server import db  # deferred to avoid circular import (same as auth.py)

    if not DEV_LOGIN_ENABLED:
        raise HTTPException(status_code=404, detail="Not found")

    email_ok = hmac.compare_digest(
        payload.email.strip().lower(), _DEV_EMAIL
    )
    password_ok = hmac.compare_digest(payload.password, _DEV_PASSWORD)

    if not (email_ok and password_ok):
        raise HTTPException(
            status_code=401,
            detail="Invalid development credentials",
        )

    # Mirror auth.exchange_session exactly so sessions, onboarding and
    # logout behave identically to the Google flow.
    existing = await db.users.find_one({"email": _DEV_EMAIL}, {"_id": 0})

    user_id = (
        existing["user_id"] if existing else f"user_{uuid4().hex[:12]}"
    )

    user_doc = {
        "user_id": user_id,
        "email": _DEV_EMAIL,
        "name": _DEV_NAME,
        "picture": None,
        "onboarding_complete": bool(
            existing and existing.get("onboarding_complete")
        ),
    }

    await db.users.update_one(
        {"email": _DEV_EMAIL},
        {"$set": user_doc},
        upsert=True,
    )

    token = f"devsess_{secrets.token_urlsafe(32)}"
    now = datetime.now(timezone.utc)

    await db.user_sessions.update_one(
        {"session_token": token},
        {
            "$set": {
                "session_token": token,
                "user_id": user_id,
                "created_at": now,
                "expires_at": now + timedelta(days=7),
            }
        },
        upsert=True,
    )

    return {
        "user": UserPublic(**user_doc).model_dump(),
        "session_token": token,
    }
