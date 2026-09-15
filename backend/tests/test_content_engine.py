import json
import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import content_models as cm
from app.db import models
from app.db.base import Base
from app.schemas.content_engine import ContentPlanGenerateRequest
from app.services.content_engine import item_out, parse_plan_ai, persona_out, seed_content_engine


class ContentEngineTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False, future=True)

    def tearDown(self):
        self.engine.dispose()

    def test_seed_is_idempotent_and_preserves_admin_change(self):
        with self.Session() as db:
            seed_content_engine(db)
            self.assertEqual(db.query(models.StudioMenu).count(), 3)
            menu = db.get(models.StudioMenu, "persona")
            self.assertIsNotNone(menu)
            menu.label = "Persona Kustom"
            db.add(menu)
            db.commit()
            seed_content_engine(db)
            self.assertEqual(db.query(models.StudioMenu).count(), 3)
            self.assertEqual(db.get(models.StudioMenu, "persona").label, "Persona Kustom")
            self.assertEqual(db.query(cm.SystemMeta).count(), 1)

    def test_plan_parser_clamps_schedule_and_workflow(self):
        raw = json.dumps({
            "strategy": {"positioning": "Praktis untuk creator sibuk", "contentMix": ["edukasi", "bukti", "offer"], "conversionPath": "Simpan lalu klik offer"},
            "items": [
                {"dayOffset": -10, "channel": "Instagram", "format": "Carousel", "pillar": "Edukasi", "title": "Hook pertama", "hook": "Stop posting tanpa arah", "angle": "Masalah", "objective": "Awareness", "cta": "Simpan", "brief": "Buat 7 slide", "keywords": ["konten"], "workflow": "carousel"},
                {"dayOffset": 99, "channel": "TikTok", "format": "Short video", "pillar": "Offer", "title": "Hook kedua", "workflow": "not-allowed"},
                {"dayOffset": 3, "title": "Hook ketiga", "workflow": "carousel"},
            ],
        }, ensure_ascii=False)
        strategy, items = parse_plan_ai(raw, date(2026, 9, 15), 7, 3, ["Instagram", "TikTok"], ["carousel"])
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]["scheduledDate"], date(2026, 9, 15))
        self.assertEqual(items[1]["scheduledDate"], date(2026, 9, 21))
        self.assertTrue(all(item["workflow"] == "carousel" for item in items))
        self.assertEqual(strategy["positioning"], "Praktis untuk creator sibuk")

    def test_serializers_do_not_leak_user_id(self):
        with self.Session() as db:
            user = models.User(email="owner@example.com", password_hash="x", name="Owner")
            db.add(user)
            db.flush()
            persona = cm.Persona(user_id=user.id, name="Utama", channels_json='["Instagram"]')
            db.add(persona)
            db.flush()
            item = cm.ContentItem(user_id=user.id, persona_id=persona.id, title="Ide", keywords_json='["ai"]')
            db.add(item)
            db.commit()
            self.assertNotIn("userId", persona_out(persona))
            self.assertNotIn("userId", item_out(item))
            self.assertEqual(persona_out(persona)["channels"], ["Instagram"])

    def test_duration_accepts_only_7_or_30(self):
        valid = ContentPlanGenerateRequest(personaId="12345678", durationDays=30, startDate="2026-09-15", channels=["Instagram"], workflows=["carousel"])
        self.assertEqual(valid.durationDays, 30)
        with self.assertRaises(Exception):
            ContentPlanGenerateRequest(personaId="12345678", durationDays=14, startDate="2026-09-15", channels=["Instagram"], workflows=["carousel"])


if __name__ == "__main__":
    unittest.main()
