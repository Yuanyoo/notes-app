import uuid
from collections.abc import Iterable

from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    """
    Per-user note category. The 4 default categories (seeded on first login)
    have is_default=True and cannot be deleted — only renamed/recolored.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cognito_sub = models.UUIDField(db_index=True)
    name = models.CharField(max_length=64)
    slug = models.SlugField(max_length=80)
    color = models.CharField(max_length=7, default="#A0A0A0")  # hex
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("cognito_sub", "slug")]
        ordering = ["name"]

    def save(
        self,
        force_insert: "bool | tuple[type, ...]" = False,
        force_update: bool = False,
        using: str | None = None,
        update_fields: "Iterable[str] | None" = None,
    ) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(
            force_insert=force_insert,  # type: ignore[arg-type]
            force_update=force_update,
            using=using,
            update_fields=update_fields,
        )

    def __str__(self) -> str:
        return self.name


class Note(models.Model):
    """
    User note with a schemaless JSONB payload for the Tiptap doc + metadata.

    `data` shape:
      {
        "content": <TiptapDoc>,   # the rich-text document
        "tags": [...],            # optional tag list
        "pinned": false,          # pinned flag
      }
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cognito_sub = models.UUIDField(db_index=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notes",
    )
    title = models.CharField(max_length=200, db_index=True)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["cognito_sub", "category", "-updated_at"]),
            GinIndex(fields=["data"]),
        ]
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.title
