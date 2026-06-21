"""Default categories seeded for every new user on first /api/auth/me call."""

import uuid

from .models import Category

DEFAULT_CATEGORIES = [
    {"name": "Random Thoughts", "color": "#F59E0B"},
    {"name": "Personal", "color": "#10B981"},
    {"name": "School", "color": "#3B82F6"},
    {"name": "Drama", "color": "#EC4899"},
]


def seed_default_categories(cognito_sub: str) -> None:
    """Create the 4 default categories for a new user. Idempotent."""
    sub_uuid = uuid.UUID(cognito_sub) if isinstance(cognito_sub, str) else cognito_sub
    for cat in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            cognito_sub=sub_uuid,
            name=cat["name"],
            defaults={
                "color": cat["color"],
                "is_default": True,
            },
        )
