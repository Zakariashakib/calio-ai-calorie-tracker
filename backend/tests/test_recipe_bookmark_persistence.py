"""Regression tests: bookmarked AI-generated recipes must survive a fresh
batch replacing the old one (Task #23).

AI-generated recipes have ids prefixed with ``ai-``; curated catalog recipes
use human-readable slugs. When the generated batch is refreshed the old
documents are replaced, so bookmarked AI recipes must be preserved separately
or their detail page 404s and they vanish from the saved-only listing.
"""

import pytest


def _first_ai_recipe(recipes: list) -> dict | None:
    return next((r for r in recipes if str(r.get("id", "")).startswith("ai-")), None)


class TestRecipeBookmarkPersistence:
    def _generate(self, api_client, base_url, refresh: bool):
        resp = api_client.post(
            f"{base_url}/api/recipes/generate",
            params={"refresh": "true" if refresh else "false"},
        )
        assert resp.status_code == 200, resp.text
        return resp.json()["recipes"]

    def test_bookmarked_ai_recipe_survives_batch_refresh(self, api_client, base_url):
        recipes = self._generate(api_client, base_url, refresh=True)
        ai_recipe = _first_ai_recipe(recipes)
        if not ai_recipe:
            pytest.skip("No AI-generated recipes available (no AI key configured)")

        recipe_id = ai_recipe["id"]

        # Bookmark the AI recipe.
        bm = api_client.post(
            f"{base_url}/api/recipes/bookmark",
            json={"recipe_id": recipe_id, "saved": True},
        )
        assert bm.status_code == 200, bm.text
        assert bm.json()["saved"] is True

        # Force a brand-new batch that replaces the old generated set.
        self._generate(api_client, base_url, refresh=True)

        # Detail page must still resolve.
        detail = api_client.get(f"{base_url}/api/recipes/{recipe_id}")
        assert detail.status_code == 200, detail.text
        assert detail.json()["id"] == recipe_id
        assert detail.json()["saved"] is True

        # Saved-only listing must still include it.
        saved_list = api_client.get(
            f"{base_url}/api/recipes", params={"saved_only": "true"}
        )
        assert saved_list.status_code == 200, saved_list.text
        ids = {r["id"] for r in saved_list.json()["recipes"]}
        assert recipe_id in ids

        # Un-bookmarking removes it from the saved listing again.
        un = api_client.post(
            f"{base_url}/api/recipes/bookmark",
            json={"recipe_id": recipe_id, "saved": False},
        )
        assert un.status_code == 200, un.text

        saved_list_after = api_client.get(
            f"{base_url}/api/recipes", params={"saved_only": "true"}
        )
        assert saved_list_after.status_code == 200
        ids_after = {r["id"] for r in saved_list_after.json()["recipes"]}
        assert recipe_id not in ids_after
