import json
import logging
import os
import re
import time
import base64
from pathlib import Path
import tempfile
from typing import Optional, Tuple
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile

from emergentintegrations.llm.chat import (
    ImageContent,
    LlmChat,
    StreamDone,
    TextDelta,
    UserMessage,
)
from emergentintegrations.llm.openai.speech_to_text import (
    OpenAISpeechToText,
)
from models import (
    AIConfigPublic,
    AIConfigSchema,
    AIConfigUpdate,
    AILogEntry,
    AITestResponse,
    MealItem,
    Nutrients,
    ScanResponse,
    now_iso,
)

logger = logging.getLogger(__name__)

# Global database connection reference injected by server.py
_GLOBAL_DB = None
_CONFIG_CACHE: Optional[Tuple[float, AIConfigSchema]] = None
CACHE_TTL_SECONDS = 5.0


def set_ai_db(db):
    global _GLOBAL_DB
    _GLOBAL_DB = db


def _mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return "Not Configured" if not key else "••••"
    return f"{key[:6]}••••••••{key[-4:]}"


async def get_active_ai_config() -> AIConfigSchema:
    global _CONFIG_CACHE
    now = time.time()
    if _CONFIG_CACHE and (now - _CONFIG_CACHE[0]) < CACHE_TTL_SECONDS:
        return _CONFIG_CACHE[1]

    default_config = AIConfigSchema(
        active_provider="gemini",
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        openrouter_model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free"),
        gemini_api_key=os.getenv("GEMINI_API_KEY", os.getenv("EMERGENT_LLM_KEY", "")),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    )

    if _GLOBAL_DB is not None:
        try:
            doc = await _GLOBAL_DB["ai_config"].find_one({"_id": "settings"})
            if doc:
                # Merge DB settings with default environment
                doc.pop("_id", None)
                for k, v in doc.items():
                    if hasattr(default_config, k) and v is not None:
                        setattr(default_config, k, v)
        except Exception as exc:
            logger.warning(f"Failed to fetch ai_config from DB: {exc}")

    _CONFIG_CACHE = (now, default_config)
    return default_config


async def get_public_ai_config() -> AIConfigPublic:
    cfg = await get_active_ai_config()
    return AIConfigPublic(
        active_provider=cfg.active_provider,
        openrouter_api_key_masked=_mask_key(cfg.openrouter_api_key),
        openrouter_model=cfg.openrouter_model,
        gemini_api_key_masked=_mask_key(cfg.gemini_api_key),
        gemini_model=cfg.gemini_model,
        system_prompt=cfg.system_prompt,
        temperature=cfg.temperature,
        auto_fallback=cfg.auto_fallback,
    )


async def save_ai_config(update: AIConfigUpdate) -> AIConfigSchema:
    global _CONFIG_CACHE
    current = await get_active_ai_config()
    update_data = update.model_dump(exclude_unset=True)
    
    # If admin didn't change a masked key or passed blank, keep old
    if "openrouter_api_key" in update_data and (
        update_data["openrouter_api_key"] == "" or "••••" in update_data["openrouter_api_key"]
    ):
        update_data.pop("openrouter_api_key")
    if "gemini_api_key" in update_data and (
        update_data["gemini_api_key"] == "" or "••••" in update_data["gemini_api_key"]
    ):
        update_data.pop("gemini_api_key")
    if "admin_pin" in update_data and (
        update_data["admin_pin"] == "" or "••••" in update_data["admin_pin"]
    ):
        update_data.pop("admin_pin")

    for k, v in update_data.items():
        if hasattr(current, k) and v is not None:
            setattr(current, k, v)

    if _GLOBAL_DB is not None:
        doc = current.model_dump()
        doc["_id"] = "settings"
        await _GLOBAL_DB["ai_config"].replace_one({"_id": "settings"}, doc, upsert=True)

    _CONFIG_CACHE = (time.time(), current)
    return current


async def log_ai_execution(
    provider: str,
    model: str,
    endpoint: str,
    latency_ms: float,
    status: str,
    error_detail: Optional[str] = None,
):
    if _GLOBAL_DB is None:
        return
    try:
        entry = AILogEntry(
            provider=provider,
            model=model,
            endpoint=endpoint,
            latency_ms=round(latency_ms, 2),
            status=status,
            error_detail=error_detail,
        )
        await _GLOBAL_DB["ai_logs"].insert_one(entry.model_dump())
        # Prune old logs keeping latest 200
        count = await _GLOBAL_DB["ai_logs"].count_documents({})
        if count > 200:
            oldest = await _GLOBAL_DB["ai_logs"].find().sort("timestamp", 1).limit(count - 200).to_list(length=None)
            if oldest:
                ids = [doc["_id"] for doc in oldest]
                await _GLOBAL_DB["ai_logs"].delete_many({"_id": {"$in": ids}})
    except Exception as exc:
        logger.warning(f"Failed to log AI execution: {exc}")


