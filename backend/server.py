import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from ai_service import (
    analyze_food,
    coach_reply,
    generate_recipes,
    get_active_ai_config,
    get_public_ai_config,
    save_ai_config,
    set_ai_db,
    test_ai_prompt,
    transcribe_and_parse,
)
from auth import exchange_session, require_user
from images import (
    backfill_thumbnails,
    compress_full_image,
    make_thumbnail,
    recompress_old_images,
)
from models import (
    AIConfigPublic,
    AIConfigSchema,
    AIConfigUpdate,
    AILogEntry,
    AITestRequest,
    AITestResponse,
    AuthSessionRequest,
    BarcodeResponse,
    ChallengeInput,
    ChallengeStatus,
    ChatInput,
    CompareScanRequest,
    CompareResult,
    FastingInput,
    MealCreate,
    MealItem,
    MealResponse,
    Nutrients,
    ProfileInput,
    ProfileResponse,
    ScanRequest,
    ScanResponse,
    UserPublic,
    WaterInput,
    WeightInput,
    now_iso,
)
from recipes_catalog import RECIPE_CATEGORIES, RECIPES
from models import (
    BookmarkInput,
    RecipeDetail,
    RecipeListResponse,
    RecipeSummary,
)
from nutrition import (
    build_dashboard,
    build_weekly_report,
    calculate_challenge_progress,
    calculate_goals,
    iso_day,
    refresh_all_challenges,
    sum_nutrients,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
try:
    import socket
    from urllib.parse import urlparse
    u = urlparse(mongo_url)
    with socket.create_connection((u.hostname or "localhost", u.port or 27017), timeout=1.0):
        pass
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=3000)
except Exception:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
db = client[os.environ["DB_NAME"]]
set_ai_db(db)

app = FastAPI()
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    cfg = await get_active_ai_config()
    active_model = cfg.openrouter_model if cfg.active_provider == "openrouter" else cfg.gemini_model
    return {
        "message": "CalSnap API",
        "status": "healthy",
        "ai_provider": cfg.active_provider,
        "ai_model": active_model,
    }



@api_router.post("/auth/session")
async def create_session(
    payload: AuthSessionRequest,
):
    user, token = await exchange_session(
        db,
        payload.session_id,
    )

    return {
        "user": user.model_dump(),
        "session_token": token,
    }


@api_router.get(
    "/auth/me",
    response_model=UserPublic,
)
async def auth_me(
    user: UserPublic = Depends(require_user),
):
    return user


@api_router.post("/auth/logout")
async def logout(
    user: UserPublic = Depends(require_user),
):
    await db.user_sessions.delete_many(
        {"user_id": user.user_id}
    )

    return {"ok": True}


@api_router.put(
    "/profile",
    response_model=ProfileResponse,
)
async def save_profile(
    payload: ProfileInput,
    user: UserPublic = Depends(require_user),
):
    goals = calculate_goals(payload)

    doc = {
        "user_id": user.user_id,
        **payload.model_dump(),
        "goals": goals.model_dump(),
        "updated_at": now_iso(),
    }

    await db.profiles.update_one(
        {"user_id": user.user_id},
        {"$set": doc},
        upsert=True,
    )

    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "onboarding_complete": True,
            }
        },
    )

    return ProfileResponse(
        **payload.model_dump(),
        goals=goals,
    )


@api_router.get("/profile")
async def get_profile(
    user: UserPublic = Depends(require_user),
):
    profile = await db.profiles.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not set up",
        )

    return profile


@api_router.get("/dashboard")
async def dashboard(
    day: str | None = None,
    user: UserPublic = Depends(require_user),
):
    return await build_dashboard(
        db,
        user.user_id,
        day,
    )


@api_router.post(
    "/scan",
    response_model=ScanResponse,
)
async def scan_meal(
    payload: ScanRequest,
    user: UserPublic = Depends(require_user),
):
    result = await analyze_food(
        payload.image_base64,
        payload.mode,
    )

    await db.scans.insert_one(
        {
            **result.model_dump(),
            "user_id": user.user_id,
            "mode": payload.mode,
            "created_at": now_iso(),
        }
    )

    return result


