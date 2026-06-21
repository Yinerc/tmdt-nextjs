from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from transformers import pipeline

from crawler import WebSource, build_research_context


FINE_TUNED_TEXT_MODEL_DIR = Path("models/text-generator")
BASE_TEXT_MODEL_NAME = "google/flan-t5-small"

_generator = None


def get_text_generator():
    global _generator
    if _generator is None:
        model_name = str(FINE_TUNED_TEXT_MODEL_DIR) if FINE_TUNED_TEXT_MODEL_DIR.exists() else BASE_TEXT_MODEL_NAME
        _generator = pipeline(
            "text2text-generation",
            model=model_name,
            max_new_tokens=700,
        )
    return _generator


def generate_product_content(product_name: str, sources: list[WebSource], additional_info: str = "") -> dict:
    context = build_research_context(product_name, sources)
    if additional_info.strip():
        context = f"{context}\n\nThong tin bo sung tu nguoi dung: {additional_info.strip()}"
    facts = _extract_facts(product_name, sources, additional_info)
    prompt = f"""
Ban la he thong AI tao noi dung thuong mai dien tu bang tieng Viet.
Khong goi API AI ben ngoai. Hay tong hop thong tin san pham tu cac nguon sau.

{context}

Tra ve JSON hop le voi cac truong:
standardizedProductName, productSummary, specifications, benefits,
description, landingPage, slogan, socialContent, seo, faq,
targetCustomers, pros, cons.

Yeu cau:
- Noi dung bang tieng Viet.
- Khong bia thong so neu nguon khong co; neu khong chac hay ghi "Can kiem chung".
- Landing page gom heroTitle, heroSubtitle, cta, benefitSection, whyChooseSection.
- SEO gom title, metaDescription, keywords, slug.
"""
    raw = _generate_text(prompt)
    parsed = _parse_json(raw)
    return _normalize_output(product_name, parsed, facts)


def _generate_text(prompt: str) -> str:
    try:
        return get_text_generator()(prompt)[0]["generated_text"]
    except Exception:
        return ""


def _parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, flags=re.S)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _normalize_output(product_name: str, data: dict, facts: dict) -> dict:
    standardized_name = _standardize_name(data.get("standardizedProductName") or facts["standardized_name"], [])
    slug = _slugify((data.get("seo") or {}).get("slug") or standardized_name)
    category = facts["category"]
    generated_specs = _as_list(data.get("specifications"))
    specs = facts["specifications"] if _has_verified_specs(facts["specifications"]) else _first_non_empty_list(generated_specs, facts["specifications"])
    benefits = _ensure_min_items(
        _first_non_empty_list(data.get("benefits"), _default_benefits(category)),
        _default_benefits(category),
        4,
    )
    keywords = _ensure_min_items(
        _as_list((data.get("seo") or {}).get("keywords")),
        facts["keywords"],
        4,
    )
    target_customers = _ensure_min_items(
        _as_list(data.get("targetCustomers")),
        _default_target_customers(category),
        3,
    )
    pros = _ensure_min_items(_as_list(data.get("pros")), benefits[:3], 3)
    cons = _ensure_min_items(_as_list(data.get("cons")), _default_cons(category), 2)
    description = data.get("description") or _default_description(standardized_name, category, benefits)
    generated_summary = data.get("productSummary") or ""
    summary = facts["summary"] if facts.get("has_sources") or _is_bad_summary(generated_summary) else generated_summary
    summary = summary or _default_summary(standardized_name, category)
    slogan = data.get("slogan") or _default_slogan(category)
    landing = data.get("landingPage") or {}
    social = data.get("socialContent") or {}
    seo = data.get("seo") or {}

    return {
        "standardizedProductName": standardized_name,
        "productSummary": summary,
        "specifications": specs,
        "benefits": benefits,
        "description": description,
        "landingPage": {
            "heroTitle": landing.get("heroTitle") or _hero_title(standardized_name, category),
            "heroSubtitle": landing.get("heroSubtitle") or summary,
            "cta": landing.get("cta") or "Mua ngay",
            "benefitSection": landing.get("benefitSection") or "; ".join(benefits[:4]),
            "whyChooseSection": landing.get("whyChooseSection") or _why_choose(standardized_name, benefits),
        },
        "slogan": slogan,
        "socialContent": {
            "facebookPost": social.get("facebookPost") or _facebook_post(standardized_name, benefits),
            "tiktokCaption": social.get("tiktokCaption") or _tiktok_caption(standardized_name, category),
            "hashtags": _ensure_min_items(_as_list(social.get("hashtags")), _hashtags(standardized_name, category), 3),
        },
        "seo": {
            "title": seo.get("title") or f"{standardized_name} - thông tin, lợi ích và ưu đãi",
            "metaDescription": seo.get("metaDescription") or _meta_description(standardized_name, benefits),
            "keywords": keywords,
            "slug": slug,
        },
        "faq": _ensure_min_items(_as_list(data.get("faq")), _default_faq(standardized_name, category), 4),
        "targetCustomers": target_customers,
        "pros": pros,
        "cons": cons,
    }


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [str(value)]


