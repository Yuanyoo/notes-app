# ── Stage 1: build wheels ────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install wheels from builder
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/*.whl && \
    rm -rf /wheels

# Copy source
COPY . .

# Collect static files (DJANGO_SETTINGS_MODULE must work at build time)
RUN SECRET_KEY=placeholder DEBUG=false \
    DATABASE_URL=postgres://x:x@localhost/x \
    COGNITO_ISSUER=https://example.com \
    COGNITO_CLIENT_ID=x \
    COGNITO_JWKS_URI=https://example.com/.well-known/jwks.json \
    python manage.py collectstatic --noinput

# Non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/auth/healthz')"

CMD ["gunicorn", "config.wsgi", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "30", \
     "--access-logfile", "-"]
