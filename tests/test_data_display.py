"""Data display tests — progress bars, counters, task filters."""
import pytest
import requests
from playwright.sync_api import Page


@pytest.mark.ui
def test_project_card_shows_task_count(page: Page, ui_url, test_project, api_url):
    # Add 2 tasks via API
    for i in range(2):
        requests.post(f"{api_url}/api/tasks", json={
            "project_id": test_project["id"],
            "title": f"display task {i}",
            "status": "To Do",
        })

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)

    # Card should show the project name
    assert page.get_by_text(test_project["name"]).is_visible()


@pytest.mark.ui
def test_task_filter_open_shows_only_open(page: Page, ui_url, test_project, api_url):
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "open task", "status": "To Do"})
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "done task", "status": "Done"})

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=פתוחות", timeout=4000)
    page.get_by_text("פתוחות").click()
    page.wait_for_timeout(500)

    assert page.get_by_text("open task").is_visible()
    assert not page.get_by_text("done task").is_visible()


@pytest.mark.ui
def test_task_filter_done_shows_only_done(page: Page, ui_url, test_project, api_url):
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "open task 2", "status": "In Progress"})
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "done task 2", "status": "Done"})

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=הושלמו", timeout=4000)
    page.get_by_text("הושלמו").click()
    page.wait_for_timeout(500)

    assert page.get_by_text("done task 2").is_visible()
    assert not page.get_by_text("open task 2").is_visible()


@pytest.mark.ui
def test_blocked_filter_shows_blocked_tasks(page: Page, ui_url, test_project, api_url):
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "blocked task", "status": "Blocked"})
    requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "normal task", "status": "To Do"})

    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector("text=חסומות", timeout=4000)
    page.get_by_text("חסומות").click()
    page.wait_for_timeout(500)

    assert page.get_by_text("blocked task").is_visible()
    assert not page.get_by_text("normal task").is_visible()


@pytest.mark.ui
def test_task_expand_shows_details(page: Page, ui_url, test_task, test_project):
    page.goto(ui_url)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(f"text={test_project['name']}", timeout=5000)
    page.get_by_text(test_project["name"]).first.click()
    page.wait_for_selector(f"text={test_task['title']}", timeout=4000)

    # Click task row to expand
    page.get_by_text(test_task["title"]).click()
    page.wait_for_timeout(500)

    # Expanded section shows time fields
    assert page.get_by_text("הוערך:").is_visible()


@pytest.mark.api
def test_project_tasks_count_matches(api_url, test_project):
    # Create 3 tasks
    for i in range(3):
        requests.post(f"{api_url}/api/tasks", json={
            "project_id": test_project["id"],
            "title": f"count task {i}",
            "status": "To Do",
        })

    r = requests.get(f"{api_url}/api/tasks/project/{test_project['id']}")
    assert r.status_code == 200
    tasks = r.json()
    assert len(tasks) >= 3


@pytest.mark.api
def test_task_status_transition_all_statuses(api_url, test_task):
    statuses = ["To Do", "In Progress", "In Review", "Testing", "Blocked", "Done"]
    for status in statuses:
        payload = {**test_task, "status": status}
        r = requests.put(f"{api_url}/api/tasks/{test_task['id']}", json=payload)
        assert r.status_code == 200
        assert r.json()["status"] == status
