"""
CognitoJWTAuthentication — validates RS256 access tokens issued by AWS Cognito.

The JWKS is fetched once per process and cached in memory. When an unknown
key-id is encountered (key rotation), the cache is refreshed automatically.

DevJWTAuthentication — only active when DEBUG=True. Validates tokens issued
by DevTokenView using Django's built-in signing module (no AWS required).
"""

import time
from typing import Any

import jwt
import requests
from django.conf import settings
from django.core import signing
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request

JWKS_CACHE_TTL = 3600  # seconds


class CognitoUser:
    """Lightweight user object populated from a decoded Cognito access token."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, sub: str, email: str, username: str) -> None:
        self.sub = sub
        self.email = email
        self.username = username
        # pk is referenced by some DRF internals
        self.pk = sub

    def __str__(self) -> str:
        return self.email


_jwks_cache: dict[str, Any] = {}
_jwks_fetched_at: float = 0.0


def _get_public_key(kid: str) -> Any:
    global _jwks_cache, _jwks_fetched_at

    if kid not in _jwks_cache or (time.time() - _jwks_fetched_at) > JWKS_CACHE_TTL:
        _refresh_jwks()

    # If still missing after refresh → key rotation or bad token
    if kid not in _jwks_cache:
        raise AuthenticationFailed("Unknown JWT key id — possible key rotation issue.")

    return _jwks_cache[kid]


def _refresh_jwks() -> None:
    global _jwks_cache, _jwks_fetched_at

    jwks_uri = settings.COGNITO_JWKS_URI
    if not jwks_uri:
        raise AuthenticationFailed("COGNITO_JWKS_URI is not configured.")

    try:
        resp = requests.get(jwks_uri, timeout=5)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
    except Exception as exc:
        raise AuthenticationFailed(f"Could not fetch Cognito JWKS: {exc}") from exc

    _jwks_cache = {
        key["kid"]: jwt.algorithms.RSAAlgorithm.from_jwk(key)
        for key in keys
    }
    _jwks_fetched_at = time.time()


class CognitoJWTAuthentication(BaseAuthentication):
    """
    Reads the Authorization: Bearer <token> header, validates against
    Cognito JWKS, and returns a (CognitoUser, token) tuple.
    """

    def authenticate(self, request: Request) -> tuple[CognitoUser, str] | None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        return self._decode(token)

    def _decode(self, token: str) -> tuple[CognitoUser, str]:
        try:
            unverified_header = jwt.get_unverified_header(token)
        except jwt.DecodeError as exc:
            raise AuthenticationFailed("Invalid JWT header.") from exc

        kid = unverified_header.get("kid")
        if not kid:
            raise AuthenticationFailed("JWT missing key id.")

        public_key = _get_public_key(kid)

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"require": ["exp", "iat", "iss", "sub"]},
                issuer=settings.COGNITO_ISSUER,
                audience=settings.COGNITO_CLIENT_ID,
                leeway=10,
            )
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationFailed("Access token has expired.") from exc
        except jwt.InvalidAudienceError as exc:
            raise AuthenticationFailed("Invalid token audience.") from exc
        except jwt.InvalidIssuerError as exc:
            raise AuthenticationFailed("Invalid token issuer.") from exc
        except jwt.PyJWTError as exc:
            raise AuthenticationFailed(f"Token validation failed: {exc}") from exc

        if payload.get("token_use") != "access":
            raise AuthenticationFailed("Only access tokens are accepted.")

        user = CognitoUser(
            sub=payload["sub"],
            email=payload.get("email", ""),
            username=payload.get("username", payload.get("cognito:username", "")),
        )
        return user, token

    def authenticate_header(self, request: Request) -> str:
        return "Bearer"


class DevJWTAuthentication(BaseAuthentication):
    """
    Development-only authenticator. Validates tokens signed by DevTokenView
    using Django's SECRET_KEY. Returns None (passes through) for any token
    that doesn't look like a dev token so the next authenticator can try.

    NEVER active in production (guarded by settings.DEBUG).
    """

    _SALT = "dev-auth"
    _MAX_AGE = 86400 * 30  # 30 days

    def authenticate(self, request: Request) -> tuple[CognitoUser, str] | None:
        if not settings.DEBUG:
            return None

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()

        try:
            data: dict[str, str] = signing.loads(
                token, salt=self._SALT, max_age=self._MAX_AGE
            )
        except signing.SignatureExpired as exc:
            raise AuthenticationFailed("Dev token has expired.") from exc
        except signing.BadSignature:
            # Not a dev token — let CognitoJWTAuthentication try next
            return None

        user = CognitoUser(
            sub=data["sub"],
            email=data["email"],
            username=data["email"].split("@")[0],
        )
        return user, token

    def authenticate_header(self, request: Request) -> str:
        return "Bearer"
