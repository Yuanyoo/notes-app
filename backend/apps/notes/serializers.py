from rest_framework import serializers

from .models import Category, Note


class CategorySerializer(serializers.ModelSerializer[Category]):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "color", "is_default", "created_at"]
        read_only_fields = ["id", "slug", "is_default", "created_at"]

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Category name cannot be blank.")
        return value.strip()


class NoteSerializer(serializers.ModelSerializer[Note]):
    category_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Note
        fields = [
            "id",
            "category_id",
            "title",
            "data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value.strip()


class NoteListSerializer(serializers.ModelSerializer[Note]):
    """Lightweight serializer for list views — includes data for card previews."""

    category_id = serializers.UUIDField(allow_null=True)

    class Meta:
        model = Note
        fields = ["id", "category_id", "title", "data", "created_at", "updated_at"]
        read_only_fields = fields