@api_router.post(
    "/meals",
    response_model=MealResponse,
)
async def create_meal(
    payload: MealCreate,
    user: UserPublic = Depends(require_user),
):
    totals = sum_nutrients(
        [
            item.model_dump()
            for item in payload.items
        ]
    )

    doc = {
        **payload.model_dump(),
        "image_base64": compress_full_image(payload.image_base64),
        "image_optimized": True,
        "thumbnail_base64": make_thumbnail(payload.image_base64),
        "meal_id": f"meal_{os.urandom(6).hex()}",
        "user_id": user.user_id,
        "day": iso_day(payload.eaten_at),
        "totals": totals.model_dump(),
        "created_at": now_iso(),
    }

    await db.meals.insert_one(doc.copy())
    doc.pop("_id", None)

    # Auto-refresh challenge progress whenever a meal is logged
    try:
        await refresh_all_challenges(db, user.user_id)
    except Exception:
        pass  # Never fail the meal save due to challenge errors

    return MealResponse(**doc)


@api_router.get(
    "/meals/{meal_id}",
    response_model=MealResponse,
)
async def get_meal(
    meal_id: str,
    user: UserPublic = Depends(require_user),
):
    doc = await db.meals.find_one(
        {
            "meal_id": meal_id,
            "user_id": user.user_id,
        },
        {"_id": 0},
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Meal not found",
        )

    return MealResponse(**doc)


@api_router.put(
    "/meals/{meal_id}",
    response_model=MealResponse,
)
async def update_meal(
    meal_id: str,
    payload: MealCreate,
    user: UserPublic = Depends(require_user),
):
    totals = sum_nutrients(
        [
            item.model_dump()
            for item in payload.items
        ]
    )

    updates = {
        **payload.model_dump(),
        "day": iso_day(payload.eaten_at),
        "totals": totals.model_dump(),
    }

    if payload.image_base64:
        updates["image_base64"] = compress_full_image(payload.image_base64)
        updates["image_optimized"] = True
        updates["thumbnail_base64"] = make_thumbnail(payload.image_base64)

    result = await db.meals.update_one(
        {
            "meal_id": meal_id,
            "user_id": user.user_id,
        },
        {"$set": updates},
    )

    if not result.matched_count:
        raise HTTPException(
            status_code=404,
            detail="Meal not found",
        )

    doc = await db.meals.find_one(
        {"meal_id": meal_id},
        {"_id": 0},
    )

    return MealResponse(**doc)


@api_router.delete("/meals/{meal_id}")
async def delete_meal(
    meal_id: str,
    user: UserPublic = Depends(require_user),
):
    result = await db.meals.delete_one(
        {
            "meal_id": meal_id,
            "user_id": user.user_id,
        }
    )

    if not result.deleted_count:
        raise HTTPException(
            status_code=404,
            detail="Meal not found",
        )

    return {"ok": True}


@api_router.get("/history")
async def food_history(
    user: UserPublic = Depends(require_user),
):
    meals = await (
        db.meals.find(
            {"user_id": user.user_id},
            {
                "_id": 0,
                "image_base64": 0,
            },
        )
        .sort("eaten_at", -1)
        .limit(100)
        .to_list(100)
    )

    # Older meals may predate thumbnails; generate them once, lazily.
    await backfill_thumbnails(db, user.user_id, meals)

    # Older meals may store huge full-res photos; shrink them once, lazily.
    await recompress_old_images(db, user.user_id, meals)

    return meals


@api_router.post("/water")
async def add_water(
    payload: WaterInput,
    user: UserPublic = Depends(require_user),
):
    doc = {
        "log_id": f"water_{os.urandom(5).hex()}",
        "user_id": user.user_id,
        **payload.model_dump(),
        "day": iso_day(payload.logged_at),
    }

    await db.water_logs.insert_one(doc.copy())
    doc.pop("_id", None)

    # Auto-refresh challenge progress whenever water is logged
    try:
        await refresh_all_challenges(db, user.user_id)
    except Exception:
        pass

    return doc


