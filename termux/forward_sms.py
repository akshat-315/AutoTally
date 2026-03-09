#!/usr/bin/env python3
"""Fetch SMS from Termux and forward to AutoTally server."""

import json
import subprocess
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"


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


def filter_and_map(sms_list, addresses):
    addresses_lower = [a.lower() for a in addresses]
    filtered = []
    for sms in sms_list:
        number = sms.get("number", "").lower()
        if any(addr in number for addr in addresses_lower):
            filtered.append({
                "_id": sms["_id"],
                "address": sms["number"],
                "received": sms["received"],
                "body": sms["body"],
            })
    return filtered


def forward_to_server(server_url, payload):
    url = f"{server_url.rstrip('/')}/api/v1/sms/ingest"
    try:
        resp = requests.post(url, json=payload, timeout=15)
    except requests.ConnectionError:
        print(f"Error: could not connect to {url}")
        sys.exit(1)
    except requests.Timeout:
        print(f"Error: request to {url} timed out")
        sys.exit(1)

    if not resp.ok:
        print(f"Error: server returned {resp.status_code}")
        print(resp.text)
        sys.exit(1)

    return resp.json()


def main():
    config = load_config()
    server_url = config["server_url"]
    addresses = config["addresses"]
    limit = config.get("limit", 100)

    sms_list = fetch_sms(limit)
    print(f"Fetched {len(sms_list)} SMS from Termux")

    payload = filter_and_map(sms_list, addresses)
    print(f"Filtered to {len(payload)} SMS matching {addresses}")

    if not payload:
        print("Nothing to forward.")
        return

    result = forward_to_server(server_url, payload)
    print(f"Server response: {json.dumps(result, indent=2)}")


if __name__ == "__main__":
    main()
