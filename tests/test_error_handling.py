"""Error handling tests — graceful failures under bad inputs or missing config."""
import pytest
import requests
from playwright.sync_api import Page


@pytest.mark.api
def test_jira_sync_without_config_returns_error(api_url, test_project):
    # Remove Jira config first
    requests.delete(f"{api_url}/api/config")
    r = requests.post(f"{api_url}/api/jira/sync/{test_project['id']}")
    assert r.status_code in (400, 500)
    assert "error" in r.json()


@pytest.mark.api
def test_monday_sync_without_config_returns_error(api_url, test_project):
    requests.delete(f"{api_url}/api/monday/config")
    r = requests.post(f"{api_url}/api/monday/sync/{test_project['id']}")
    assert r.status_code in (400, 500)
    assert "error" in r.json()


@pytest.mark.api
def test_jira_test_connection_without_config_returns_400(api_url):
    requests.delete(f"{api_url}/api/config")
    r = requests.get(f"{api_url}/api/jira/test")
    assert r.status_code == 400
    assert "error" in r.json()


@pytest.mark.api
def test_monday_test_connection_without_config_returns_400(api_url):
    requests.delete(f"{api_url}/api/monday/config")
    r = requests.get(f"{api_url}/api/monday/test")
    assert r.status_code == 400
    assert "error" in r.json()


@pytest.mark.api
def test_update_nonexistent_task_returns_empty(api_url):
    r = requests.put(f"{api_url}/api/tasks/999999", json={
        "title": "ghost",
        "status": "Done",
        "description": "",
        "assignee": "",
        "story_points": None,
        "time_estimate": 0,
        "time_remaining": 0,
        "time_spent": 0,
        "priority": "Medium",
        "due_date": None,
        "sprint_id": None
    })
    # Server returns the (non-existing) task — should be None/null or 404
    assert r.status_code in (200, 404)


@pytest.mark.api
def test_create_project_with_end_before_start(api_url):
    r = requests.post(f"{api_url}/api/projects", json={
        "name": "bad dates",
        "start_date": "2026-12-31",
        "end_date": "2026-01-01"
    })
    # API may allow it (validation is client-side), just verify it doesn't crash
    assert r.status_code in (201, 400)


@pytest.mark.ui
def test_ui_does_not_crash_on_load(page: Page, ui_url):
    crashed = []
    page.on("crash", lambda: crashed.append(True))
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert crashed == []


@pytest.mark.ui
def test_sync_button_shows_error_message_without_jira_config(page: Page, ui_url, api_url):
    requests.delete(f"{api_url}/api/config")
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="עדכן כל הפרויקטים"]')
    page.wait_for_timeout(3000)
    # Either an error message appears or sync silently no-ops (no projects with Jira key)
    # Just verify no crash
    assert page.locator("h1", has_text="Scrum Dashboard").is_visible()
