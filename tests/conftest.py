import pytest
import requests

UI_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"


@pytest.fixture(scope="session")
def api_url():
    return API_URL


@pytest.fixture(scope="session")
def ui_url():
    return UI_URL


@pytest.fixture(scope="session", autouse=True)
def ensure_app_running(api_url):
    try:
        r = requests.get(f"{api_url}/api/projects", timeout=5)
        r.raise_for_status()
    except Exception:
        pytest.skip(f"App not running on {api_url} — run start.bat first")


@pytest.fixture
def test_project(api_url):
    payload = {
        "name": "__test_auto__",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
    }
    r = requests.post(f"{api_url}/api/projects", json=payload)
    r.raise_for_status()
    project = r.json()
    yield project
    requests.delete(f"{api_url}/api/projects/{project['id']}")


@pytest.fixture
def test_task(test_project, api_url):
    payload = {
        "project_id": test_project["id"],
        "title": "__test_task__",
        "status": "To Do",
        "priority": "Medium",
    }
    r = requests.post(f"{api_url}/api/tasks", json=payload)
    r.raise_for_status()
    task = r.json()
    yield task
    requests.delete(f"{api_url}/api/tasks/{task['id']}")
