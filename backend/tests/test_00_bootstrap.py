import os
import tempfile
import unittest
from pathlib import Path

_db_path = Path(tempfile.gettempdir()) / "otopost-test-bootstrap.db"
_db_path.unlink(missing_ok=True)
os.environ["DATABASE_URL"] = "sqlite:///" + str(_db_path)
os.environ["JWT_SECRET"] = "unit-test-only-secret-not-for-production"
os.environ["ADMIN_EMAILS"] = "owner@test.local"

from app.db import models
from app.db.base import SessionLocal, init_db
from app.services.bootstrap import seed_defaults
from app.services.runtime_config import get_string, store_value


class BootstrapTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_settings_routes_are_registered(self):
        from app.main import app

        registered_paths = set(app.openapi()["paths"])
        self.assertTrue(
            {
                "/api/settings/integrations",
                "/api/settings/test-connection",
                "/api/settings/schedule-preferences",
                "/api/personas/generate",
                "/api/content-plans/generate-themes",
            }.issubset(registered_paths)
        )

    def test_persona_repository_scopes_data_to_user(self):
        from app.repositories.persona_repo import PersonaRepository
        from app.routers.persona import (
            PersonaCreate,
            PersonaUpdate,
            create_persona,
            delete_persona,
            list_personas,
            set_default_persona,
            update_persona,
        )
        from app.routers.content_plan import GenerateThemesRequest, generate_themes
        from fastapi import HTTPException
        from unittest.mock import patch

        request = PersonaCreate(
            name="Demo",
            niche="Education",
            toneOfVoice="Clear",
            targetAudience="Creators",
            signatureHook="Start here",
            dos="Be useful",
            donts="Avoid fluff",
            isDefault=True,
        )
        self.assertEqual(request.model_dump()["tone_of_voice"], "Clear")
        self.assertTrue(request.model_dump()["is_default"])

        with SessionLocal() as db:
            owner = models.User(
                email="persona-owner@test.local",
                name="Persona Owner",
                password_hash="test-hash",
            )
            other = models.User(
                email="persona-other@test.local",
                name="Other User",
                password_hash="test-hash",
            )
            db.add_all([owner, other])
            db.commit()
            db.refresh(owner)
            db.refresh(other)
            repository = PersonaRepository(db)
            created = create_persona(request, user=owner, db=db)
            saved_id = created["id"]

            listed = list_personas(user=owner, db=db)["personas"]
            self.assertEqual(len(listed), 1)
            self.assertEqual(listed[0]["toneOfVoice"], "Clear")
            self.assertEqual(len(repository.list_for_user(owner.id)), 1)
            self.assertEqual(repository.list_for_user(other.id), [])
            self.assertIsNone(repository.get_for_user(saved_id, other.id))
            with patch(
                "app.routers.content_plan.generate",
                return_value='[{"title":"Tema uji","description":"Deskripsi","targetGoal":"Growth"}]',
            ):
                themes = generate_themes(
                    GenerateThemesRequest(persona_id=saved_id),
                    user=owner,
                    db=db,
                )
                self.assertEqual(themes["themes"][0]["title"], "Tema uji")
                with self.assertRaises(HTTPException) as error:
                    generate_themes(
                        GenerateThemesRequest(persona_id=saved_id),
                        user=other,
                        db=db,
                    )
                self.assertEqual(error.exception.status_code, 404)
            self.assertEqual(
                update_persona(
                    saved_id,
                    PersonaUpdate(toneOfVoice="Warm"),
                    user=owner,
                    db=db,
                ),
                {"ok": True},
            )
            self.assertTrue(set_default_persona(saved_id, user=owner, db=db)["ok"])
            self.assertEqual(list_personas(user=owner, db=db)["personas"][0]["toneOfVoice"], "Warm")
            self.assertTrue(delete_persona(saved_id, user=owner, db=db)["ok"])
            self.assertEqual(list_personas(user=owner, db=db)["personas"], [])

            db.delete(owner)
            db.delete(other)
            db.commit()

    def test_content_plan_roadmaps_are_saved_per_user(self):
        from fastapi import HTTPException
        from pydantic import ValidationError
        from unittest.mock import patch

        from app.repositories.content_plan_repo import ContentPlanRepository
        from app.routers.content_plan import (
            ContentPlanCreate,
            ContentPlanUpdate,
            GenerateRoadmapRequest,
            create_content_plan,
            delete_content_plan,
            generate_roadmap,
            list_content_plans,
            send_to_studio,
            update_content_plan,
        )

        with SessionLocal() as db:
            owner = models.User(
                email="contentplan-owner@test.local",
                name="Content Plan Owner",
                password_hash="test-hash",
            )
            other = models.User(
                email="contentplan-other@test.local",
                name="Other User",
                password_hash="test-hash",
            )
            db.add_all([owner, other])
            db.commit()
            db.refresh(owner)
            db.refresh(other)
            persona = models.Persona(user_id=owner.id, name="Planner", niche="Education")
            db.add(persona)
            db.commit()
            db.refresh(persona)

            created = create_content_plan(
                ContentPlanCreate(persona_id=persona.id, topic="Manual topic"),
                user=owner,
                db=db,
            )
            with self.assertRaises(ValidationError):
                GenerateRoadmapRequest(
                    persona_id=persona.id,
                    theme="Education series",
                    formats=[],
                )

            with patch(
                "app.routers.content_plan.generate",
                return_value='[{"dayNumber":1,"format":"PODCAST_CLIP","topic":"AI topic"}]',
            ):
                ai_result = generate_roadmap(
                    GenerateRoadmapRequest(
                        persona_id=persona.id,
                        theme="Education series",
                        formats=["REMAKE"],
                        save_to_db=False,
                    ),
                    user=owner,
                    db=db,
                )
            self.assertEqual(ai_result["roadmap"][0]["format"], "REMAKE")

            format_cases = (
                (7, None),
                (14, ["CAROUSEL", "REELS"]),
                (30, ["REMAKE"]),
            )
            for duration, selected_formats in format_cases:
                with patch("app.routers.content_plan.generate", side_effect=RuntimeError):
                    request = GenerateRoadmapRequest(
                        persona_id=persona.id,
                        theme="Education series",
                        duration_days=duration,
                        **({"formats": selected_formats} if selected_formats else {}),
                    )
                    result = generate_roadmap(request, user=owner, db=db)
                self.assertEqual(result["count"], duration)
                allowed_formats = set(selected_formats or ("CAROUSEL", "PODCAST_CLIP", "REMAKE", "REELS"))
                self.assertTrue(
                    {item["format"] for item in result["roadmap"]}.issubset(allowed_formats)
                )

            repository = ContentPlanRepository(db)
            owner_plans = repository.list_for_user(owner.id, persona.id)
            self.assertEqual(len(owner_plans), 52)
            self.assertEqual(repository.list_for_user(other.id), [])
            self.assertEqual(
                len(list_content_plans(persona_id=None, status_filter=None, user=other, db=db)["plans"]),
                0,
            )
            with self.assertRaises(HTTPException) as error:
                update_content_plan(
                    created["id"],
                    ContentPlanUpdate(topic="Unauthorized"),
                    user=other,
                    db=db,
                )
            self.assertEqual(error.exception.status_code, 404)

            update_content_plan(
                created["id"],
                ContentPlanUpdate(topic="Updated topic"),
                user=owner,
                db=db,
            )
            sent = send_to_studio(created["id"], user=owner, db=db)
            self.assertEqual(sent["payload"]["topic"], "Updated topic")
            self.assertEqual(sent["payload"]["id"], created["id"])
            self.assertEqual(sent["payload"]["dayNumber"], 1)
            self.assertEqual(sent["payload"]["hashtags"], "")
            self.assertTrue(delete_content_plan(created["id"], user=owner, db=db)["ok"])

            for plan in repository.list_for_user(owner.id):
                repository.delete_for_user(plan.id, owner.id)
            db.delete(persona)
            db.delete(owner)
            db.delete(other)
            db.commit()

    def test_catalogs_are_seeded_idempotently(self):
        init_db()
        with SessionLocal() as db:
            self.assertGreaterEqual(db.query(models.PlanConfig).count(), 3)
            self.assertGreaterEqual(db.query(models.StudioMenu).count(), 5)
            self.assertGreaterEqual(db.query(models.AppSetting).count(), 10)
            self.assertTrue(db.get(models.StudioMenu, "carousel").is_ready)
            self.assertTrue(db.get(models.StudioMenu, "remake").is_ready)

    def test_secret_settings_are_encrypted(self):
        with SessionLocal() as db:
            row = db.get(models.AppSetting, "musetalk_worker_token")
            store_value(row, "worker-secret-value")
            db.add(row)
            db.commit()
            db.refresh(row)
            self.assertNotEqual(row.value, "worker-secret-value")
            self.assertEqual(get_string(db, row.key), "worker-secret-value")

    def test_admin_email_bootstrap(self):
        with SessionLocal() as db:
            user = models.User(
                email="owner@test.local",
                name="Owner",
                password_hash="test-hash",
                plan="free",
                credits=0,
                is_active=True,
                is_admin=False,
            )
            db.add(user)
            db.commit()
            seed_defaults(db)
            db.refresh(user)
            self.assertTrue(user.is_admin)


if __name__ == "__main__":
    unittest.main()
