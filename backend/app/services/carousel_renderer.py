"""Pillow renderer for WYSIWYG-ish carousel PNG export."""
import base64
import io
import os
import re
import uuid
import zipfile
from typing import Iterable, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from ..schemas.carousel import CarouselDesign, CarouselPayload, CarouselSlide

RATIOS = {
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "3:4": (1080, 1440),
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
}

THEMES = {
    "Solid Dark": ("#111114", "#111114"),
    "Solid Light": ("#F5F5F7", "#E5E7EB"),
    "Gradient Indigo": ("#0F172A", "#4F46E5"),
    "Gradient Sunset": ("#4C0519", "#F97316"),
    "Cyber Neon": ("#080216", "#312E81"),
    "Luxury": ("#09090B", "#422006"),
    "Minimal": ("#F8FAFC", "#E2E8F0"),
}

FONT_PATHS = {
    "Sans": ["/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf", "/usr/share/fonts/msttcore/arial.ttf"],
    "Rounded": ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "Serif": ["/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf", "/usr/share/fonts/msttcore/georgia.ttf"],
    "Monospace": ["/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf", "/usr/share/fonts/msttcore/cour.ttf"],
}

BOLD_PATHS = {
    "Sans": ["/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf", "/usr/share/fonts/msttcore/arialbd.ttf"],
    "Rounded": ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "Serif": ["/usr/share/fonts/truetype/liberation2/LiberationSerif-Bold.ttf", "/usr/share/fonts/msttcore/georgiab.ttf"],
    "Monospace": ["/usr/share/fonts/truetype/liberation2/LiberationMono-Bold.ttf", "/usr/share/fonts/msttcore/courbd.ttf"],
}


def _color(value: str, fallback: str = "#FFFFFF") -> str:
    value = (value or "").strip()
    return value if re.match(r"^#[0-9A-Fa-f]{6}$", value) else fallback


def _font(family: str, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = (BOLD_PATHS if bold else FONT_PATHS).get(family, FONT_PATHS["Sans"])
    for path in paths:
        if os.path.isfile(path):
            return ImageFont.truetype(path, max(10, size))
    return ImageFont.load_default()


def _gradient(size: Tuple[int, int], top: str, bottom: str) -> Image.Image:
    width, height = size
    a = Image.new("RGB", (1, 1), top).getpixel((0, 0))
    b = Image.new("RGB", (1, 1), bottom).getpixel((0, 0))
    strip = Image.new("RGB", (1, height))
    px = strip.load()
    denom = max(1, height - 1)
    for y in range(height):
        t = y / denom
        px[0, y] = tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))
    return strip.resize((width, height))


