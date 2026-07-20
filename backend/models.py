from datetime import date, datetime, timezone
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    onboarding_complete: bool = False


class AuthSessionRequest(BaseModel):
    session_id: str = Field(min_length=8)


class ProfileInput(BaseModel):
    gender: Literal["female", "male", "other"]
    # Age may be sent directly (legacy clients) or derived from date_of_birth.
    age: Optional[int] = Field(default=None, ge=13, le=100)
    date_of_birth: Optional[str] = None  # ISO date, e.g. "1998-06-15"
    name: Optional[str] = Field(default=None, max_length=80)
    preferred_unit: Literal["metric", "imperial"] = "metric"
    # Height/weight are always stored in canonical metric units; imperial
    # display/entry is converted by the client before submit.
    height_cm: float = Field(ge=100, le=250)
    weight_kg: float = Field(ge=30, le=350)
    activity_level: Literal[
        "sedentary",
        "light",
        "moderate",
        "active",
        "very_active",
    ]
    goal: Literal["lose", "maintain", "gain"]
    target_weight_kg: float = Field(ge=30, le=350)

    @field_validator("name")
    @classmethod
    def clean_name(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("date_of_birth")
    @classmethod
    def check_date_of_birth(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                "date_of_birth must be an ISO date (YYYY-MM-DD)"
            ) from exc
        if parsed > date.today():
            raise ValueError(
                "date_of_birth cannot be in the future"
            )
        return value

    @model_validator(mode="after")
    def resolve_age(self) -> "ProfileInput":
        if self.date_of_birth:
            born = date.fromisoformat(self.date_of_birth)
            today = date.today()
            derived = (
                today.year
                - born.year
                - (
                    (today.month, today.day)
                    < (born.month, born.day)
                )
            )
            if not 13 <= derived <= 100:
                raise ValueError(
                    "Age must be between 13 and 100 years"
                )
            self.age = derived
        if self.age is None:
            raise ValueError(
                "Either age or date_of_birth is required"
            )
        return self


class Goals(BaseModel):
    bmr: int
    tdee: int
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    water_ml: int


class ProfileResponse(ProfileInput):
    goals: Goals


class Nutrients(BaseModel):
    calories: float = Field(default=0, ge=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    fiber_g: float = Field(default=0, ge=0)
    sugar_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)


class MealItem(Nutrients):
    item_id: str = Field(
        default_factory=lambda: f"item_{uuid4().hex[:10]}"
    )
    name: str = Field(min_length=1, max_length=100)
    estimated_weight_g: float = Field(default=100, ge=0, le=5000)
    portion: str = Field(default="1 serving", max_length=80)
    confidence: float = Field(default=1, ge=0, le=1)


class MealCreate(BaseModel):
    meal_type: Literal["Breakfast", "Lunch", "Dinner", "Snack"]
    title: str = Field(min_length=1, max_length=120)
    eaten_at: str = Field(default_factory=now_iso)
    items: list[MealItem] = Field(min_length=1)
    image_base64: Optional[str] = None
    source: Literal[
        "camera",
        "barcode",
        "voice",
        "manual",
        "history",
    ] = "manual"
    note: str = Field(default="", max_length=300)

    @field_validator("image_base64")
    @classmethod
    def validate_image(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value and len(value) > 9_000_000:
            raise ValueError("Image is too large")
        return value


class MealResponse(MealCreate):
    meal_id: str
    image_key: Optional[str] = None
    photo_url: Optional[str] = None
    thumbnail_base64: Optional[str] = None
    user_id: str
    totals: Nutrients
    created_at: str


class ScanRequest(BaseModel):
    image_base64: str = Field(min_length=100)
    mime_type: Literal[
        "image/jpeg",
        "image/png",
        "image/webp",
    ] = "image/jpeg"
    mode: Literal[
        "meal",
        "restaurant",
        "before",
        "after",
    ] = "meal"
    previous_scan_id: Optional[str] = None


class ScanResponse(BaseModel):
    scan_id: str
    meal_name: str
    total_weight_g: float
    foods: list[MealItem]
    totals: Nutrients
    confidence: float
    warnings: list[str] = []
    guidance: str


class WaterInput(BaseModel):
    amount_ml: int = Field(ge=50, le=3000)
    logged_at: str = Field(default_factory=now_iso)


class WeightInput(BaseModel):
    weight_kg: float = Field(ge=30, le=350)
    logged_at: str = Field(default_factory=now_iso)


class FastingInput(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=0, le=23)
    enabled: bool = True


class ChatInput(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


class ChallengeInput(BaseModel):
    challenge_id: Literal[
        "healthy-7",
        "weight-loss-30",
        "water-14",
    ]


class ChallengeStatus(BaseModel):
    challenge_id: str
    joined_at: str
    progress: int           # days completed toward goal
    goal: int               # total days required
    streak: int             # current consecutive-day streak
    badge_earned: bool      # True once goal is reached
    completed_at: Optional[str] = None


class CompareScanRequest(BaseModel):
    before_image_base64: str = Field(min_length=100)
    after_image_base64: str = Field(min_length=100)
    mime_type: Literal[
        "image/jpeg",
        "image/png",
        "image/webp",
    ] = "image/jpeg"


class CompareResult(BaseModel):
    before: ScanResponse
    after: ScanResponse
    consumed: "Nutrients"
    consumed_weight_g: float
    confidence: float
    guidance: str


class BarcodeResponse(BaseModel):
    barcode: str
    product_name: str
    brand: Optional[str] = None
    serving_size: str = "100 g"
    nutrition_grade: Optional[str] = None
    item: MealItem


class RecipeSummary(BaseModel):
    id: str
    title: str
    minutes: int
    difficulty: int
    difficulty_label: str
    category: str
    image: str
    kcal: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: int
    saved: bool = False


class RecipeDetail(RecipeSummary):
    description: str
    ingredients: list[str]
    steps: list[str]


class RecipeListResponse(BaseModel):
    categories: list[dict]
    recipes: list[RecipeSummary]
    matched_to_goals: bool


class BookmarkInput(BaseModel):
    recipe_id: str
    saved: bool


class AIConfigSchema(BaseModel):
    active_provider: Literal["openrouter", "gemini"] = "gemini"
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    system_prompt: str = (
        "You are CalSnap, a careful nutrition analysis assistant.\n"
        "Estimates are informational, not medical advice.\n"
        "Never claim certainty from an image.\n"
        "Return only strict JSON with no markdown.\n"
        "Calories and nutrients must be realistic, internally consistent estimates."
    )
    temperature: float = Field(default=0.3, ge=0.0, le=1.0)
    auto_fallback: bool = True
    admin_pin: str = "calsnap2026"


class AIConfigPublic(BaseModel):
    active_provider: Literal["openrouter", "gemini"]
    openrouter_api_key_masked: str
    openrouter_model: str
    gemini_api_key_masked: str
    gemini_model: str
    system_prompt: str
    temperature: float
    auto_fallback: bool


class AIConfigUpdate(BaseModel):
    active_provider: Optional[Literal["openrouter", "gemini"]] = None
    openrouter_api_key: Optional[str] = None
    openrouter_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    auto_fallback: Optional[bool] = None
    admin_pin: Optional[str] = None


class AITestRequest(BaseModel):
    provider: Optional[Literal["openrouter", "gemini"]] = None
    model: Optional[str] = None
    prompt: str = "Estimate calories for 1 boiled egg and 1 slice of whole wheat bread."


class AITestResponse(BaseModel):
    success: bool
    provider: str
    model: str
    latency_ms: float
    result: str
    error: Optional[str] = None


class AILogEntry(BaseModel):
    log_id: str = Field(default_factory=lambda: f"log_{uuid4().hex[:12]}")
    timestamp: str = Field(default_factory=now_iso)
    provider: str
    model: str
    endpoint: str
    latency_ms: float
    status: str
    error_detail: Optional[str] = None

