import os
import tempfile
import unittest
import zipfile
from pathlib import Path

from PIL import Image

from app.schemas.carousel import CarouselDesign, CarouselPayload, CarouselSlide
from app.services.carousel_renderer import render_carousel


class CarouselRendererTest(unittest.TestCase):
    def test_png_and_zip_export(self):
        with tempfile.TemporaryDirectory() as work_dir:
            payload = CarouselPayload(
                title="Tes Carousel",
                slides=[
                    CarouselSlide(subtext="Slide 1", headline="Hook kuat", body="Isi yang mudah dibaca."),
                    CarouselSlide(subtext="Slide 2", headline="Ajakan", body="Simpan dan bagikan."),
                ],
                design=CarouselDesign(aspectRatio="4:5", backgroundTheme="Gradient Indigo"),
            )
            result = render_carousel(payload, work_dir, "http://test.local")
            self.assertEqual(len(result["images"]), 2)
            output_dir = next((Path(work_dir) / "carousel").iterdir())
            images = sorted(output_dir.glob("slide-*.png"))
            self.assertEqual(len(images), 2)
            with Image.open(images[0]) as image:
                self.assertEqual(image.size, (1080, 1350))
            archive = next(output_dir.glob("*.zip"))
            with zipfile.ZipFile(archive) as bundle:
                self.assertEqual(bundle.namelist(), ["slide-01.png", "slide-02.png"])
            self.assertTrue(result["zipUrl"].startswith("http://test.local/files/carousel/"))


if __name__ == "__main__":
    unittest.main()