def _first_non_empty_list(value, fallback: list[str]) -> list[str]:
    items = [item for item in _as_list(value) if str(item).strip()]
    return items or fallback


def _ensure_min_items(items: list[str], fallback: list[str], min_count: int) -> list[str]:
    clean = []
    for item in items + fallback:
        value = str(item).strip()
        if value and value not in clean:
            clean.append(value)
        if len(clean) >= min_count:
            break
    return clean


def _has_verified_specs(specs: list[str]) -> bool:
    clean_specs = [_plain_text(str(item).strip()) for item in specs if str(item).strip()]
    if not clean_specs:
        return False
    return any(not _is_unverified_spec(item) for item in clean_specs)


def _is_unverified_spec(value: str) -> bool:
    return (
        ("can" in value and "kiem" in value and "chung" in value)
        or "cáº§n kiá»ƒm chá»©ng" in value
    )


def _plain_text(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in value if unicodedata.category(char) != "Mn")


def _slugify(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower().strip())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value)
    return value.strip("-") or "san-pham"


def _extract_facts(product_name: str, sources: list[WebSource], additional_info: str = "") -> dict:
    combined = " ".join(source.content for source in sources)
    if additional_info.strip():
        combined = f"{additional_info.strip()} {combined}".strip()
    sentences = _split_sentences(combined)
    relevant = [sentence for sentence in sentences if _is_relevant(product_name, sentence)]
    category = _infer_category(product_name, combined)
    extracted_specs = _extract_specifications_from_text(category, combined, product_name) or _extract_specifications(relevant or sentences)
    known_specs = _known_catalog_specs(product_name)
    specs = known_specs if known_specs and not _has_enough_catalog_specs(extracted_specs) else extracted_specs
    keywords = _extract_keywords(product_name, category, combined)
    summary_sentences = [sentence for sentence in (relevant or sentences) if not _is_bad_summary(sentence)]
    summary = _build_fact_summary(product_name, category, specs, bool(sources))
    if not summary:
        summary = " ".join(summary_sentences[:2])[:450]
    if _is_bad_summary(summary):
        summary = ""
    if additional_info.strip() and not summary:
        summary = f"{product_name} được xử lý như một sản phẩm concept dựa trên thông tin bổ sung: {additional_info.strip()}"
    return {
        "standardized_name": _standardize_name(product_name, sources),
        "summary": summary,
        "category": category,
        "specifications": specs or _default_specs(category),
        "keywords": keywords,
        "has_sources": bool(sources),
    }


def _is_bad_summary(summary: str) -> bool:
    value = summary.lower()
    bad_patterns = [
        "please click here if the page does not redirect automatically",
        "enable javascript",
        "access denied",
        "captcha",
        "robot check",
        "when measured as a standard rectangular shape",
        "actual viewable area is less",
        "screen is",
        "not all devices are eligible",
    ]
    return any(pattern in value for pattern in bad_patterns)


