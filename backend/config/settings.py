from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    COOKIE_SECURE=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS: list[str] = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.accounts",
    "apps.notes",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://notes:notes@localhost:5432/notes")
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── DRF ─────────────────────────────────────────────────────────────────────
_auth_classes = ["apps.accounts.authentication.CognitoJWTAuthentication"]
if DEBUG:
    # DevJWTAuthentication is tried first; it passes through tokens it doesn't
    # recognise so CognitoJWTAuthentication still works alongside it.
    _auth_classes.insert(0, "apps.accounts.authentication.DevJWTAuthentication")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": _auth_classes,
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    # We don't use django.contrib.auth — disable DRF's AnonymousUser dependency
    "UNAUTHENTICATED_USER": None,
}

# ─── CORS ────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS: list[str] = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000"],
)
CORS_ALLOW_CREDENTIALS = True

# ─── Cognito ─────────────────────────────────────────────────────────────────
COGNITO_REGION: str = env("COGNITO_REGION", default="us-east-1")
COGNITO_USER_POOL_ID: str = env("COGNITO_USER_POOL_ID", default="")
COGNITO_CLIENT_ID: str = env("COGNITO_CLIENT_ID", default="")
COGNITO_ISSUER: str = env("COGNITO_ISSUER", default="")
COGNITO_JWKS_URI: str = env("COGNITO_JWKS_URI", default="")