async def _complete_openrouter(
    prompt: str,
    image_base64: Optional[str],
    config: AIConfigSchema,
) -> Tuple[str, float, str]:
    start_t = time.time()
    api_key = config.openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenRouter API Key is not configured. Please set it in the Admin Panel.",
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://calsnap.app",
        "X-Title": "CalSnap AI Nutrition",
    }

    if image_base64:
        img_url = (
            image_base64
            if image_base64.startswith("data:")
            else f"data:image/jpeg;base64,{image_base64}"
        )
        user_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": img_url}},
        ]
    else:
        user_content = prompt

    payload = {
        "model": config.openrouter_model,
        "messages": [
            {"role": "system", "content": config.system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": config.temperature,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        latency_ms = (time.time() - start_t) * 1000.0
        if resp.status_code != 200:
            err_txt = resp.text[:300]
            raise HTTPException(status_code=resp.status_code, detail=f"OpenRouter error ({resp.status_code}): {err_txt}")
        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(status_code=502, detail="OpenRouter returned empty choices")
        result = choices[0].get("message", {}).get("content", "").strip()
        return result, latency_ms, config.openrouter_model


async def _complete_gemini(
    prompt: str,
    image_base64: Optional[str],
    config: AIConfigSchema,
) -> Tuple[str, float, str]:
    start_t = time.time()
    api_key = config.gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API Key is not configured. Please set it in the Admin Panel.",
        )

    model_name = config.gemini_model.replace("models/", "")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    parts = [{"text": f"{config.system_prompt}\n\n{prompt}"}]
    if image_base64:
        clean_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": clean_b64,
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": config.temperature,
        },
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, json=payload)
        latency_ms = (time.time() - start_t) * 1000.0
        if resp.status_code != 200:
            err_txt = resp.text[:300]
            # If using OpenAI wrapper key with emergent integrations fallback
            if "sk-emergent" in api_key:
                chat = LlmChat(api_key=api_key, session_id=f"calsnap-{uuid4().hex}", system_message=config.system_prompt).with_model("openai", "gpt-5.4")
                files = [ImageContent(image_base64=image_base64)] if image_base64 else None
                chunks = []
                async for event in chat.stream_message(UserMessage(text=prompt, file_contents=files)):
                    if isinstance(event, TextDelta):
                        chunks.append(event.content)
                    elif isinstance(event, StreamDone):
                        break
                return "".join(chunks).strip(), latency_ms, "gpt-5.4 (fallback)"
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API error ({resp.status_code}): {err_txt}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=502, detail="Gemini returned empty candidates")
        result = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
        return result, latency_ms, model_name


async def _complete(
    text: str,
    image_base64: Optional[str] = None,
    override_config: Optional[AIConfigSchema] = None,
    endpoint_name: str = "custom",
) -> str:
    config = override_config or await get_active_ai_config()
    provider = config.active_provider

    try:
        if provider == "openrouter":
            result, latency, used_model = await _complete_openrouter(text, image_base64, config)
        else:
            result, latency, used_model = await _complete_gemini(text, image_base64, config)

        await log_ai_execution(provider, used_model, endpoint_name, latency, "success")
        return result
    except Exception as exc:
        err_msg = str(exc)
        if hasattr(exc, "detail"):
            err_msg = str(exc.detail)

        # Auto-fallback logic if enabled
        if config.auto_fallback and not override_config:
            fallback_provider = "gemini" if provider == "openrouter" else "openrouter"
            logger.warning(f"{provider} failed ({err_msg}). Auto-falling back to {fallback_provider}...")
            try:
                if fallback_provider == "openrouter":
                    result, latency, used_model = await _complete_openrouter(text, image_base64, config)
                else:
                    result, latency, used_model = await _complete_gemini(text, image_base64, config)
                await log_ai_execution(f"{fallback_provider} (fallback)", used_model, endpoint_name, latency, "success", f"Fallback from {provider} error: {err_msg}")
                return result
            except Exception as fb_exc:
                fb_err = str(fb_exc)
                if hasattr(fb_exc, "detail"):
                    fb_err = str(fb_exc.detail)
                await log_ai_execution(provider, config.openrouter_model if provider=="openrouter" else config.gemini_model, endpoint_name, 0.0, "error", f"Primary: {err_msg} | Fallback: {fb_err}")
                raise exc from fb_exc

        await log_ai_execution(provider, config.openrouter_model if provider=="openrouter" else config.gemini_model, endpoint_name, 0.0, "error", err_msg)
        raise exc


