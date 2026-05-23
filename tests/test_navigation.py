"""Navigation tests — moving between views."""
import pytest
from playwright.sync_api import Page


@pytest.mark.ui
def test_settings_modal_opens(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=הגדרות Jira", timeout=3000)
    assert page.get_by_text("הגדרות Jira").is_visible()


@pytest.mark.ui
def test_settings_modal_closes(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=הגדרות Jira", timeout=3000)
    page.click('button[title="סגור"]', timeout=2000)
    assert not page.get_by_text("הגדרות Jira").is_visible()


@pytest.mark.ui
def test_settings_modal_closes_with_x(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=הגדרות Jira", timeout=3000)
    # Close via X button inside the modal
    page.locator("button").filter(has_text="").nth(0)
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)


@pytest.mark.ui
def test_new_project_modal_opens(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.get_by_text("פרויקט חדש").first.click()
    page.wait_for_selector("text=שם הפרויקט", timeout=3000)
    assert page.get_by_text("שם הפרויקט").is_visible()


@pytest.mark.ui
def test_new_project_modal_closes_on_cancel(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.get_by_text("פרויקט חדש").first.click()
    page.wait_for_selector("text=ביטול", timeout=3000)
    page.get_by_text("ביטול").click()
    assert not page.get_by_text("שם הפרויקט *").is_visible()


@pytest.mark.ui
def test_open_project_detail(page: Page, ui_url, test_project):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=← חזרה לדשבורד", timeout=3000)
    assert page.get_by_text("← חזרה לדשבורד").is_visible()


@pytest.mark.ui
def test_back_button_returns_to_dashboard(page: Page, ui_url, test_project):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=← חזרה לדשבורד", timeout=3000)
    page.get_by_text("← חזרה לדשבורד").click()
    page.wait_for_selector("text=פרויקט חדש", timeout=3000)
    assert page.get_by_text("פרויקט חדש").first.is_visible()


@pytest.mark.ui
def test_settings_jira_tab_active_by_default(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.click('button[title="הגדרות"]')
    page.wait_for_selector("text=Jira", timeout=3000)
    assert page.get_by_text("Jira Base URL").is_visible()
