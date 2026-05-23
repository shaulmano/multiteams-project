"""Smoke tests — app is up and reachable."""
import pytest
import requests
from playwright.sync_api import Page


@pytest.mark.smoke
def test_api_reachable(api_url):
    r = requests.get(f"{api_url}/api/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.smoke
def test_api_projects_endpoint_structure(api_url):
    r = requests.get(f"{api_url}/api/projects")
    data = r.json()
    if data:
        project = data[0]
        assert "id" in project
        assert "name" in project
        assert "status" in project


@pytest.mark.smoke
def test_api_monday_config_endpoint(api_url):
    r = requests.get(f"{api_url}/api/monday/config")
    assert r.status_code == 200


@pytest.mark.smoke
def test_api_jira_config_endpoint(api_url):
    r = requests.get(f"{api_url}/api/config")
    assert r.status_code == 200


@pytest.mark.smoke
def test_ui_loads(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert "Scrum Dashboard" in page.title() or page.locator("h1").text_content() == "Scrum Dashboard"


@pytest.mark.smoke
def test_ui_header_visible(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert page.locator("h1", has_text="Scrum Dashboard").is_visible()


@pytest.mark.smoke
def test_ui_no_critical_js_errors(page: Page, ui_url):
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert errors == [], f"JS errors on load: {errors}"


@pytest.mark.smoke
def test_ui_settings_button_visible(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert page.locator('button[title="הגדרות"]').is_visible()


@pytest.mark.smoke
def test_ui_new_project_button_visible(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    assert page.get_by_text("פרויקט חדש").first.is_visible()
