"""API contract tests — endpoints return correct shapes and status codes."""
import pytest
import requests

TODAY = "2026-01-01"
FUTURE = "2026-12-31"


@pytest.mark.api
class TestProjects:
    def test_get_projects_returns_list(self, api_url):
        r = requests.get(f"{api_url}/api/projects")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_project_returns_201(self, api_url):
        payload = {"name": "__api_test__", "start_date": TODAY, "end_date": FUTURE}
        r = requests.post(f"{api_url}/api/projects", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "__api_test__"
        assert "id" in data
        requests.delete(f"{api_url}/api/projects/{data['id']}")

    def test_create_project_missing_name_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/projects", json={"start_date": TODAY, "end_date": FUTURE})
        assert r.status_code == 400

    def test_create_project_missing_dates_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/projects", json={"name": "no dates"})
        assert r.status_code == 400

    def test_get_project_by_id(self, api_url, test_project):
        r = requests.get(f"{api_url}/api/projects/{test_project['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == test_project["id"]

    def test_get_nonexistent_project_returns_404(self, api_url):
        r = requests.get(f"{api_url}/api/projects/999999")
        assert r.status_code == 404

    def test_delete_project_returns_success(self, api_url):
        r = requests.post(f"{api_url}/api/projects", json={"name": "__del_test__", "start_date": TODAY, "end_date": FUTURE})
        pid = r.json()["id"]
        r = requests.delete(f"{api_url}/api/projects/{pid}")
        assert r.status_code == 200
        assert r.json().get("success") is True

    def test_deleted_project_not_found(self, api_url):
        r = requests.post(f"{api_url}/api/projects", json={"name": "__del2__", "start_date": TODAY, "end_date": FUTURE})
        pid = r.json()["id"]
        requests.delete(f"{api_url}/api/projects/{pid}")
        r = requests.get(f"{api_url}/api/projects/{pid}")
        assert r.status_code == 404


@pytest.mark.api
class TestTasks:
    def test_create_task_returns_201(self, api_url, test_project):
        payload = {"project_id": test_project["id"], "title": "__task_api__", "status": "To Do"}
        r = requests.post(f"{api_url}/api/tasks", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "__task_api__"
        assert "id" in data
        requests.delete(f"{api_url}/api/tasks/{data['id']}")

    def test_create_task_missing_project_id_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/tasks", json={"title": "orphan"})
        assert r.status_code == 400

    def test_create_task_missing_title_returns_400(self, api_url, test_project):
        r = requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"]})
        assert r.status_code == 400

    def test_get_tasks_for_project(self, api_url, test_task, test_project):
        r = requests.get(f"{api_url}/api/tasks/project/{test_project['id']}")
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert test_task["id"] in ids

    def test_update_task_status(self, api_url, test_task):
        updated = {**test_task, "status": "In Progress"}
        r = requests.put(f"{api_url}/api/tasks/{test_task['id']}", json=updated)
        assert r.status_code == 200
        assert r.json()["status"] == "In Progress"

    def test_update_task_title(self, api_url, test_task):
        updated = {**test_task, "title": "updated title"}
        r = requests.put(f"{api_url}/api/tasks/{test_task['id']}", json=updated)
        assert r.status_code == 200
        assert r.json()["title"] == "updated title"

    def test_update_task_all_statuses(self, api_url, test_task):
        for status in ["In Progress", "In Review", "Testing", "Blocked", "Done", "To Do"]:
            updated = {**test_task, "status": status}
            r = requests.put(f"{api_url}/api/tasks/{test_task['id']}", json=updated)
            assert r.status_code == 200
            assert r.json()["status"] == status

    def test_delete_task_returns_success(self, api_url, test_project):
        r = requests.post(f"{api_url}/api/tasks", json={"project_id": test_project["id"], "title": "__del_task__", "status": "To Do"})
        tid = r.json()["id"]
        r = requests.delete(f"{api_url}/api/tasks/{tid}")
        assert r.status_code == 200
        assert r.json().get("success") is True


@pytest.mark.api
class TestConfig:
    def test_get_jira_config_returns_200(self, api_url):
        r = requests.get(f"{api_url}/api/config")
        assert r.status_code == 200

    def test_save_jira_config_missing_url_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/config", json={"email": "a@b.com", "api_token": "tok"})
        assert r.status_code == 400

    def test_save_jira_config_missing_email_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/config", json={"base_url": "https://x.atlassian.net", "api_token": "tok"})
        assert r.status_code == 400

    def test_get_monday_config_returns_200(self, api_url):
        r = requests.get(f"{api_url}/api/monday/config")
        assert r.status_code == 200

    def test_save_monday_config_missing_token_returns_400(self, api_url):
        r = requests.post(f"{api_url}/api/monday/config", json={})
        assert r.status_code == 400