@api_router.post("/weight")
async def add_weight(
    payload: WeightInput,
    user: UserPublic = Depends(require_user),
):
    doc = {
        "log_id": f"weight_{os.urandom(5).hex()}",
        "user_id": user.user_id,
        **payload.model_dump(),
    }

    await db.weight_logs.insert_one(doc.copy())
    doc.pop("_id", None)

    return doc


@api_router.get("/weight")
async def weight_history(
    user: UserPublic = Depends(require_user),
):
    return await (
        db.weight_logs.find(
            {"user_id": user.user_id},
            {"_id": 0},
        )
        .sort("logged_at", 1)
        .limit(400)
        .to_list(400)
    )


@api_router.get("/reports/weekly")
async def weekly_report(
    user: UserPublic = Depends(require_user),
):
    return await build_weekly_report(
        db,
        user.user_id,
    )


@api_router.put("/fasting")
async def save_fasting(
    payload: FastingInput,
    user: UserPublic = Depends(require_user),
):
    doc = {
        "user_id": user.user_id,
        **payload.model_dump(),
        "updated_at": now_iso(),
    }

    await db.fasting.update_one(
        {"user_id": user.user_id},
        {"$set": doc},
        upsert=True,
    )

    return doc


@api_router.get("/fasting")
async def get_fasting(
    user: UserPublic = Depends(require_user),
):
    result = await db.fasting.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
    )

    return result or {
        "enabled": False,
        "start_hour": 12,
        "end_hour": 20,
    }


@api_router.post("/challenges")
async def join_challenge(
    payload: ChallengeInput,
    user: UserPublic = Depends(require_user),
):
    from nutrition import CHALLENGE_DEFS
    defn = CHALLENGE_DEFS.get(payload.challenge_id, {})
    goal = defn.get("goal", 7)

    doc = {
        "user_id": user.user_id,
        "challenge_id": payload.challenge_id,
        "joined_at": now_iso(),
        "progress": 0,
        "goal": goal,
        "streak": 0,
        "badge_earned": False,
        "completed_at": None,
    }

    await db.challenges.update_one(
        {
            "user_id": user.user_id,
            "challenge_id": payload.challenge_id,
        },
        {"$setOnInsert": doc},
        upsert=True,
    )

    # Compute real progress immediately after joining
    status = await calculate_challenge_progress(
        db, user.user_id, payload.challenge_id
    )
    return status.model_dump() if status else doc


@api_router.get("/challenges")
async def get_challenges(
    user: UserPublic = Depends(require_user),
):
    """Return all joined challenges with up-to-date progress."""
    joined = await db.challenges.find(
        {"user_id": user.user_id},
        {"_id": 0, "challenge_id": 1},
    ).to_list(20)

    results = []
    for entry in joined:
        status = await calculate_challenge_progress(
            db, user.user_id, entry["challenge_id"]
        )
        if status:
            results.append(status.model_dump())

    return results


async def _user_saved_recipe_ids(user_id: str) -> set:
    doc = await db.recipe_bookmarks.find_one(
        {"user_id": user_id}, {"_id": 0, "recipe_ids": 1}
    )
    return set(doc.get("recipe_ids", [])) if doc else set()


def _rank_recipes_for_goals(profile: Optional[dict]) -> List[dict]:
    """Order recipes so those closest to the user's per-meal calorie/macro
    targets come first. Falls back to the raw list when no profile exists."""
    if not profile:
        return list(RECIPES)

    goals = profile.get("goals") or {}
    daily_cal = goals.get("calories") or 0
    if not daily_cal:
        return list(RECIPES)

    # Approx. per-meal budget (3 main meals a day).
    target_cal = daily_cal / 3.0
    target_protein = (goals.get("protein_g") or 0) / 3.0
    goal = profile.get("goal", "maintain")

    def score(recipe: dict) -> float:
        cal_diff = abs(recipe["kcal"] - target_cal) / max(target_cal, 1)
        protein_diff = abs(recipe["protein_g"] - target_protein) / max(target_protein, 1)
        s = cal_diff + 0.5 * protein_diff
        # Nudge ordering by goal direction.
        if goal == "lose":
            s += recipe["kcal"] / 2000.0          # prefer lighter meals
            s -= recipe["protein_g"] / 200.0      # but reward protein
        elif goal == "gain":
            s -= recipe["kcal"] / 2000.0          # prefer calorie-dense meals
        return s

    return sorted(RECIPES, key=score)


