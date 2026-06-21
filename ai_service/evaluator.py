from __future__ import annotations


def evaluate_content(payload: dict) -> dict:
    """Rule-based quality score for demo and reporting."""
    description = payload.get("description", "") or ""
    benefits = payload.get("benefits", []) or []
    seo = payload.get("seo", {}) or {}
    landing = payload.get("landingPage", {}) or {}
    sources = payload.get("sources", []) or []

    seo_score = _score(bool(seo.get("title")), bool(seo.get("metaDescription")), len(seo.get("keywords", [])) >= 3)
    clarity_score = _score(len(description) >= 120, len(benefits) >= 3, bool(payload.get("productSummary")))
    attractiveness_score = _score(bool(landing.get("heroTitle")), bool(landing.get("cta")), len(payload.get("slogan", "")) >= 8)
    research_score = min(10, 4 + len(sources) * 1.5)

    total = round((seo_score + clarity_score + attractiveness_score + research_score) / 4, 1)
    suggestions = []
    if seo_score < 8:
        suggestions.append("Bo sung tu khoa va meta description ro rang hon.")
    if clarity_score < 8:
        suggestions.append("Mo ta nen dai hon va co them loi ich cu the cho khach hang.")
    if attractiveness_score < 8:
        suggestions.append("Can CTA va slogan manh hon de tang kha nang chuyen doi.")
    if research_score < 8:
        suggestions.append("Nen crawl them nguon tham khao de noi dung dang tin cay hon.")

    return {
        "totalScore": total,
        "seoScore": round(seo_score, 1),
        "clarityScore": round(clarity_score, 1),
        "attractivenessScore": round(attractiveness_score, 1),
        "researchScore": round(research_score, 1),
        "improvementSuggestions": suggestions,
    }


def _score(*checks: bool) -> float:
    if not checks:
        return 0
    return round(sum(1 for item in checks if item) / len(checks) * 10, 1)