def _build_fact_summary(product_name: str, category: str, specs: list[str], has_sources: bool) -> str:
    if not has_sources:
        return ""

    name = product_name.strip()
    specs_text = _plain_text(" ".join(specs))
    if category == "smartphone":
        highlights = []
        if "super retina" in specs_text or "oled" in specs_text:
            highlights.append("màn hình chất lượng cao")
        if "a16" in specs_text or "snapdragon" in specs_text or "dimensity" in specs_text:
            highlights.append("hiệu năng mạnh")
        if "48mp" in specs_text or "camera" in specs_text:
            highlights.append("camera độ phân giải cao")
        if "128gb" in specs_text or "256gb" in specs_text or "512gb" in specs_text:
            highlights.append("nhiều tùy chọn bộ nhớ")
        if not highlights:
            highlights = ["thiết kế hiện đại", "trải nghiệm sử dụng mượt mà"]
        return f"{name} là smartphone phù hợp cho nhu cầu liên lạc, giải trí và sáng tạo nội dung, nổi bật với {', '.join(highlights[:3])}. Nội dung được tổng hợp từ nguồn thông tin công khai và nên kiểm chứng lại với nhà bán hàng trước khi sử dụng thương mại."

    if category == "headphone":
        return f"{name} là mẫu tai nghe phù hợp cho nghe nhạc, học tập, làm việc và họp online, tập trung vào sự tiện lợi, khả năng kết nối không dây và trải nghiệm âm thanh cá nhân."

    if category == "laptop":
        return f"{name} là laptop phù hợp cho học tập, làm việc và xử lý tác vụ hằng ngày, có thể dùng làm nội dung giới thiệu sản phẩm, landing page và SEO thương mại điện tử."

    return _default_summary(name, category)


def _standardize_name(product_name: str, sources: list[WebSource]) -> str:
    cleaned = product_name.strip()
    known_name = _known_catalog_name(cleaned)
    if known_name:
        return known_name
    if cleaned:
        return _smart_title_product_name(cleaned)

    candidates = []
    for source in sources:
        title = (source.title or "").strip()
        if not title:
            continue
        title = re.split(r"[:|–-]", title)[0].strip()
        if 2 <= len(title) <= 60:
            candidates.append(title)
    return candidates[0] if candidates else product_name


def _known_catalog_name(product_name: str) -> str:
    normalized = _plain_text(product_name)
    names = [
        (r"iphone\s*15\s*pro\s*max", "iPhone 15 Pro Max"),
        (r"iphone\s*15\s*pro", "iPhone 15 Pro"),
        (r"iphone\s*15\s*plus", "iPhone 15 Plus"),
        (r"iphone\s*15", "iPhone 15"),
        (r"samsung.*s22\s*ultra|galaxy\s*s22\s*ultra|s22\s*ultra", "Samsung Galaxy S22 Ultra 5G"),
        (r"samsung.*s23\s*ultra|galaxy\s*s23\s*ultra|s23\s*ultra", "Samsung Galaxy S23 Ultra"),
        (r"samsung.*s24\s*ultra|galaxy\s*s24\s*ultra|s24\s*ultra", "Samsung Galaxy S24 Ultra"),
        (r"xiaomi\s*13t\s*pro", "Xiaomi 13T Pro"),
        (r"ipad\s*air\s*5|ipad\s*air.*m1", "iPad Air 5"),
        (r"ipad\s*pro", "iPad Pro"),
        (r"galaxy\s*tab\s*s9", "Samsung Galaxy Tab S9"),
        (r"lenovo\s*loq|laptop\s*lenovo\s*loq", "Lenovo LOQ"),
    ]
    for pattern, name in names:
        if re.search(pattern, normalized, re.I):
            return name
    return ""


def _smart_title_product_name(product_name: str) -> str:
    brand_map = {
        "iphone": "iPhone",
        "ipad": "iPad",
        "samsung": "Samsung",
        "galaxy": "Galaxy",
        "xiaomi": "Xiaomi",
        "redmi": "Redmi",
        "oppo": "OPPO",
        "vivo": "Vivo",
        "realme": "Realme",
        "lenovo": "Lenovo",
        "loq": "LOQ",
        "asus": "ASUS",
        "dell": "Dell",
        "hp": "HP",
        "msi": "MSI",
        "macbook": "MacBook",
    }
    words = re.split(r"(\s+)", product_name.strip())
    titled = []
    for word in words:
        key = word.lower()
        if key.isspace():
            titled.append(word)
        elif key in brand_map:
            titled.append(brand_map[key])
        elif re.fullmatch(r"[a-z]+\d+[a-z]*", key):
            titled.append(word.upper())
        else:
            titled.append(word[:1].upper() + word[1:])
    return "".join(titled)


