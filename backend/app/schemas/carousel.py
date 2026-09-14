from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class CarouselSlide(BaseModel):
    headline: str = Field(default="Judul slide", max_length=180)
    body: str = Field(default="", max_length=1200)
    subtext: str = Field(default="", max_length=180)
    imageBase64: Optional[str] = None


class CarouselDesign(BaseModel):
    aspectRatio: str = "4:5"
    backgroundTheme: str = "Gradient Indigo"
    typographyStyle: str = "Center Stage"
    fontFamily: str = "Sans"
    textColorHex: str = "#FFFFFF"
    accentColorHex: str = "#7C5CFF"
    baseFontScale: float = Field(default=1.0, ge=0.65, le=1.6)
    textEffect: str = "shadow"
    ctaText: str = "Simpan & bagikan"
    watermarkText: str = "@brandkamu"
    showPageNumber: bool = True
    showSwipe: bool = True
    logoBase64: Optional[str] = None

    @field_validator("aspectRatio")
    @classmethod
    def valid_ratio(cls, value: str) -> str:
        if value not in {"1:1", "4:5", "3:4", "9:16", "16:9"}:
            raise ValueError("Rasio tidak didukung")
        return value


class CarouselGenerateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    audience: str = Field(default="Kreator dan pemilik bisnis", max_length=300)
    goal: str = Field(default="Edukasi", max_length=100)
    tone: str = Field(default="Profesional dan menarik", max_length=100)
    slideCount: int = Field(default=7, ge=3, le=12)


class CarouselGenerateResponse(BaseModel):
    title: str
    slides: List[CarouselSlide]


class CarouselPayload(BaseModel):
    title: str = Field(default="Carousel baru", max_length=160)
    slides: List[CarouselSlide] = Field(min_length=1, max_length=12)
    design: CarouselDesign = Field(default_factory=CarouselDesign)


class CarouselRenderResponse(BaseModel):
    job: str
    images: List[str]
    zipUrl: str


class CarouselProjectOut(BaseModel):
    id: str
    title: str
    status: str
    payload: CarouselPayload
    output: dict
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