def _json(raw: str) -> dict:
    cleaned = re.sub(
        r"^```(?:json)?|```$",
        "",
        raw.strip(),
        flags=re.IGNORECASE,
    ).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="AI returned an unreadable JSON result",
        ) from exc


async def test_ai_prompt(prompt: str, provider: Optional[str] = None, model: Optional[str] = None) -> AITestResponse:
    config = await get_active_ai_config()
    test_config = config.model_copy()
    if provider in ["openrouter", "gemini"]:
        test_config.active_provider = provider
    if model:
        if test_config.active_provider == "openrouter":
            test_config.openrouter_model = model
        else:
            test_config.gemini_model = model

    start_t = time.time()
    try:
        if test_config.active_provider == "openrouter":
            result, latency, used_model = await _complete_openrouter(prompt, None, test_config)
        else:
            result, latency, used_model = await _complete_gemini(prompt, None, test_config)
        await log_ai_execution(test_config.active_provider, used_model, "admin_test", latency, "success")
        return AITestResponse(
            success=True,
            provider=test_config.active_provider,
            model=used_model,
            latency_ms=round(latency, 2),
            result=result,
        )
    except Exception as exc:
        latency = (time.time() - start_t) * 1000.0
        err_detail = str(exc)
        if hasattr(exc, "detail"):
            err_detail = str(exc.detail)
        await log_ai_execution(test_config.active_provider, model or "default", "admin_test", latency, "error", err_detail)
        return AITestResponse(
            success=False,
            provider=test_config.active_provider,
            model=model or "default",
            latency_ms=round(latency, 2),
            result="",
            error=err_detail,
        )


def _has_any_key(config: AIConfigSchema) -> bool:
    """Return True if at least one usable API key is present."""
    return bool(
        config.gemini_api_key
        or config.openrouter_api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("EMERGENT_LLM_KEY")
        or os.getenv("OPENROUTER_API_KEY")
    )


def _no_ai_scan_response(mode: str) -> ScanResponse:
    """Placeholder ScanResponse returned when no AI key is configured."""
    placeholder = MealItem(
        name="Unknown food (AI not configured)",
        estimated_weight_g=0,
        portion="—",
        calories=0,
        protein_g=0,
        carbs_g=0,
        fat_g=0,
        fiber_g=0,
        sugar_g=0,
        sodium_mg=0,
        confidence=0.0,
    )
    return ScanResponse(
        scan_id=f"scan_noai_{uuid4().hex[:8]}",
        meal_name="AI not configured",
        total_weight_g=0,
        foods=[placeholder],
        totals=Nutrients(),
        confidence=0.0,
        warnings=[
            "AI analysis is disabled — no API key is configured. "
            "Add GEMINI_API_KEY or OPENROUTER_API_KEY in Replit Secrets to enable real nutrition estimates."
        ],
        guidance="Review and edit the food items manually before saving.",
    )


async def analyze_food(
    image_base64: str,
    mode: str,
) -> ScanResponse:
    config = await get_active_ai_config()
    if not _has_any_key(config):
        logger.warning("analyze_food called but no AI key is configured — returning placeholder")
        return _no_ai_scan_response(mode)

    mode_hint = {
        "meal": "Identify every visible food separately.",
        "restaurant": "Treat this as a restaurant dish; account for likely oil, sauces, and hidden ingredients.",
        "before": "This is a pre-meal plate; estimate the starting portions.",
        "after": "This is a post-meal plate; estimate the remaining portions only.",
    }.get(mode, "Identify every visible food separately.")

    prompt = f"""
Analyze this food image. {mode_hint}

Return exactly this shape:
{{
  "meal_name": "string",
  "total_weight_g": 0,
  "confidence": 0.0,
  "warnings": ["string"],
  "guidance": "string",
  "foods": [
    {{
      "name": "string",
      "estimated_weight_g": 0,
      "portion": "string",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "sugar_g": 0,
      "sodium_mg": 0,
      "confidence": 0.0
    }}
  ]
}}

Confidence is 0 to 1. Mention uncertainty for mixed dishes and visually hidden ingredients.
""".strip()

    raw_resp = await _complete(prompt, image_base64, endpoint_name="scan")
    data = _json(raw_resp)

    foods = [
        MealItem(**item)
        for item in data.get("foods", [])
    ]

    if not foods:
        raise HTTPException(
            status_code=422,
            detail="No food could be detected in the image",
        )

    totals = Nutrients(
        calories=sum(item.calories for item in foods),
        protein_g=sum(item.protein_g for item in foods),
        carbs_g=sum(item.carbs_g for item in foods),
        fat_g=sum(item.fat_g for item in foods),
        fiber_g=sum(item.fiber_g for item in foods),
        sugar_g=sum(item.sugar_g for item in foods),
        sodium_mg=sum(item.sodium_mg for item in foods),
    )

    return ScanResponse(
        scan_id=f"scan_{uuid4().hex[:12]}",
        meal_name=data.get("meal_name") or "Scanned meal",
        total_weight_g=float(
            data.get("total_weight_g")
            or sum(item.estimated_weight_g for item in foods)
        ),
        foods=foods,
        totals=totals,
        confidence=float(data.get("confidence", 0.7)),
        warnings=data.get("warnings", []),
        guidance=data.get("guidance") or "Review portions before saving.",
    )


