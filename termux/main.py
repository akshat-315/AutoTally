#!/usr/bin/env python3
"""Fetch SMS from Termux and forward to AutoTally server."""

import bisect
import json
import subprocess
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
QUEUE_DIR = Path.home() / ".autotally"
QUEUE_PATH = QUEUE_DIR / "queue.json"


def load_config():
    if not CONFIG_PATH.exists():
        print(f"Error: config.json not found at {CONFIG_PATH}")
        print("Copy config.example.json to config.json and fill in your values.")
        sys.exit(1)
    with open(CONFIG_PATH) as f:
        return json.load(f)


def fetch_sms(limit):
    try:
        result = subprocess.run(
            ["termux-sms-list", "-l", str(limit)],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        print("Error: termux-sms-list not found. Install termux-api:")
        print("  pkg install termux-api")
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("Error: termux-sms-list timed out after 30s")
        sys.exit(1)

    if result.returncode != 0:
        print(f"Error: termux-sms-list failed (exit {result.returncode})")
        if result.stderr:
            print(result.stderr)
        sys.exit(1)

    return json.loads(result.stdout)


def map_sms(sms_list):
    return [
        {
            "_id": sms["_id"],
            "address": sms["number"],
            "received": sms["received"],
            "body": sms["body"],
        }
        for sms in sms_list
    ]


def _load_queue() -> list[dict]:
    """Load queued SMS payloads from disk."""
    if not QUEUE_PATH.exists():
        return []
    try:
        with open(QUEUE_PATH) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_queue(queue: list[dict]) -> None:
    """Save SMS payloads to the offline queue."""
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    with open(QUEUE_PATH, "w") as f:
        json.dump(queue, f)


def _clear_queue() -> None:
    """Remove the queue file."""
    if QUEUE_PATH.exists():
        QUEUE_PATH.unlink()


def forward_to_server(server_url, payload) -> dict | None:
    """POST payload to server. Returns response dict on success, None on failure."""
    url = f"{server_url.rstrip('/')}/api/v1/sms/ingest"
    try:
        resp = requests.post(url, json=payload, timeout=15)
    except (requests.ConnectionError, requests.Timeout) as e:
        print(f"Error: could not reach {url}: {e}")
        return None

    if not resp.ok:
        print(f"Error: server returned {resp.status_code}")
        print(resp.text)
        return None

    return resp.json()


def flush_queue(server_url) -> None:
    """Try to send any queued SMS to the server."""
    queue = _load_queue()
    if not queue:
        return

    print(f"Flushing {len(queue)} queued SMS...")
    result = forward_to_server(server_url, queue)
    if result is not None:
        print(f"Queue flush response: {json.dumps(result, indent=2)}")
        _clear_queue()
    else:
        print("Queue flush failed, will retry next run.")


def main():
    config = load_config()
    server_url = config["server_url"]
    limit = config.get("limit", 100)
    last_sms_id = config.get("last_sms_id", 0)

    # Try to flush any previously queued SMS first
    flush_queue(server_url)

    sms_list = fetch_sms(limit)
    print(f"Fetched {len(sms_list)} SMS from Termux")

    sms_list.sort(key=lambda s: s["_id"])
    ids = [sms["_id"] for sms in sms_list]
    cutoff = bisect.bisect_right(ids, last_sms_id)
    new_sms = sms_list[cutoff:]

    payload = map_sms(new_sms)

    if not payload:
        print("Nothing to forward.")
        return

    result = forward_to_server(server_url, payload)
    if result is not None:
        print(f"Server response: {json.dumps(result, indent=2)}")
    else:
        # Server unreachable — save to offline queue
        existing_queue = _load_queue()
        existing_ids = {item["_id"] for item in existing_queue}
        new_items = [item for item in payload if item["_id"] not in existing_ids]
        if new_items:
            _save_queue(existing_queue + new_items)
            print(f"Saved {len(new_items)} SMS to offline queue at {QUEUE_PATH}")


if __name__ == "__main__":
    main()