def _known_catalog_specs(product_name: str) -> list[str]:
    normalized = _plain_text(product_name)
    presets = [
        (
            r"samsung.*s22\s*ultra|galaxy\s*s22\s*ultra|s22\s*ultra",
            [
                "Màn hình: 6.8 inch Dynamic AMOLED 2X, 120Hz",
                "Độ phân giải: 1440 x 3088 pixels",
                "Chip: Snapdragon 8 Gen 1 hoặc Exynos 2200 tùy thị trường",
                "Camera: Chính 108MP, tele 10MP, tiềm vọng 10MP, góc rộng 12MP",
                "Bộ nhớ: 128GB, 256GB, 512GB hoặc 1TB",
                "Pin: 5000mAh, sạc nhanh 45W",
                "Kết nối: 5G, Wi-Fi 6E, USB-C",
                "Trọng lượng: 228g",
            ],
        ),
        (
            r"iphone\s*15",
            [
                "Màn hình: 6.1 inch Super Retina XDR OLED",
                "Độ phân giải: 2556 x 1179 pixels",
                "Chip: Apple A16 Bionic",
                "Camera: Chính 48MP, góc siêu rộng 12MP",
                "Bộ nhớ: 128GB, 256GB hoặc 512GB",
                "Pin: 3349mAh",
                "Cổng kết nối: USB-C",
            ],
        ),
        (
            r"ipad\s*air\s*5|ipad\s*air.*m1",
            [
                "Màn hình: 10.9 inch Liquid Retina",
                "Chip: Apple M1",
                "Camera: 12MP",
                "Bộ nhớ: 64GB hoặc 256GB",
                "Kết nối: Wi-Fi 6 hoặc 5G tùy phiên bản",
            ],
        ),
        (
            r"galaxy\s*tab\s*s9",
            [
                "Màn hình: 11 inch Dynamic AMOLED 2X, 120Hz",
                "Chip: Snapdragon 8 Gen 2 for Galaxy",
                "Camera: 13MP",
                "Bộ nhớ: 128GB hoặc 256GB",
                "Pin: 8400mAh",
                "Kết nối: Wi-Fi 6E, USB-C",
            ],
        ),
    ]
    for pattern, specs in presets:
        if re.search(pattern, normalized, re.I):
            return specs
    return []


def _has_enough_catalog_specs(specs: list[str]) -> bool:
    meaningful = []
    for item in specs:
        value = str(item).strip()
        plain = _plain_text(value)
        if len(value) < 8:
            continue
        if plain in {"5g", "4g", "usb-c", "wifi", "bluetooth"}:
            continue
        if any(token in plain for token in ["man hinh", "display", "chip", "camera", "pin", "mah", "bo nho", "storage", "ram", "ssd"]):
            meaningful.append(value)
    return len(meaningful) >= 3


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [part.strip() for part in parts if 40 <= len(part.strip()) <= 260]


def _is_relevant(product_name: str, sentence: str) -> bool:
    tokens = [token.lower() for token in re.findall(r"[A-Za-z0-9]+", product_name) if len(token) > 2 or token.isdigit()]
    sentence_lower = sentence.lower()
    model_tokens = [token for token in tokens if any(char.isdigit() for char in token)]
    if model_tokens:
        return all(token in sentence_lower for token in model_tokens) and any(
            token in sentence_lower for token in tokens if token not in model_tokens
        )
    return any(token in sentence_lower for token in tokens)