RECIPE_CATEGORY_IMAGES = {
    "Vegan": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    "Protein": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80",
    "Snacks": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    "Sweets": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80",
}
_DEFAULT_RECIPE_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80"

_DIFFICULTY_LABELS = {1: "Easy", 2: "Medium", 3: "Hard"}


def _coerce_generated_recipe(item: dict) -> Optional[dict]:
    """Normalize one AI-generated recipe into the exact catalog shape.

    Returns None when the recipe is missing required content so callers can
    drop it instead of serving a broken entry.
    """
    try:
        title = str(item.get("title", "")).strip()
        ingredients = [str(x).strip() for x in item.get("ingredients", []) if str(x).strip()]
        steps = [str(x).strip() for x in item.get("steps", []) if str(x).strip()]
        if not title or not ingredients or not steps:
            return None

        category = str(item.get("category", "")).strip()
        if category not in RECIPE_CATEGORY_IMAGES:
            category = "Protein"

        difficulty = int(item.get("difficulty", 2))
        difficulty = min(max(difficulty, 1), 3)

        return {
            "id": f"ai-{uuid4().hex[:10]}",
            "title": title,
            "minutes": max(int(item.get("minutes", 30)), 1),
            "difficulty": difficulty,
            "difficulty_label": _DIFFICULTY_LABELS[difficulty],
            "category": category,
            "image": RECIPE_CATEGORY_IMAGES.get(category, _DEFAULT_RECIPE_IMAGE),
            "kcal": max(int(item.get("kcal", 0)), 0),
            "protein_g": max(int(item.get("protein_g", 0)), 0),
            "carbs_g": max(int(item.get("carbs_g", 0)), 0),
            "fat_g": max(int(item.get("fat_g", 0)), 0),
            "fiber_g": max(int(item.get("fiber_g", 0)), 0),
            "description": str(item.get("description", "")).strip() or title,
            "ingredients": ingredients,
            "steps": steps,
        }
    except (TypeError, ValueError):
        return None


async def generate_recipes(
    profile: Optional[dict],
    count: int = 6,
    exclude_titles: Optional[list] = None,
) -> list:
    """Ask the AI for goal-matched recipes in the catalog shape.

    Returns an empty list when no AI key is configured (mirrors the
    _no_ai_scan_response pattern — callers fall back to the curated catalog).
    Raises HTTPException on AI/parse failures so callers can decide to fall back.
    """
    config = await get_active_ai_config()
    if not _has_any_key(config):
        logger.warning("generate_recipes called but no AI key is configured — caller should fall back to catalog")
        return []

    goals = (profile or {}).get("goals") or {}
    goal_direction = (profile or {}).get("goal", "maintain")
    diet = (profile or {}).get("diet_preference") or (profile or {}).get("dietary_preference") or "no restriction"

    goal_lines = []
    if goals.get("calories"):
        goal_lines.append(f"Daily calorie target: {goals['calories']} kcal (aim each recipe near 1/3 of this).")
    if goals.get("protein_g"):
        goal_lines.append(f"Daily protein target: {goals['protein_g']} g.")
    goal_lines.append(f"Overall goal: {goal_direction} weight.")
    goal_lines.append(f"Dietary preference: {diet}.")
    goals_text = "\n".join(goal_lines)

    exclude_text = ""
    if exclude_titles:
        exclude_text = "Do NOT repeat any of these recipes: " + ", ".join(exclude_titles[:40]) + "."

    prompt = f"""
Create {count} fresh, varied recipe ideas tailored to this user's nutrition goals.

{goals_text}
{exclude_text}

Return exactly this strict JSON shape (no prose):
{{
  "recipes": [
    {{
      "title": "string",
      "minutes": 0,
      "difficulty": 1,
      "category": "Vegan|Protein|Snacks|Sweets",
      "kcal": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "description": "one appetizing sentence",
      "ingredients": ["quantity + ingredient"],
      "steps": ["clear cooking step"]
    }}
  ]
}}

Rules: difficulty is 1 (easy), 2 (medium) or 3 (hard). Macros are realistic integers per serving.
Include a mix of categories. Every recipe needs at least 4 ingredients and 3 steps.
""".strip()

    raw = await _complete(prompt, endpoint_name="recipes")
    data = _json(raw)

    recipes = []
    for item in data.get("recipes", []):
        coerced = _coerce_generated_recipe(item)
        if coerced:
            recipes.append(coerced)

    if not recipes:
        raise HTTPException(
            status_code=502,
            detail="AI returned no usable recipes",
        )

    return recipes


