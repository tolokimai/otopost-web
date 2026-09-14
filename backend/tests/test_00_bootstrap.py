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
