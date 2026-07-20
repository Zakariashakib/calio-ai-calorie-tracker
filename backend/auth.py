import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
from fastapi import Header, HTTPException, Query

from models import UserPublic


SESSION_DATA_URL = os.getenv(
    "AUTH_SESSION_DATA_URL",
    (
        "https://demobackend.emergentagent.com/"
        "auth/v1/env/oauth/session-data"
    ),
)


async def exchange_session(
    db,
    session_id: str,
) -> tuple[UserPublic, str]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            SESSION_DATA_URL,
            headers={"X-Session-ID": session_id},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Google sign-in could not be verified",
        )

    data = response.json()
    email = data.get("email")
    token = data.get("session_token")

    if not email or not token:
        raise HTTPException(
            status_code=401,
            detail="Incomplete sign-in response",
        )

    existing = await db.users.find_one(
        {"email": email},
        {"_id": 0},
    )

    user_id = (
        existing["user_id"]
        if existing
        else f"user_{uuid4().hex[:12]}"
    )

    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": data.get("name") or email.split("@")[0],
        "picture": data.get("picture"),
        "onboarding_complete": bool(
            existing and existing.get("onboarding_complete")
        ),
    }

    await db.users.update_one(
        {"email": email},
        {"$set": user_doc},
        upsert=True,
    )

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

    return UserPublic(**user_doc), token


async def require_user(
    authorization: str | None = Header(default=None),
) -> UserPublic:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    token = authorization.removeprefix("Bearer ").strip()
    return await _user_from_token(token)


async def require_user_flexible(
    authorization: str | None = Header(default=None),
    token: str | None = Query(default=None),
) -> UserPublic:
    """Auth via Bearer header or `?token=` query param.

    The query-param form exists for <img>/Image tags, which cannot send
    custom headers; only use it on media endpoints.
    """
    if authorization and authorization.startswith("Bearer "):
        return await _user_from_token(
            authorization.removeprefix("Bearer ").strip()
        )
    if token:
        return await _user_from_token(token.strip())
    raise HTTPException(
        status_code=401,
        detail="Authentication required",
    )


async def _user_from_token(token: str) -> UserPublic:
    from server import db

    # DEV-ONLY guard: sessions minted by the temporary dev login are never
    # valid in production deployments, even if the session store is shared.
    # Remove together with backend/dev_auth.py (see replit.md checklist).
    if token.startswith("devsess_") and os.getenv("REPLIT_DEPLOYMENT") is not None:
        raise HTTPException(status_code=401, detail="Session expired")

    session = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0},
    )

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Session expired",
        )

    expires_at = session.get("expires_at")

    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if (
        not expires_at
        or expires_at <= datetime.now(timezone.utc)
    ):
        await db.user_sessions.delete_one(
            {"session_token": token}
        )
        raise HTTPException(
            status_code=401,
            detail="Session expired",
        )

    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0},
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return UserPublic(**user)
