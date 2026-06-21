import uuid

from django.db.models import QuerySet
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.request import Request

from apps.accounts.authentication import CognitoUser

from .models import Category, Note
from .serializers import CategorySerializer, NoteListSerializer, NoteSerializer


def _sub(request: Request) -> uuid.UUID:
    """Extract the cognito_sub UUID from the authenticated request."""
    user: CognitoUser = request.user  # type: ignore[assignment]
    return uuid.UUID(user.sub)


class CategoryViewSet(viewsets.ModelViewSet[Category]):
    serializer_class = CategorySerializer

    def get_queryset(self) -> QuerySet[Category]:
        return Category.objects.filter(cognito_sub=_sub(self.request))

    def perform_create(self, serializer: CategorySerializer) -> None:  # type: ignore[override]
        serializer.save(cognito_sub=_sub(self.request))

    def perform_destroy(self, instance: Category) -> None:
        if instance.is_default:
            raise PermissionDenied("Default categories cannot be deleted.")
        instance.delete()


class NoteViewSet(viewsets.ModelViewSet[Note]):
    def get_serializer_class(self) -> type[NoteSerializer | NoteListSerializer]:
        if self.action == "list":
            return NoteListSerializer
        return NoteSerializer

    def get_queryset(self) -> QuerySet[Note]:
        qs = Note.objects.filter(cognito_sub=_sub(self.request)).select_related("category")

        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)

        pinned = self.request.query_params.get("pinned")
        if pinned is not None:
            flag = pinned.lower() in ("1", "true", "yes")
            qs = qs.filter(data__pinned=flag)

        return qs

    def perform_create(self, serializer: NoteSerializer) -> None:  # type: ignore[override]
        category = self._resolve_category(serializer)
        serializer.save(cognito_sub=_sub(self.request), category=category)

    def perform_update(self, serializer: NoteSerializer) -> None:  # type: ignore[override]
        category = self._resolve_category(serializer)
        serializer.save(category=category)

    def _resolve_category(
        self, serializer: NoteSerializer | NoteListSerializer
    ) -> Category | None:
        category_id = serializer.validated_data.pop("category_id", None)
        if category_id is None:
            return None
        try:
            return Category.objects.get(id=category_id, cognito_sub=_sub(self.request))
        except Category.DoesNotExist as exc:
            raise ValidationError({"category_id": "Category not found."}) from exc
