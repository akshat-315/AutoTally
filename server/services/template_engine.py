import re
from dataclasses import dataclass

from rapidfuzz.fuzz import partial_ratio_alignment


@dataclass
class ParsedTemplate:
    segments: list[str]
    placeholders: list[str]


@dataclass
class MatchResult:
    groups: dict[str, str]
    confidence: float


def parse_template(template: str) -> ParsedTemplate:
    """Split a template string into alternating static segments and placeholder names.

    Example:
        "Rs.{amount} credited to A/c XX{last4} on {date}"
        -> segments:     ["Rs.", " credited to A/c XX", " on ", ""]
           placeholders: ["amount", "last4", "date"]
    """
    placeholders = re.findall(r"\{(\w+)\}", template)
    segments = re.split(r"\{\w+\}", template)
    return ParsedTemplate(segments=segments, placeholders=placeholders)


def _find_best_match(text: str, segment: str, start: int) -> tuple[int, int, float]:
    """Find the best fuzzy match for segment in text[start:].

    Returns (match_start, match_end, score) in coordinates relative to
    the full text string. Score is normalized 0.0–1.0.
    """
    remaining = text[start:]
    if not remaining:
        return (start, start, 0.0)

    result = partial_ratio_alignment(segment, remaining)
    if result is None:
        return (start, start, 0.0)

    # result.dest_start / dest_end are positions within `remaining`
    match_start = start + result.dest_start
    match_end = start + result.dest_end
    score = result.score / 100.0
    return (match_start, match_end, score)


def fuzzy_match(template: ParsedTemplate, text: str) -> MatchResult | None:
    """Match an SMS body against a parsed template using fuzzy string matching.

    Sequentially finds each static segment in the text, computes a weighted
    confidence score, and extracts placeholder values from the gaps.
    """
    segments = template.segments
    placeholders = template.placeholders

    # Filter to non-empty segments for scoring
    non_empty = [(i, seg) for i, seg in enumerate(segments) if seg.strip()]
    if not non_empty:
        return None

    # Track where each segment matched: list of (match_start, match_end)
    segment_positions: list[tuple[int, int]] = [(-1, -1)] * len(segments)
    scores: list[float] = [0.0] * len(segments)

    cursor = 0
    for i, seg in enumerate(segments):
        if not seg.strip():
            # Empty segment — anchor at cursor
            segment_positions[i] = (cursor, cursor)
            scores[i] = 1.0
            continue

        match_start, match_end, score = _find_best_match(text, seg, cursor)
        if score < 0.50:
            # Poor match — treat segment as not found, don't advance cursor
            segment_positions[i] = (cursor, cursor)
            scores[i] = score
        else:
            segment_positions[i] = (match_start, match_end)
            scores[i] = score
            cursor = match_end

    # Weighted average confidence (weight = segment length, empty segments excluded)
    total_weight = 0
    weighted_sum = 0.0
    for i, seg in enumerate(segments):
        if seg.strip():
            weight = len(seg)
            weighted_sum += scores[i] * weight
            total_weight += weight

    confidence = weighted_sum / total_weight if total_weight > 0 else 0.0

    # Extract placeholder values from gaps between consecutive segments
    groups: dict[str, str] = {}
    for j, name in enumerate(placeholders):
        gap_start = segment_positions[j][1]      # end of segment before placeholder
        gap_end = segment_positions[j + 1][0]     # start of segment after placeholder
        value = text[gap_start:gap_end].strip()
        groups[name] = value

    return MatchResult(groups=groups, confidence=confidence)