def _infer_category(product_name: str, text: str) -> str:
    name = product_name.lower()
    value = f"{product_name} {text}".lower()

    if any(word in name for word in ["headphone", "tai nghe", "earbud", "earphone", "bluetooth", "sony wh", "wh-1000", "wf-1000"]):
        return "headphone"
    if any(word in name for word in ["tablet", "ipad", "máy tính bảng", "may tinh bang", "galaxy tab"]):
        return "tablet"
    if any(word in name for word in ["laptop", "notebook", "macbook"]):
        return "laptop"
    if any(word in name for word in ["watch", "đồng hồ", "smartwatch"]):
        return "smartwatch"
    if any(word in name for word in ["phone", "iphone", "samsung", "xiaomi", "điện thoại", "smartphone"]):
        return "smartphone"

    if any(word in value for word in ["headphone", "tai nghe", "earbud", "earphone", "sony wh", "wh-1000", "wf-1000"]):
        return "headphone"
    if any(word in value for word in ["tablet", "ipad", "máy tính bảng", "may tinh bang", "galaxy tab"]):
        return "tablet"
    if any(word in value for word in ["laptop", "notebook", "macbook", "dell", "asus", "lenovo"]):
        return "laptop"
    if any(word in value for word in ["watch", "đồng hồ", "smartwatch"]):
        return "smartwatch"
    if any(word in value for word in ["phone", "iphone", "samsung", "xiaomi", "điện thoại", "smartphone"]):
        return "smartphone"
    return "general"


def _extract_specifications(sentences: list[str]) -> list[str]:
    patterns = [
        r"([0-9]+(?:\.[0-9]+)?\s?(?:inch|gb|tb|mah|hz|w|mp|kg|g|hours|giờ))",
        r"(bluetooth\s?[0-9.]*)",
        r"(wifi\s?[0-9a-z.]*)",
        r"(usb[-\s]?[a-z0-9.]+)",
    ]
    specs = []
    for sentence in sentences:
        lowered = sentence.lower()
        if any(word in lowered for word in ["ram", "pin", "battery", "camera", "cpu", "chip", "bluetooth", "màn hình", "display", "storage", "ssd"]):
            specs.append(sentence[:180])
        for pattern in patterns:
            for match in re.findall(pattern, lowered):
                specs.append(match)
        if len(specs) >= 8:
            break
    category = ""
    normalized = ""
    product_name = ""
    if category in ["laptop", "tablet"]:
        display = _find_display_spec(normalized, product_name)
        resolution = _find_first(
            normalized,
            [
                r"([0-9]{3,4}\s?x\s?[0-9]{3,4}\s?(?:pixels|pixel|px)[^.]{0,40})",
                r"([0-9]{3,4}-by-[0-9]{3,4}-pixel[^.]{0,60})",
            ],
        )
        cpu = _find_first(normalized, [r"((?:Intel Core|AMD Ryzen|Apple M[0-9]|Snapdragon|MediaTek|Dimensity)[^.]{0,120})"])
        ram = _find_first(normalized, [r"((?:RAM|Memory)\s?:?\s?[0-9]{1,3}\s?GB[^.]{0,80})", r"([0-9]{1,3}\s?GB\s?(?:RAM|memory)[^.]{0,80})"])
        storage = _find_storage_spec(normalized)
        battery = _find_first(normalized, [r"([0-9]{3,5}\s?mAh[^.]{0,80})", r"([0-9]+(?:\.[0-9]+)?\s?Wh[^.]{0,80})"])
        camera = _find_first(normalized, [r"((?:8|10|12|13|16|48|50|108)\s?MP[^.]{0,120})"])
        weight = _find_first(normalized, [r"(?:Weight|Trọng lượng|Trong luong)\s?:?\s?([0-9]+(?:\.[0-9]+)?\s?(?:g|kg))"])

        _add_spec(specs, "Màn hình", display)
        _add_spec(specs, "Độ phân giải", resolution)
        _add_spec(specs, "CPU/Chip", cpu)
        _add_spec(specs, "RAM", ram)
        _add_spec(specs, "Bộ nhớ", storage)
        _add_spec(specs, "Pin", battery)
        _add_spec(specs, "Camera", camera)
        _add_spec(specs, "Trọng lượng", weight)

    return _dedupe(specs)[:8]


