"""Settings tests — Jira and Monday.com configuration forms."""
import pytest
from playwright.sync_api import Page


@pytest.mark.ui
def test_settings_jira_tab_visible(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=Jira Base URL", timeout=3000)
    assert page.get_by_text("Jira Base URL").is_visible()


@pytest.mark.ui
def test_settings_monday_tab_switches(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=Monday.com", timeout=3000)
    page.get_by_text("Monday.com").first.click()
    page.wait_for_selector("text=API Token", timeout=3000)
    assert page.get_by_text("API Token").is_visible()


@pytest.mark.ui
def test_settings_jira_empty_submit_shows_error(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=שמור הגדרות", timeout=3000)

    # Clear any existing values and submit empty form
    page.fill('input[placeholder*="https://"]', "")
    page.get_by_text("שמור הגדרות").click()
    page.wait_for_timeout(500)

    # Should show validation error
    assert page.get_by_text("URL ואימייל הם שדות חובה").is_visible()


@pytest.mark.ui
def test_settings_jira_valid_submit_accepted(page: Page, ui_url, api_url):
    import requests
    # Save via API directly to verify the endpoint works
    r = requests.post(f"{api_url}/api/config", json={
        "base_url": "https://test.atlassian.net",
        "email": "test@test.com",
        "api_token": "test-token-123"
    })
    assert r.status_code == 200
    data = r.json()
    assert data.get("email") == "test@test.com"
    # Cleanup
    requests.delete(f"{api_url}/api/config")


@pytest.mark.ui
def test_settings_monday_valid_save(page: Page, ui_url, api_url):
    import requests
    r = requests.post(f"{api_url}/api/monday/config", json={"api_token": "test-monday-token"})
    assert r.status_code == 200
    # Cleanup
    requests.delete(f"{api_url}/api/monday/config")


@pytest.mark.ui
def test_settings_jira_url_in_form_when_configured(page: Page, ui_url, api_url):
    import requests
    # Set config first
    requests.post(f"{api_url}/api/config", json={
        "base_url": "https://testconfig.atlassian.net",
        "email": "config@test.com",
        "api_token": "tok"
    })

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector('input[placeholder*="https://"]', timeout=3000)

    url_input = page.locator('input[placeholder*="https://"]')
    assert "testconfig.atlassian.net" in url_input.input_value()

    # Cleanup
    requests.delete(f"{api_url}/api/config")
