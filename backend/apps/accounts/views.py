import uuid

from django.conf import settings
from django.core import signing
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notes.seeds import seed_default_categories

from .authentication import CognitoUser
from .models import UserProfile
from .serializers import UserProfileSerializer


class MeView(APIView):
    """
    GET /api/auth/me — returns the current user profile.

    Creates the profile (and seeds default categories) on first call.
    Used by the frontend AuthProvider to hydrate user state on F5 / page load.
    """

    def get(self, request: Request) -> Response:
        cognito_user: CognitoUser = request.user  # type: ignore[assignment]

        profile, created = UserProfile.objects.get_or_create(
            cognito_sub=cognito_user.sub,
            defaults={
                "email": cognito_user.email,
                "display_name": cognito_user.username or cognito_user.email.split("@")[0],
            },
        )

        if created:
            seed_default_categories(cognito_sub=cognito_user.sub)

        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)


class HealthView(APIView):
    """GET /api/healthz — used by ALB health checks (no auth required)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class DevTokenView(APIView):
    """
    POST /api/auth/dev-token — issues a Django-signed dev token.

    Only available when DEBUG=True. Accepts any valid email and returns
    a signed token that DevJWTAuthentication will accept. No password
    required — for local development only.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        if not settings.DEBUG:
            return Response({"detail": "Not available in production."}, status=403)

        email = str(request.data.get("email", "")).strip().lower()
        if not email or "@" not in email:
            return Response({"detail": "A valid email address is required."}, status=400)

        # Deterministic UUID from email — same email always maps to the same UUID
        sub = str(uuid.uuid5(uuid.NAMESPACE_URL, f"dev:{email}"))
        token = signing.dumps({"sub": sub, "email": email}, salt="dev-auth")
        return Response({"access_token": token, "email": email})
