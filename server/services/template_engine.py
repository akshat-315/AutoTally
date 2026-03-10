import re

PLACEHOLDER_PATTERNS = {
    "amount": r"(?P<amount>[\d,]+(?:\.\d{1,2})?)",
    "merchant": r"(?P<merchant>.+?)",
    "date": r"(?P<date>[\w/\-\.]+(?:\s\w+\s\d{4})?)",
    "vpa": r"(?P<vpa>\S+)",
    "upi_ref": r"(?P<upi_ref>\w+)",
    "last4": r"(?P<last4>\w+)",
}


def compile_template(template: str) -> re.Pattern:
    """Convert a bank SMS template into a compiled regex pattern."""
    # Normalize whitespace
    template = " ".join(template.split())
    # Escape for regex safety
    escaped = re.escape(template)
    # Replace escaped placeholders with capture groups
    for name, pattern in PLACEHOLDER_PATTERNS.items():
        escaped_placeholder = re.escape("{" + name + "}")
        escaped = escaped.replace(escaped_placeholder, pattern)
    # Flexible whitespace
    escaped = escaped.replace(r"\ ", r"\s+")
    return re.compile(escaped, re.DOTALL | re.IGNORECASE)
