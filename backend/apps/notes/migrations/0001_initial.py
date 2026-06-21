import uuid

import django.db.models.deletion
import django.utils.timezone
from django.contrib.postgres.indexes import GinIndex
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies: list[tuple[str, str]] = []

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("cognito_sub", models.UUIDField(db_index=True)),
                ("name", models.CharField(max_length=64)),
                ("slug", models.SlugField(max_length=80)),
                ("color", models.CharField(default="#A0A0A0", max_length=7)),
                ("is_default", models.BooleanField(default=False)),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Note",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("cognito_sub", models.UUIDField(db_index=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notes",
                        to="notes.category",
                    ),
                ),
                ("title", models.CharField(db_index=True, max_length=200)),
                ("data", models.JSONField(default=dict)),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=["cognito_sub", "slug"], name="unique_user_category_slug"
            ),
        ),
        migrations.AddIndex(
            model_name="note",
            index=models.Index(
                fields=["cognito_sub", "category", "-updated_at"],
                name="note_sub_cat_updated_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="note",
            index=GinIndex(fields=["data"], name="note_data_gin_idx"),
        ),
    ]
