"""Load SMS bank templates from sms_templates.yaml."""

from pathlib import Path

import yaml

from services.template_engine import parse_template

TEMPLATES_PATH = Path(__file__).parent / "sms_templates.yaml"


def load_templates() -> dict[str, list[dict]]:
    """Read sms_templates.yaml and return a BANK_SENDER_MAP dict."""
    with open(TEMPLATES_PATH) as f:
        raw = yaml.safe_load(f)

    bank_sender_map: dict[str, list[dict]] = {}
    for sender_key, config in raw.items():
        patterns = []
        for tmpl in config["templates"]:
            patterns.append({
                "template": parse_template(tmpl["pattern"]),
                "direction": tmpl["direction"],
                "bank": config["bank"],
            })
        bank_sender_map[sender_key] = patterns

    return bank_sender_map