def _extract_specifications_from_text(category: str, text: str, product_name: str = "") -> list[str]:
    normalized = " ".join(text.split())
    normalized = (
        normalized.replace("\u2011", "-")
        .replace("\u2010", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )
    lowered = normalized.lower()
    specs: list[str] = []

    if category == "smartphone":
        display = _find_display_spec(normalized, product_name)
        resolution = _find_first(
            normalized,
            [
                r"([0-9]{3,4}\s?x\s?[0-9]{3,4}\s?(?:pixels|pixel|px)[^.]{0,40})",
                r"([0-9]{3,4}-by-[0-9]{3,4}-pixel[^.]{0,60})",
            ],
        )
        chip = _find_first(normalized, [r"((?:A[0-9]{2}|Snapdragon|Dimensity|Exynos|Apple A[0-9]{2})[^.]{0,100})"])
        camera = _find_first(normalized, [r"((?:48|12|50|64|108|200)\s?MP[^.]{0,160})"])
        storage = _find_storage_spec(normalized)
        battery = _find_first(
            normalized,
            [
                r"((?:up to|lên đến|toi da|tối đa)[^.]{0,80}(?:hours|giờ))",
                r"([0-9]{3,5}\s?mAh[^.]{0,80})",
            ],
        )
        connector = _find_first(normalized, [r"(USB-C[^.]{0,80})", r"(Lightning[^.]{0,80})"])
        weight = _find_first(normalized, [r"(?:Weight|Trọng lượng|Trong luong)\s?:?\s?([0-9]+(?:\.[0-9]+)?\s?g)"])

        _add_spec(specs, "Màn hình", display)
        _add_spec(specs, "Độ phân giải", resolution)
        _add_spec(specs, "Chip", chip)
        _add_spec(specs, "Camera", camera)
        _add_spec(specs, "Bộ nhớ", storage)
        _add_spec(specs, "Pin", battery)
        _add_spec(specs, "Cổng kết nối", connector)
        _add_spec(specs, "Trọng lượng", weight)

    if category == "headphone":
        bluetooth = _find_first(normalized, [r"(Bluetooth\s?[0-9.]*)"])
        noise = _find_first(normalized, [r"((?:chống ồn|noise cancelling|noise canceling|ANC)[^.]{0,120})"])
        battery = _find_first(normalized, [r"([0-9]+(?:\.[0-9]+)?\s?(?:hours|giờ)[^.]{0,80})"])
        weight = _find_first(normalized, [r"(?:Weight|Trọng lượng|Trong luong)\s?:?\s?([0-9]+(?:\.[0-9]+)?\s?g)"])

        _add_spec(specs, "Kết nối", bluetooth)
        _add_spec(specs, "Chống ồn", noise)
        _add_spec(specs, "Thời lượng pin", battery)
        _add_spec(specs, "Trọng lượng", weight)

    return _dedupe(specs)[:8]


def _find_first(text: str, patterns: list[str]) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return " ".join(match.group(1).split())[:160]
    return ""


def _find_display_spec(text: str, product_name: str = "") -> str:
    lower_text = text.lower()
    size = _find_screen_size(text, product_name)
    if "super retina xdr" in lower_text:
        return f"{size} Super Retina XDR display".strip()
    panel = _find_first(text, [r"((?:OLED|AMOLED)[^.]{0,80})"])
    if size and panel:
        return f"{size} {panel}"
    return panel or size


def _find_screen_size(text: str, product_name: str = "") -> str:
    matches = re.findall(r"([0-9]+(?:\.[0-9]+)?)\s?-?\s?(inch|inches|inci)", text, flags=re.I)
    product = product_name.lower()
    values = []
    for value, unit in matches:
        try:
            size = float(value)
        except ValueError:
            continue
        if 4.0 <= size <= 8.5:
            values.append((size, value, unit))
    if "iphone 15" in product and "plus" not in product:
        for size, value, unit in values:
            if 6.0 <= size <= 6.2:
                return f"{value} {unit}"
    if "plus" in product:
        for size, value, unit in values:
            if 6.6 <= size <= 6.8:
                return f"{value} {unit}"
    if values:
        size, value, unit = max(values, key=lambda item: item[0])
        return f"{value} {unit}"
    return ""


def _find_storage_spec(text: str) -> str:
    matches = re.findall(r"\b(?:64|128|256|512)\s?GB\b|\b1\s?TB\b", text, flags=re.I)
    unique = _dedupe(matches)
    if len(unique) >= 2:
        return ", ".join(unique[:4])
    return unique[0] if unique else ""


def _add_spec(specs: list[str], label: str, value: str) -> None:
    if value:
        specs.append(f"{label}: {value}")


def _extract_keywords(product_name: str, category: str, text: str) -> list[str]:
    base = [product_name, f"{product_name} chính hãng", f"{product_name} giá tốt"]
    category_keywords = {
        "smartphone": ["điện thoại", "smartphone", "camera", "pin lâu"],
        "laptop": ["laptop", "laptop văn phòng", "laptop học tập", "máy tính xách tay"],
        "headphone": ["tai nghe bluetooth", "tai nghe chống ồn", "tai nghe không dây", "âm thanh chất lượng"],
        "smartwatch": ["đồng hồ thông minh", "smartwatch", "theo dõi sức khỏe"],
        "general": ["sản phẩm công nghệ", "mua online", "thương mại điện tử"],
    }
    words = re.findall(r"[A-Za-zÀ-ỹ0-9]{4,}", text.lower())
    frequent = []
    for word in words:
        if words.count(word) >= 3 and word not in frequent:
            frequent.append(word)
        if len(frequent) >= 3:
            break
    return _dedupe(base + category_keywords.get(category, []) + frequent)[:10]


def _dedupe(items: list[str]) -> list[str]:
    result = []
    for item in items:
        value = str(item).strip()
        if value and value not in result:
            result.append(value)
    return result


def _default_specs(category: str) -> list[str]:
    mapping = {
        "smartphone": ["Màn hình: Cần kiểm chứng", "Camera: Cần kiểm chứng", "Pin: Cần kiểm chứng", "Bộ nhớ: Cần kiểm chứng"],
        "laptop": ["CPU: Cần kiểm chứng", "RAM: Cần kiểm chứng", "Ổ cứng: Cần kiểm chứng", "Màn hình: Cần kiểm chứng"],
        "headphone": ["Kết nối: Bluetooth", "Chống ồn: Cần kiểm chứng", "Thời lượng pin: Cần kiểm chứng", "Kiểu dáng: Tai nghe không dây"],
        "smartwatch": ["Màn hình: Cần kiểm chứng", "Tính năng sức khỏe: Cần kiểm chứng", "Pin: Cần kiểm chứng"],
    }
    return mapping.get(category, ["Thông số kỹ thuật: Cần kiểm chứng từ nguồn bán hàng chính thức"])


def _default_benefits(category: str) -> list[str]:
    mapping = {
        "smartphone": ["Trải nghiệm sử dụng mượt mà", "Phù hợp liên lạc, học tập và giải trí", "Thiết kế hiện đại dễ mang theo", "Hỗ trợ nhu cầu chụp ảnh và làm việc hằng ngày"],
        "laptop": ["Hỗ trợ học tập và làm việc hiệu quả", "Thiết kế tiện mang theo", "Phù hợp tác vụ văn phòng phổ biến", "Dễ triển khai cho nhu cầu cá nhân hoặc doanh nghiệp nhỏ"],
        "headphone": ["Nghe nhạc và họp online tiện lợi", "Giảm dây rối nhờ kết nối không dây", "Phù hợp học tập, làm việc và di chuyển", "Tăng trải nghiệm giải trí cá nhân"],
        "smartwatch": ["Theo dõi hoạt động hằng ngày", "Hỗ trợ nhận thông báo nhanh", "Thiết kế tiện đeo", "Phù hợp người quan tâm sức khỏe"],
    }
    return mapping.get(category, ["Dễ sử dụng", "Phù hợp mua sắm online", "Hỗ trợ nhu cầu hằng ngày", "Tối ưu trải nghiệm người dùng"])


def _default_target_customers(category: str) -> list[str]:
    mapping = {
        "smartphone": ["Sinh viên", "Nhân viên văn phòng", "Người cần thiết bị liên lạc và giải trí"],
        "laptop": ["Sinh viên", "Nhân viên văn phòng", "Người làm việc từ xa"],
        "headphone": ["Sinh viên", "Nhân viên văn phòng", "Người hay di chuyển"],
        "smartwatch": ["Người chơi thể thao", "Nhân viên văn phòng", "Người quan tâm sức khỏe"],
    }
    return mapping.get(category, ["Người mua sắm online", "Khách hàng trẻ", "Người dùng phổ thông"])


def _default_cons(category: str) -> list[str]:
    mapping = {
        "smartphone": ["Giá và cấu hình cần so sánh theo từng phiên bản", "Thông số thực tế cần kiểm chứng từ nhà bán hàng"],
        "laptop": ["Không phải cấu hình nào cũng phù hợp tác vụ nặng", "Cần kiểm tra RAM, CPU và bảo hành trước khi mua"],
        "headphone": ["Chất âm và độ thoải mái phụ thuộc cảm nhận cá nhân", "Thời lượng pin cần kiểm chứng theo điều kiện sử dụng"],
    }
    return mapping.get(category, ["Cần kiểm chứng thông tin từ nguồn chính thức", "Giá bán có thể thay đổi theo thời điểm"])


def _default_summary(name: str, category: str) -> str:
    return f"{name} là sản phẩm thuộc nhóm {category}, phù hợp với nhu cầu mua sắm trực tuyến và có thể được giới thiệu bằng nội dung landing page, SEO và quảng cáo mạng xã hội."


def _default_description(name: str, category: str, benefits: list[str]) -> str:
    return f"{name} là lựa chọn phù hợp cho khách hàng đang tìm một sản phẩm {category} tiện dụng. Sản phẩm nổi bật với các lợi ích như {', '.join(benefits[:3]).lower()}, giúp nâng cao trải nghiệm sử dụng hằng ngày."


def _hero_title(name: str, category: str) -> str:
    mapping = {
        "smartphone": f"{name} - Sẵn sàng cho mọi khoảnh khắc",
        "laptop": f"{name} - Làm việc gọn gàng, học tập hiệu quả",
        "headphone": f"{name} - Tận hưởng âm thanh theo cách riêng",
        "smartwatch": f"{name} - Theo dõi ngày mới thông minh hơn",
    }
    return mapping.get(category, f"{name} - Nâng cấp trải nghiệm mua sắm của bạn")


def _why_choose(name: str, benefits: list[str]) -> str:
    return f"Nên chọn {name} nếu bạn cần một sản phẩm có {', '.join(benefits[:3]).lower()} và phù hợp với nhu cầu sử dụng thực tế."


def _default_slogan(category: str) -> str:
    mapping = {
        "smartphone": "Kết nối nhanh, trải nghiệm trọn vẹn.",
        "laptop": "Gọn nhẹ mỗi ngày, hiệu quả mọi việc.",
        "headphone": "Âm thanh rõ nét, tập trung từng phút.",
        "smartwatch": "Sống chủ động, theo dõi thông minh.",
    }
    return mapping.get(category, "Mua sắm thông minh, trải nghiệm tốt hơn.")


def _facebook_post(name: str, benefits: list[str]) -> str:
    return f"Khám phá {name} với những điểm nổi bật: {', '.join(benefits[:3]).lower()}. Một lựa chọn đáng cân nhắc cho nhu cầu mua sắm TMĐT hôm nay."


def _tiktok_caption(name: str, category: str) -> str:
    return f"{name} có gì đáng chú ý? Cùng xem nhanh những điểm nổi bật trước khi mua."


def _hashtags(name: str, category: str) -> list[str]:
    compact_name = re.sub(r"[^A-Za-z0-9À-ỹ]", "", name.title())
    return [f"#{compact_name[:28]}", "#TMDT", "#MuaSamOnline", f"#{category}"]


def _meta_description(name: str, benefits: list[str]) -> str:
    return f"Tìm hiểu {name}: {', '.join(benefits[:3]).lower()}. Nội dung tổng hợp từ nguồn công khai, phù hợp tham khảo trước khi mua."


def _default_faq(name: str, category: str) -> list[str]:
    return [
        f"{name} phù hợp với ai? Sản phẩm phù hợp với nhóm khách hàng cần một thiết bị {category} cho nhu cầu hằng ngày.",
        f"{name} có những điểm nổi bật nào? Các điểm nổi bật gồm trải nghiệm tiện lợi, dễ sử dụng và phù hợp mua online.",
        "Thông số kỹ thuật có chính xác tuyệt đối không? Thông số được tổng hợp từ nguồn web công khai và nên kiểm chứng lại với nhà bán hàng.",
        "Có nên dùng nội dung này cho landing page không? Có, nội dung đã được cấu trúc theo hướng giới thiệu, thuyết phục và hỗ trợ SEO.",
    ]