async def transcribe_and_parse(
    file: UploadFile,
) -> dict:
    content = await file.read()

    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Audio must be under 25 MB",
        )

    config = await get_active_ai_config()

    if not _has_any_key(config):
        logger.warning("transcribe_and_parse called but no AI key is configured — returning placeholder")
        placeholder = MealItem(
            name="Unknown food (AI not configured)",
            estimated_weight_g=0,
            portion="—",
            calories=0,
            protein_g=0,
            carbs_g=0,
            fat_g=0,
            fiber_g=0,
            sugar_g=0,
            sodium_mg=0,
            confidence=0.0,
        )
        return {
            "title": "AI not configured",
            "meal_type": "Snack",
            "transcript": "AI not configured",
            "items": [placeholder.model_dump()],
            "warnings": [
                "Voice analysis is disabled — no API key is configured. "
                "Add GEMINI_API_KEY or OPENROUTER_API_KEY in Replit Secrets to enable real voice logging."
            ],
        }
    transcript = None

    # If Gemini is active or API key set, try Gemini native multimodal audio transcription
    if config.active_provider == "gemini" and (config.gemini_api_key or os.getenv("GEMINI_API_KEY")):
        try:
            api_key = config.gemini_api_key or os.getenv("GEMINI_API_KEY")
            model_name = config.gemini_model.replace("models/", "")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            b64_audio = base64.b64encode(content).decode("utf-8")
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": "Transcribe accurately what the user is saying about their meal in exact text without any introductory remarks."},
                            {
                                "inline_data": {
                                    "mime_type": "audio/mp4",
                                    "data": b64_audio,
                                }
                            }
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    candidates = resp.json().get("candidates", [])
                    if candidates:
                        transcript = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
        except Exception as exc:
            logger.warning(f"Gemini native audio transcription failed: {exc}")

    # Fallback to OpenAI Whisper if available or not transcribed
    if not transcript:
        suffix = Path(file.filename or "meal.m4a").suffix or ".m4a"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp:
            temp.write(content)
            temp.flush()
            try:
                whisper_key = os.getenv("EMERGENT_LLM_KEY") or config.gemini_api_key or config.openrouter_api_key
                with open(temp.name, "rb") as audio_file:
                    response = await OpenAISpeechToText(api_key=whisper_key).transcribe(
                        audio_file, model="whisper-1", response_format="json"
                    )
                transcript = getattr(response, "text", None) or (
                    response.get("text") if isinstance(response, dict) else str(response)
                )
            except Exception as exc:
                if not transcript:
                    raise HTTPException(status_code=502, detail="Voice transcription failed. Please check audio file or API key.") from exc

    raw = await _complete(
        f"""
Convert this spoken meal log into nutrition estimates.

Transcript: {transcript!r}

Return strict JSON:
{{
  "title": "string",
  "meal_type": "Breakfast|Lunch|Dinner|Snack",
  "items": [
    {{
      "name": "string",
      "estimated_weight_g": 0,
      "portion": "string",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "sugar_g": 0,
      "sodium_mg": 0,
      "confidence": 0.0
    }}
  ]
}}
""".strip(),
        endpoint_name="voice-log"
    )

    data = _json(raw)
    data["transcript"] = transcript
    data["items"] = [
        MealItem(**item).model_dump()
        for item in data.get("items", [])
    ]

    return data


async def coach_reply(message: str, context: dict) -> str:
    raw = await _complete(
        f"User nutrition context: {json.dumps(context)}\nQuestion: {message}\n"
        'Return strict JSON: {"answer":"concise actionable answer under 120 words"}. Include an informational-not-medical-advice note only when health conditions are mentioned.',
        endpoint_name="coach"
    )
    data = _json(raw)
    return str(data.get("answer") or raw)