def _decode_image(data: str) -> Image.Image:
    raw = data.split(",", 1)[1] if data.startswith("data:") and "," in data else data
    try:
        blob = base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise ValueError(f"Gambar base64 tidak valid: {exc}")
    if len(blob) > 12 * 1024 * 1024:
        raise ValueError("Gambar maksimal 12 MB")
    try:
        return Image.open(io.BytesIO(blob)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Format gambar tidak didukung: {exc}")


def _cover(source: Image.Image, size: Tuple[int, int]) -> Image.Image:
    width, height = size
    ratio = max(width / source.width, height / source.height)
    resized = source.resize(
        (max(1, round(source.width * ratio)), max(1, round(source.height * ratio))),
        Image.Resampling.LANCZOS,
    )
    left = max(0, (resized.width - width) // 2)
    top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    paragraphs = (text or "").splitlines() or [""]
    result: list[str] = []
    for paragraph in paragraphs:
        words = paragraph.split()
        if not words:
            result.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = line + " " + word
            if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
                line = candidate
            else:
                result.append(line)
                line = word
        result.append(line)
    return result


def _draw_multiline(
    image: Image.Image,
    text: str,
    box: Tuple[int, int, int, int],
    font: ImageFont.ImageFont,
    fill: str,
    align: str = "center",
    effect: str = "shadow",
    spacing: int = 12,
) -> int:
    draw = ImageDraw.Draw(image)
    left, top, right, bottom = box
    lines = _wrap(draw, text, font, right - left)
    line_h = draw.textbbox((0, 0), "Ag", font=font)[3] + spacing
    total_h = min(bottom - top, line_h * len(lines))
    y = top + max(0, (bottom - top - total_h) // 2)
    for line in lines:
        width = draw.textbbox((0, 0), line, font=font)[2]
        x = left if align == "left" else right - width if align == "right" else left + (right - left - width) // 2
        if effect == "highlight":
            pad = max(8, line_h // 8)
            draw.rounded_rectangle((x - pad, y - pad // 2, x + width + pad, y + line_h - pad // 2), radius=pad, fill=(0, 0, 0, 150))
        stroke_width = max(1, int(getattr(font, "size", 20) * 0.045)) if effect in {"outline", "neon"} else 0
        stroke_fill = _color("#000000")
        if effect == "shadow":
            offset = max(2, int(getattr(font, "size", 20) * 0.05))
            draw.text((x + offset, y + offset), line, font=font, fill=(0, 0, 0, 170))
        if effect == "neon":
            glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            gd.text((x, y), line, font=font, fill=fill, stroke_width=stroke_width * 3, stroke_fill=fill)
            image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(4, stroke_width * 2))))
            draw = ImageDraw.Draw(image)
        draw.text((x, y), line, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)
        y += line_h
        if y > bottom:
            break
    return y


def _base(slide: CarouselSlide, design: CarouselDesign, size: Tuple[int, int], index: int) -> Image.Image:
    top, bottom = THEMES.get(design.backgroundTheme, THEMES["Gradient Indigo"])
    image = _gradient(size, top, bottom).convert("RGBA")
    if slide.imageBase64:
        image = _cover(_decode_image(slide.imageBase64), size).convert("RGBA")
        scrim = Image.new("RGBA", size, (0, 0, 0, 125))
        image.alpha_composite(scrim)
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = size
    accent = _color(design.accentColorHex, "#7C5CFF")
    draw.ellipse((width * 0.63, -height * 0.12, width * 1.12, height * 0.28), fill=accent + "32")
    draw.ellipse((-width * 0.2, height * 0.72, width * 0.3, height * 1.12), fill="#00D4FF24")
    draw.rounded_rectangle(
        (width * 0.07, height * 0.06, width * 0.18, height * 0.07),
        radius=max(4, width // 200),
        fill=accent,
    )
    return image


def render_slide(
    slide: CarouselSlide,
    design: CarouselDesign,
    index: int,
    total: int,
) -> Image.Image:
    size = RATIOS.get(design.aspectRatio, RATIOS["4:5"])
    width, height = size
    image = _base(slide, design, size, index)
    draw = ImageDraw.Draw(image, "RGBA")
    light_theme = design.backgroundTheme in {"Solid Light", "Minimal"} and not slide.imageBase64
    text = _color(design.textColorHex, "#111827" if light_theme else "#FFFFFF")
    accent = _color(design.accentColorHex, "#7C5CFF")
    scale = design.baseFontScale
    margin = int(width * 0.09)

    if slide.subtext:
        sub_font = _font(design.fontFamily, int(width * 0.028 * scale), bold=True)
        sub = slide.subtext.upper()
        sub_w = draw.textbbox((0, 0), sub, font=sub_font)[2]
        pill_y = int(height * 0.13)
        draw.rounded_rectangle(
            (width // 2 - sub_w // 2 - 24, pill_y - 14, width // 2 + sub_w // 2 + 24, pill_y + int(width * 0.045)),
            radius=24,
            fill=accent + "CC",
        )
        draw.text((width // 2 - sub_w // 2, pill_y), sub, font=sub_font, fill="#FFFFFF")

    headline_font = _font(design.fontFamily, int(width * 0.075 * scale), bold=True)
    body_font = _font(design.fontFamily, int(width * 0.035 * scale), bold=False)
    headline_top = int(height * (0.21 if slide.subtext else 0.16))
    headline_bottom = int(height * 0.56)
    _draw_multiline(
        image,
        slide.headline,
        (margin, headline_top, width - margin, headline_bottom),
        headline_font,
        text,
        effect=design.textEffect,
        spacing=int(width * 0.016),
    )
    _draw_multiline(
        image,
        slide.body,
        (int(width * 0.13), int(height * 0.53), int(width * 0.87), int(height * 0.76)),
        body_font,
        text,
        effect="shadow" if slide.imageBase64 else "none",
        spacing=int(width * 0.012),
    )

    small = _font(design.fontFamily, int(width * 0.025 * scale), bold=True)
    if index == total and design.ctaText:
        cta = design.ctaText
        cta_w = draw.textbbox((0, 0), cta, font=small)[2]
        cta_y = int(height * 0.82)
        draw.rounded_rectangle(
            (width // 2 - cta_w // 2 - 34, cta_y - 18, width // 2 + cta_w // 2 + 34, cta_y + int(width * 0.05)),
            radius=28,
            fill=accent,
        )
        draw.text((width // 2 - cta_w // 2, cta_y), cta, font=small, fill="#FFFFFF")
    elif design.showSwipe and index < total:
        swipe = "Geser untuk lanjut  →"
        swipe_w = draw.textbbox((0, 0), swipe, font=small)[2]
        draw.text((width // 2 - swipe_w // 2, int(height * 0.84)), swipe, font=small, fill=text)

    footer_font = _font(design.fontFamily, int(width * 0.021 * scale), bold=False)
    if design.watermarkText:
        draw.text((margin, int(height * 0.93)), design.watermarkText, font=footer_font, fill=text)
    if design.showPageNumber:
        page = f"{index:02d} / {total:02d}"
        page_w = draw.textbbox((0, 0), page, font=footer_font)[2]
        draw.text((width - margin - page_w, int(height * 0.93)), page, font=footer_font, fill=text)

    if design.logoBase64:
        logo = _decode_image(design.logoBase64).convert("RGBA")
        max_w = int(width * 0.12)
        ratio = max_w / max(1, logo.width)
        logo = logo.resize((max_w, max(1, int(logo.height * ratio))), Image.Resampling.LANCZOS)
        image.alpha_composite(logo, (width - margin - logo.width, int(height * 0.07)))
    return image.convert("RGB")


def _file_url(relative: str, public_base: str) -> str:
    return (public_base or "").rstrip("/") + "/files/" + relative.replace(os.sep, "/")


def render_carousel(payload: CarouselPayload, work_dir: str, public_base: str = "") -> dict:
    job = "car_" + uuid.uuid4().hex[:12]
    relative_dir = os.path.join("carousel", job)
    out_dir = os.path.join(work_dir, relative_dir)
    os.makedirs(out_dir, exist_ok=True)
    image_urls: list[str] = []
    paths: list[str] = []
    total = len(payload.slides)
    for index, slide in enumerate(payload.slides, start=1):
        image = render_slide(slide, payload.design, index, total)
        name = f"slide-{index:02d}.png"
        path = os.path.join(out_dir, name)
        image.save(path, format="PNG", optimize=True)
        paths.append(path)
        image_urls.append(_file_url(os.path.join(relative_dir, name), public_base))
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", payload.title).strip("-")[:50] or "carousel"
    zip_name = safe + ".zip"
    zip_path = os.path.join(out_dir, zip_name)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, arcname=os.path.basename(path))
    return {
        "job": job,
        "images": image_urls,
        "zipUrl": _file_url(os.path.join(relative_dir, zip_name), public_base),
    }
