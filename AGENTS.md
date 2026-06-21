# AGENTS.md — Notes TurboAI

Concise context for AI agents working on this repo.

## Stack overview

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Tiptap, TanStack Query |
| Backend | Django 5, Django REST Framework, Python 3.12 |
| Auth | AWS Cognito (User Pool, PKCE flow) — Django validates JWTs, Next.js holds cookies |
| Database | PostgreSQL 16 (Docker locally, RDS in AWS); notes stored as JSONB |
| Infra | Terraform, ECS Fargate, ALB, ECR, RDS, SSM, Secrets Manager |

## Project layout

```
Notes_TurboAI/
├── backend/        Django project (apps/accounts, apps/notes)
├── frontend/       Next.js app (src/app, src/components, src/hooks, src/lib)
├── infra/          Terraform (modules: network, data, auth, ecr, ecs, alb)
├── scripts/        deploy.sh, destroy.sh
└── docker-compose.yml   Postgres for local dev
```

## Local dev setup

```bash
cp .env.example .env          # fill Cognito vars from your AWS dev pool
docker compose up -d db

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver    # http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

## Auth flow (important for agents)

1. Browser clicks "Sign in" → GET `/api/auth/login` → Next.js redirects to Cognito hosted UI
2. Cognito redirects back to GET `/api/auth/callback?code=...` → Next.js exchanges code for tokens (PKCE)
3. Next.js sets `cognito_access`, `cognito_refresh`, `cognito_id` as **httpOnly, SameSite=Lax** cookies
4. `AuthProvider` mounts → calls GET `/api/auth/me` (Next.js Route Handler reads cookie, forwards `Authorization: Bearer <access_token>` to Django)
5. Django `CognitoJWTAuthentication` validates the JWT against cached Cognito JWKS (RS256)
6. On 401, axios interceptor calls POST `/api/auth/refresh` → Next.js rotates access cookie via Cognito refresh endpoint → retry
7. Logout: POST `/api/auth/logout` → clear cookies + redirect to Cognito logout URL

**Never** store tokens in `localStorage`. **Never** bypass `/api/*` Route Handlers to call Django directly from the browser.

## Environment variables

See `.env.example`. Key groups:
- `POSTGRES_*` / `DATABASE_URL` — local database
- `COGNITO_*` — filled in from `terraform -chdir=infra output` after provisioning
- `NEXT_PUBLIC_APP_URL`, `BACKEND_INTERNAL_URL`, `COOKIE_SECURE` — frontend routing
- `AWS_*`, `ENV` — only used by `scripts/deploy.sh`

## Quality gates

Always run before committing:
```bash
cd backend && ruff check . --fix && mypy .
cd frontend && npm run typecheck && npm run lint -- --quiet
```

## Data model highlights

- `Category`: per-user (`cognito_sub`), name/slug/color, `is_default` (4 seeded categories cannot be deleted)
- `Note`: per-user, FK to Category, `title` (CharField), `data` (JSONB — stores Tiptap doc + tags + pinned flag)
- GIN index on `Note.data` for tag/metadata queries without migrations

## Deploy

```bash
export AWS_REGION=us-east-1 AWS_ACCOUNT_ID=123456789012 ENV=dev
bash scripts/deploy.sh
```

This: terraform apply → docker build/push to ECR → terraform apply (roll task defs) → ecs run-task migrate → force redeploy → prints ALB URL.
