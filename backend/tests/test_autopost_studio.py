import unittest
from datetime import datetime, timezone
from app.db import models
from app.db.base import SessionLocal, init_db
from app.routers import content_plan, dashboard, persona, settings_integrations


class TestAutoPostStudio(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_database_models_and_queries(self):
        with SessionLocal() as db:
            # Create a test user
            user = models.User(
                email="autopost_model_test@example.com",
                password_hash="testhash",
                name="Tester AutoPost",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # 1. Test Persona model
            p = models.Persona(
                user_id=user.id,
                name="Brand Persona 1",
                niche="Social Media Automation",
                tone_of_voice="Santai & Informatif",
                is_default=True,
            )
            db.add(p)
            db.commit()
            db.refresh(p)
            self.assertEqual(p.name, "Brand Persona 1")
            self.assertTrue(p.is_default)

            # 2. Test ContentPlan model
            cp = models.ContentPlan(
                user_id=user.id,
                persona_id=p.id,
                day_number=1,
                topic="Strategi Hook 3 Detik",
                format="CAROUSEL",
                status="DRAFT",
            )
            db.add(cp)
            db.commit()
            db.refresh(cp)
            self.assertEqual(cp.topic, "Strategi Hook 3 Detik")

            # 3. Test PostSchedule model
            ps = models.PostSchedule(
                user_id=user.id,
                content_plan_id=cp.id,
                title="Post Hari 1",
                format="CAROUSEL",
                scheduled_at=datetime.now(timezone.utc),
                status="PENDING",
            )
            db.add(ps)
            db.commit()
            db.refresh(ps)
            self.assertEqual(ps.status, "PENDING")

            # 4. Test Dashboard stats query
            stats = dashboard.get_dashboard_stats(user=user, db=db)
            self.assertGreaterEqual(stats["scheduled"], 1)
            self.assertGreaterEqual(stats["draft"], 1)

            # 5. Test Content plan send-to-studio
            send_res = content_plan.send_to_studio(plan_id=cp.id, user=user, db=db)
            self.assertTrue(send_res["ok"])
            self.assertEqual(send_res["targetUrl"], "/studio/carousel")

            # 6. Test Settings integrations
            integ_res = settings_integrations.get_integrations(user=user, db=db)
            self.assertIn("integrations", integ_res)
            self.assertIn("preferences", integ_res)

            # Clean up
            db.delete(user)
            db.commit()


if __name__ == "__main__":
    unittest.main()
