import re


def compile_template(template: str) -> re.Pattern:
    """Convert an SMS template with {placeholders} into a compiled regex with named groups.

    Example:
        template = "Rs.{amount} credited to {bank} A/c XX{last4}"
        Becomes a regex matching those literal parts with named capture groups.
    """
    # Escape the template for regex, then replace escaped placeholders
    # First, find all {placeholder} names before escaping
    placeholders = re.findall(r"\{(\w+)\}", template)

    # Escape the whole template for regex special chars
    escaped = re.escape(template)

    # Replace each escaped placeholder \{name\} with a named capture group
    # Last placeholder uses [^\n]+ (greedy, single line) so it captures to end-of-line
    # without overshooting into trailing SMS content
    for i, name in enumerate(placeholders):
        escaped_placeholder = re.escape("{" + name + "}")
        quantifier = ".+?" if i < len(placeholders) - 1 else "[^\\n]+"
        escaped = escaped.replace(escaped_placeholder, f"(?P<{name}>{quantifier})", 1)

    return re.compile(escaped, re.DOTALL)