@api_router.get("/recipes", response_model=RecipeListResponse)
async def list_recipes(
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    saved_only: bool = Query(default=False),
    user: UserPublic = Depends(require_user),
):
    profile = await db.profiles.find_one(
        {"user_id": user.user_id}, {"_id": 0}
    )
    saved_ids = await _user_saved_recipe_ids(user.user_id)

    ranked = _rank_recipes_for_goals(profile)

    if saved_only:
        ranked = [r for r in ranked if r["id"] in saved_ids]
    if category and category != "All":
        ranked = [r for r in ranked if r["category"] == category]
    if q:
        needle = q.strip().lower()
        ranked = [
            r for r in ranked
            if needle in r["title"].lower()
            or needle in r["description"].lower()
        ]

    summaries = [
        RecipeSummary(
            **{k: r[k] for k in (
                "id", "title", "minutes", "difficulty", "difficulty_label",
                "category", "image", "kcal", "protein_g", "carbs_g",
                "fat_g", "fiber_g",
            )},
            saved=r["id"] in saved_ids,
        )
        for r in ranked
    ]

    return RecipeListResponse(
        categories=list(RECIPE_CATEGORIES),
        recipes=summaries,
        matched_to_goals=bool(profile and (profile.get("goals") or {}).get("calories")),
    )


GENERATED_RECIPES_TTL_SECONDS = 24 * 3600


async def _get_generated_recipes_doc(user_id: str) -> Optional[dict]:
    return await db.generated_recipes.find_one(
        {"user_id": user_id}, {"_id": 0}
    )


def _recipe_summaries(recipes: List[dict], saved_ids: set) -> List[RecipeSummary]:
    return [
        RecipeSummary(
            **{k: r[k] for k in (
                "id", "title", "minutes", "difficulty", "difficulty_label",
                "category", "image", "kcal", "protein_g", "carbs_g",
                "fat_g", "fiber_g",
            )},
            saved=r["id"] in saved_ids,
        )
        for r in recipes
    ]


@api_router.post("/recipes/generate", response_model=RecipeListResponse)
async def generate_fresh_recipes(
    refresh: bool = Query(default=False),
    user: UserPublic = Depends(require_user),
):
    """Return AI-generated, goal-matched recipes in the catalog shape.

    Results are cached per user for 24h (pass refresh=true to force new
    ideas). Falls back to the curated catalog when no AI key is configured
    or the AI call fails.
    """
    profile = await db.profiles.find_one(
        {"user_id": user.user_id}, {"_id": 0}
    )
    saved_ids = await _user_saved_recipe_ids(user.user_id)
    matched = bool(profile and (profile.get("goals") or {}).get("calories"))

    cached = await _get_generated_recipes_doc(user.user_id)
    if cached and not refresh:
        from datetime import datetime, timezone
        try:
            created = datetime.fromisoformat(cached["created_at"])
            age = (datetime.now(timezone.utc) - created).total_seconds()
        except (KeyError, ValueError):
            age = GENERATED_RECIPES_TTL_SECONDS + 1
        if age < GENERATED_RECIPES_TTL_SECONDS and cached.get("recipes"):
            return RecipeListResponse(
                categories=list(RECIPE_CATEGORIES),
                recipes=_recipe_summaries(cached["recipes"], saved_ids),
                matched_to_goals=cached.get("matched_to_goals", matched),
            )

    exclude_titles = [r["title"] for r in (cached or {}).get("recipes", [])]

    try:
        recipes = await generate_recipes(
            profile, count=6, exclude_titles=exclude_titles
        )
    except HTTPException:
        recipes = []

    if not recipes:
        # No AI key configured or AI failed — fall back to the curated
        # catalog ranked against the user's goals (same shape).
        ranked = _rank_recipes_for_goals(profile)
        return RecipeListResponse(
            categories=list(RECIPE_CATEGORIES),
            recipes=_recipe_summaries(ranked, saved_ids),
            matched_to_goals=matched,
        )

    await db.generated_recipes.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "user_id": user.user_id,
                "recipes": recipes,
                "matched_to_goals": matched,
                "created_at": now_iso(),
            }
        },
        upsert=True,
    )

    return RecipeListResponse(
        categories=list(RECIPE_CATEGORIES),
        recipes=_recipe_summaries(recipes, saved_ids),
        matched_to_goals=matched,
    )


