import os

import pytest
import requests


@pytest.fixture(scope="session")
def base_url() -> str:
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
    if not url:
        pytest.skip("EXPO_PUBLIC_BACKEND_URL/EXPO_BACKEND_URL is not set")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def auth_token() -> str:
    token = os.environ.get("CALSNAP_TEST_BEARER_TOKEN", "calsnap-test-token-2026")
    if not token:
        pytest.skip("CALSNAP_TEST_BEARER_TOKEN is not set")
    return token


@pytest.fixture()
def api_client(auth_token: str):
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }
    )
    return session
