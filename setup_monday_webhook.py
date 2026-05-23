"""
הגדרת Monday Webhook אוטומטית
הרץ: python setup_monday_webhook.py
"""
import requests

MONDAY_API = "https://api.monday.com/v2"

print("=== הגדרת Monday Webhook ===\n")
api_token = input("Monday API Token: ").strip()
board_id   = input("Board ID (לדוג' 18413019779): ").strip()
tunnel_url = input("Cloudflare URL (לדוג' https://xxx.trycloudflare.com): ").strip().rstrip("/")

webhook_url = f"{tunnel_url}/api/monday/webhook"

headers = {
    "Authorization": f"Bearer {api_token}",
    "Content-Type": "application/json",
    "API-Version": "2024-01",
}

events = ["change_status_column_value", "create_item", "change_column_value"]
created = []

for event in events:
    query = f"""
    mutation {{
      create_webhook(
        board_id: {board_id},
        url: "{webhook_url}",
        event: {event}
      ) {{ id board_id }}
    }}
    """
    r = requests.post(MONDAY_API, json={"query": query}, headers=headers)
    data = r.json()
    if "errors" in data:
        print(f"  ✗ {event}: {data['errors'][0]['message']}")
    else:
        wid = data.get("data", {}).get("create_webhook", {}).get("id")
        print(f"  ✓ {event} — webhook ID: {wid}")
        created.append(wid)

print(f"\n{'הוגדרו' if created else 'נכשל'} {len(created)}/{len(events)} webhooks")
print(f"URL: {webhook_url}")
input("\nלחץ Enter לסיום...")