async def _find_recipe(user_id: str, recipe_id: str) -> Optional[dict]:
    """Look up a recipe in the curated catalog or the user's AI-generated set."""
    recipe = next((r for r in RECIPES if r["id"] == recipe_id), None)
    if recipe:
        return recipe
    doc = await _get_generated_recipes_doc(user_id)
    if doc:
        return next(
            (r for r in doc.get("recipes", []) if r["id"] == recipe_id),
            None,
        )
    return None


@api_router.get("/recipes/{recipe_id}", response_model=RecipeDetail)
async def get_recipe(
    recipe_id: str,
    user: UserPublic = Depends(require_user),
):
    recipe = await _find_recipe(user.user_id, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    saved_ids = await _user_saved_recipe_ids(user.user_id)
    return RecipeDetail(**recipe, saved=recipe_id in saved_ids)


@api_router.post("/recipes/bookmark")
async def toggle_recipe_bookmark(
    payload: BookmarkInput,
    user: UserPublic = Depends(require_user),
):
    if not await _find_recipe(user.user_id, payload.recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")

    op = "$addToSet" if payload.saved else "$pull"
    await db.recipe_bookmarks.update_one(
        {"user_id": user.user_id},
        {op: {"recipe_ids": payload.recipe_id}},
        upsert=True,
    )
    return {"recipe_id": payload.recipe_id, "saved": payload.saved}


@api_router.post(
    "/scan/compare",
)
async def compare_scans(
    payload: CompareScanRequest,
    user: UserPublic = Depends(require_user),
):
    """Analyze before and after plate photos and return consumed nutrients."""
    before = await analyze_food(payload.before_image_base64, "before")
    after = await analyze_food(payload.after_image_base64, "after")

    def diff(a: float, b: float) -> float:
        return round(max(0.0, a - b), 1)

    consumed = Nutrients(
        calories=diff(before.totals.calories, after.totals.calories),
        protein_g=diff(before.totals.protein_g, after.totals.protein_g),
        carbs_g=diff(before.totals.carbs_g, after.totals.carbs_g),
        fat_g=diff(before.totals.fat_g, after.totals.fat_g),
        fiber_g=diff(before.totals.fiber_g, after.totals.fiber_g),
        sugar_g=diff(before.totals.sugar_g, after.totals.sugar_g),
        sodium_mg=diff(before.totals.sodium_mg, after.totals.sodium_mg),
    )

    consumed_weight = max(0.0, before.total_weight_g - after.total_weight_g)
    avg_confidence = round((before.confidence + after.confidence) / 2, 2)

    return {
        "before": before.model_dump(),
        "after": after.model_dump(),
        "consumed": consumed.model_dump(),
        "consumed_weight_g": consumed_weight,
        "confidence": avg_confidence,
        "guidance": (
            f"You consumed approximately {round(consumed.calories)} kcal "
            f"({round(consumed_weight)} g) from this meal. "
            "Review the breakdown and save what you actually ate."
        ),
    }


@api_router.get(
    "/barcode/{barcode}",
    response_model=BarcodeResponse,
)
async def barcode_lookup(
    barcode: str,
    user: UserPublic = Depends(require_user),
):
    if (
        not barcode.isdigit()
        or not 6 <= len(barcode) <= 18
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid barcode",
        )

    cached = await db.products.find_one(
        {"barcode": barcode},
        {"_id": 0},
    )

    if cached:
        return BarcodeResponse(**cached)

    fields = (
        "product_name,brands,serving_size,"
        "nutrition_grades,nutriments"
    )

    url = (
        "https://world.openfoodfacts.org/"
        f"api/v2/product/{barcode}"
    )

    try:
        async with httpx.AsyncClient(
            timeout=12
        ) as client_http:
            response = await client_http.get(
                url,
                params={"fields": fields},
                headers={
                    "User-Agent": os.getenv(
                        "OFF_USER_AGENT",
                        "CalSnap/1.0",
                    )
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail="Product service unavailable",
        ) from exc

    data = response.json()
    product = data.get("product")

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    nutrients = product.get("nutriments", {})

    item = MealItem(
        name=(
            product.get("product_name")
            or "Packaged food"
        ),
        portion=(
            product.get("serving_size")
            or "100 g"
        ),
        estimated_weight_g=100,
        calories=(
            nutrients.get("energy-kcal_100g", 0)
            or 0
        ),
        protein_g=(
            nutrients.get("proteins_100g", 0)
            or 0
        ),
        carbs_g=(
            nutrients.get("carbohydrates_100g", 0)
            or 0
        ),
        fat_g=(
            nutrients.get("fat_100g", 0)
            or 0
        ),
        fiber_g=(
            nutrients.get("fiber_100g", 0)
            or 0
        ),
        sugar_g=(
            nutrients.get("sugars_100g", 0)
            or 0
        ),
        sodium_mg=(
            nutrients.get("sodium_100g", 0)
            or 0
        ) * 1000,
        confidence=0.98,
    )

    doc = {
        "barcode": barcode,
        "product_name": item.name,
        "brand": product.get("brands"),
        "serving_size": item.portion,
        "nutrition_grade": product.get(
            "nutrition_grades"
        ),
        "item": item.model_dump(),
    }

    await db.products.insert_one(doc.copy())

    return BarcodeResponse(**doc)


@api_router.post("/voice/parse")
async def parse_voice(
    file: UploadFile = File(...),
    user: UserPublic = Depends(require_user),
):
    if (
        not file.content_type
        or not file.content_type.startswith("audio/")
    ):
        raise HTTPException(
            status_code=400,
            detail="An audio recording is required",
        )

    return await transcribe_and_parse(file)


@api_router.post("/coach")
async def coach(
    payload: ChatInput,
    user: UserPublic = Depends(require_user),
):
    context = await build_dashboard(
        db,
        user.user_id,
    )

    reply = await coach_reply(
        payload.message,
        {
            "totals": context["totals"],
            "goals": context["goals"],
            "suggestions": context["suggestions"],
        },
    )

    await db.chat_messages.insert_one(
        {
            "user_id": user.user_id,
            "message": payload.message,
            "reply": reply,
            "created_at": now_iso(),
        }
    )

    return {"reply": reply}


admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


async def verify_admin(
    x_admin_pin: Optional[str] = Header(default=None),
    pin: Optional[str] = Query(default=None),
):
    cfg = await get_active_ai_config()
    provided = x_admin_pin or pin
    if provided != cfg.admin_pin:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin PIN code")
    return True


@admin_router.get("/config", response_model=AIConfigPublic)
async def get_admin_config(_: bool = Depends(verify_admin)):
    return await get_public_ai_config()


@admin_router.put("/config", response_model=AIConfigPublic)
async def update_admin_config(payload: AIConfigUpdate, _: bool = Depends(verify_admin)):
    await save_ai_config(payload)
    return await get_public_ai_config()


@admin_router.post("/test-ai", response_model=AITestResponse)
async def run_ai_test(payload: AITestRequest, _: bool = Depends(verify_admin)):
    return await test_ai_prompt(payload.prompt, payload.provider, payload.model)


@admin_router.get("/stats")
async def get_admin_stats(_: bool = Depends(verify_admin)):
    cfg = await get_active_ai_config()
    total_users = await db.users.count_documents({})
    total_meals = await db.meals.count_documents({})
    total_scans = await db.ai_logs.count_documents({"endpoint": "scan"})
    total_voice = await db.ai_logs.count_documents({"endpoint": "voice-log"})
    total_coach = await db.ai_logs.count_documents({"endpoint": "coach"})
    total_errors = await db.ai_logs.count_documents({"status": "error"})
    recent_logs = await db.ai_logs.find().sort("timestamp", -1).limit(50).to_list(length=None)
    for doc in recent_logs:
        doc.pop("_id", None)
    return {
        "active_provider": cfg.active_provider,
        "active_model": cfg.openrouter_model if cfg.active_provider == "openrouter" else cfg.gemini_model,
        "total_users": total_users,
        "total_meals": total_meals,
        "total_scans": total_scans,
        "total_voice": total_voice,
        "total_coach": total_coach,
        "total_errors": total_errors,
        "recent_logs": recent_logs,
    }


@admin_router.get("/logs")
async def get_admin_logs(limit: int = Query(default=50, le=200), _: bool = Depends(verify_admin)):
    docs = await db.ai_logs.find().sort("timestamp", -1).limit(limit).to_list(length=None)
    for doc in docs:
        doc.pop("_id", None)
    return {"logs": docs}


@admin_router.get("/models")
async def get_curated_models(_: bool = Depends(verify_admin)):
    return {
        "openrouter_free_models": [
            {"id": "google/gemini-2.0-flash-exp:free", "name": "Google Gemini 2.0 Flash Exp (Free)", "multimodal": True},
            {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B Instruct (Free)", "multimodal": False},
            {"id": "qwen/qwen-2.5-coder-32b-instruct:free", "name": "Qwen 2.5 Coder 32B (Free)", "multimodal": False},
            {"id": "deepseek/deepseek-r1:free", "name": "DeepSeek R1 Reasoning (Free)", "multimodal": False},
            {"id": "mistralai/mistral-7b-instruct:free", "name": "Mistral 7B Instruct (Free)", "multimodal": False},
            {"id": "google/gemini-pro-1.5-exp:free", "name": "Google Gemini Pro 1.5 Exp (Free)", "multimodal": True},
        ],
        "gemini_studio_models": [
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash (Ultra Fast & Multimodal)", "multimodal": True},
            {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro (High Reasoning & Multimodal)", "multimodal": True},
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Fast & Multimodal)", "multimodal": True},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash (Stable & Multimodal)", "multimodal": True},
        ],
    }


app.include_router(api_router)
app.include_router(admin_router)

# Serve Admin Panel Static Assets & Route
admin_panel_dir = ROOT_DIR.parent / "admin-panel"
if admin_panel_dir.exists():
    app.mount("/admin-assets", StaticFiles(directory=str(admin_panel_dir)), name="admin-assets")
    @app.get("/admin", include_in_schema=False)
    async def serve_admin_panel():
        return FileResponse(admin_panel_dir / "index.html")
    @app.get("/admin/{path:path}", include_in_schema=False)
    async def serve_admin_panel_path(path: str):
        file_path = admin_panel_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(admin_panel_dir / "index.html")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s - %(name)s - "
        "%(levelname)s - %(message)s"
    ),
)

logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index(
        "email",
        unique=True,
    )
    await db.users.create_index(
        "user_id",
        unique=True,
    )
    await db.user_sessions.create_index(
        "session_token",
        unique=True,
    )
    await db.user_sessions.create_index(
        "expires_at",
        expireAfterSeconds=0,
    )
    await db.meals.create_index(
        [
            ("user_id", 1),
            ("day", 1),
        ]
    )
    await db.products.create_index(
        "barcode",
        unique=True,
    )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
