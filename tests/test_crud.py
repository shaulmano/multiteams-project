"""CRUD tests — create, update, delete via the UI."""
import pytest
import requests
from playwright.sync_api import Page


@pytest.mark.ui
def test_create_project_via_ui(page: Page, ui_url, api_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")

    page.get_by_text("פרויקט חדש").first.click()
    page.wait_for_selector('input[placeholder*="CRM"]', timeout=3000)

    page.fill('input[placeholder*="CRM"]', "UI Test Project")
    page.get_by_text("צור פרויקט").click()
    page.wait_for_load_state("networkidle")

    # Verify it appears in the dashboard
    page.wait_for_selector("text=UI Test Project", timeout=5000)
    assert page.get_by_text("UI Test Project").is_visible()

    # Cleanup via API
    r = requests.get(f"{api_url}/api/projects")
    projects = r.json()
    for p in projects:
        if p["name"] == "UI Test Project":
            requests.delete(f"{api_url}/api/projects/{p['id']}")
            break


@pytest.mark.ui
def test_create_project_requires_name(page: Page, ui_url):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")

    page.get_by_text("פרויקט חדש").first.click()
    page.wait_for_selector("text=צור פרויקט", timeout=3000)
    page.get_by_text("צור פרויקט").click()

    # Should show validation error, not close modal
    page.wait_for_selector("text=שם הפרויקט", timeout=2000)
    assert page.get_by_text("שם הפרויקט").is_visible()


@pytest.mark.ui
def test_add_task_via_ui(page: Page, ui_url, test_project):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")

    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=משימה חדשה", timeout=4000)

    page.get_by_text("משימה חדשה").click()
    page.wait_for_selector('input[placeholder*="כותרת"]', timeout=3000)

    page.fill('input[placeholder*="כותרת"]', "UI Created Task")
    page.get_by_text("הוסף").click()
    page.wait_for_load_state("networkidle")

    page.wait_for_selector("text=UI Created Task", timeout=5000)
    assert page.get_by_text("UI Created Task").is_visible()


@pytest.mark.ui
def test_change_task_status_via_ui(page: Page, ui_url, test_task, test_project):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")

    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector(f"text={test_task['title']}", timeout=4000)

    # Find the status select for this task
    task_row = page.locator("div").filter(has_text=test_task["title"]).last
    status_select = task_row.locator("select").last
    status_select.select_option("In Progress")
    page.wait_for_load_state("networkidle")

    # Verify via API that status was actually saved
    import requests as req
    r = req.get(f"{page.url.split(':5173')[0]}:3001/api/tasks/project/{test_project['id']}")
    tasks = r.json()
    updated = next((t for t in tasks if t["id"] == test_task["id"]), None)
    assert updated is not None
    assert updated["status"] == "In Progress"


@pytest.mark.ui
def test_delete_task_via_ui(page: Page, ui_url, test_project, api_url):
    # Create a task to delete
    r = requests.post(f"{api_url}/api/tasks", json={
        "project_id": test_project["id"],
        "title": "__delete_me__",
        "status": "To Do",
    })
    r.raise_for_status()

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=__delete_me__", timeout=4000)

    # Click the delete button (trash icon) next to the task
    task_row = page.locator("div").filter(has_text="__delete_me__").last
    task_row.locator("button").last.click()

    # Confirm the dialog
    page.on("dialog", lambda d: d.accept())
    page.wait_for_timeout(1000)
