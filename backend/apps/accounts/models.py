import uuid

from django.db import models


class UserProfile(models.Model):
    """
    Thin mirror of a Cognito user. Created lazily on first /api/auth/me call.
    No password is stored here — authentication is handled entirely by Cognito.
    """

    cognito_sub = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_userprofile"

    def __str__(self) -> str:
        return self.email
