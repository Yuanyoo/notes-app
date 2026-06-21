from django.conf import settings
from django.urls import path

from .views import DevTokenView, HealthView, MeView

urlpatterns = [
    path("me", MeView.as_view(), name="auth-me"),
    path("healthz", HealthView.as_view(), name="healthz"),
]

if settings.DEBUG:
    urlpatterns += [
        path("dev-token/", DevTokenView.as_view(), name="dev-token"),
    ]
