import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.audit import mask_sensitive, record_audit
from app.core.errors import (
    AppException,
    ConflictException,
    ErrorCode,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.pagination import PaginatedResult
from app.core.responses import success_response
from app.db.base import Base
from app.db.models import User
from app.repositories.audit_repo import AuditRepository
from app.repositories.user_repo import UserRepository


class TestArchitectureStandards(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, future=True)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_standard_response_envelope(self):
        resp = success_response(data={"foo": "bar"}, message="Sukses")
        self.assertTrue(resp["success"])
        self.assertEqual(resp["data"]["foo"], "bar")
        self.assertEqual(resp["message"], "Sukses")

    def test_error_catalog_codes(self):
        self.assertEqual(NotFoundException().code, ErrorCode.NOT_FOUND)
        self.assertEqual(ForbiddenException().code, ErrorCode.FORBIDDEN)
        self.assertEqual(ConflictException().code, ErrorCode.CONFLICT)
        self.assertEqual(ValidationException().code, ErrorCode.VALIDATION_ERROR)

    def test_standard_pagination(self):
        items = ["a", "b", "c"]
        res = PaginatedResult.create(items=items, total=25, page=1, limit=10)
        self.assertEqual(res.total, 25)
        self.assertEqual(res.page, 1)
        self.assertEqual(res.limit, 10)
        self.assertEqual(res.total_pages, 3)

    def test_mask_sensitive_data(self):
        data = {
            "email": "user@example.com",
            "password": "secret_password",
            "access_token": "jwt_token_123",
            "nested": {"token": "sub_token", "normal": "ok"},
        }
        masked = mask_sensitive(data)
        self.assertEqual(masked["email"], "user@example.com")
        self.assertEqual(masked["password"], "***MASKED***")
        self.assertEqual(masked["access_token"], "***MASKED***")
        self.assertEqual(masked["nested"]["token"], "***MASKED***")
        self.assertEqual(masked["nested"]["normal"], "ok")

    def test_user_repository_and_audit(self):
        user_repo = UserRepository(self.db)
        audit_repo = AuditRepository(self.db)

        user = User(email="test@example.com", password_hash="hash123", name="Test User")
        user_repo.add(user)

        found = user_repo.get_by_email("test@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "Test User")

        record_audit(
            self.db,
            action="CREATE",
            resource_type="user",
            actor_id=user.id,
            resource_id=user.id,
            detail={"email": "test@example.com"},
        )

        logs = audit_repo.list_recent()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, "CREATE")
        self.assertEqual(logs[0].resource_type, "user")


if __name__ == "__main__":
    unittest.main()

