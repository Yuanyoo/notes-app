# Notes TurboAI

A full-stack notes app with rich-text editing, per-user categories, and a warm Figma-matched UI.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Tiptap · TanStack Query |
| Backend | Django 5 · Django REST Framework · Python 3.12 |
| Auth | AWS Cognito (PKCE, httpOnly cookies) — or **dev-mode email login** (no AWS needed) |
| Database | PostgreSQL 16 with JSONB note content (Docker locally, RDS on AWS) |
| Infra | Terraform · ECS Fargate · ALB · ECR · RDS · Secrets Manager |

---

## Local development

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (`python3`)
- Node.js 20+

Cognito is **not** required for local development — see dev-mode auth below.

### 1. Start Postgres

```bash
cp .env.example .env
docker compose up -d db
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver          # → http://localhost:8000
```

Confirm it's alive: `curl http://localhost:8000/api/auth/healthz` → `{"status":"ok"}`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                         # → http://localhost:3000
```

Open `http://localhost:3000`. You'll see the login page.

---

## Authentication

### Dev mode (default — no AWS needed)

When `COGNITO_CLIENT_ID` is empty in `frontend/.env.local` (the default), the login page shows an **email-only form**. Enter any email address and click Log In.

How it works:
```
Browser → POST /api/auth/dev-login (Next.js)
Next.js → POST /api/auth/dev-token (Django, DEBUG=True only)
Django  → signs { sub, email } with SECRET_KEY using django.core.signing
Next.js → stores signed token in httpOnly cognito_access cookie
All API calls use the same cookie → DevJWTAuthentication validates it
```

The `DevTokenView` and `DevJWTAuthentication` are **only active when `DEBUG=True`** and are completely absent in production.

### Production (Cognito PKCE)

```
Browser → GET /api/auth/login (Next.js) → redirect to Cognito hosted UI
Cognito → GET /api/auth/callback (Next.js) → exchange code for tokens
Next.js → set httpOnly cookies (access + refresh + id)
Browser → any API call → /api/proxy/[...path] (Next.js Route Handler)
Next.js → Django with Authorization: Bearer <access_token from cookie>
Django  → validate JWT against Cognito JWKS (RS256, cached in-memory)
```

Tokens never reach browser JavaScript. Session survives F5 via `AuthProvider` calling `/api/auth/me` on mount. Expired access tokens are refreshed transparently by an axios interceptor.

To enable Cognito, fill in `frontend/.env.local`:
```env
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=<your-app-client-id>
COGNITO_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
```

App Client callback URLs must include:
- `http://localhost:3000/api/auth/callback` (local)
- `http://<alb-dns>/api/auth/callback` (production)

---

## UI design

The interface was implemented from a [Figma file](https://www.figma.com/design/E6KjyRxEvuWhZA4sPbIdI7/Notes-Taking-App-Challenge) using the Figma MCP. Key design tokens:

| Token | Value |
|---|---|
| Background | `#faf1e3` (warm cream) |
| Primary brown | `#957139` (buttons, borders, links) |
| Heading brown | `#88642a` (titles, empty-state text) |
| Body font | Inter |
| Title font | Inria Serif Bold |

**Screens:**
- **Login** — sleeping cat illustration, "Yay, You're Back!" heading, email field
- **Notes grid** — 3-column card grid; each card is color-coded by category
- **Empty state** — boba tea illustration, "I'm just here waiting for your charming notes..."
- **Note editor** — full-width colored card, category dropdown, Tiptap body, autosave

**Category colors:**

| Category | Border | Background |
|---|---|---|
| Random Thoughts | `#ef9c66` | `rgba(239,156,102,0.5)` |
| School | `#fcdc94` | `rgba(252,220,148,0.5)` |
| Personal | `#78aba8` | `rgba(120,171,168,0.5)` |
| Drama | `#d4a5c9` | `rgba(212,165,201,0.5)` |

---

## Database model

```python
class Note(models.Model):
    cognito_sub = models.CharField(db_index=True)   # no FK to a user table
    category    = models.ForeignKey(Category, ...)
    title       = models.CharField(max_length=200)
    data        = models.JSONField(default=dict)     # { content, tags, pinned }
```

- Tiptap document, tags, and pinned flag live in `data` — schema changes need no migration.
- A GIN index makes tag/metadata queries efficient.
- `cognito_sub` is used directly; there is no `auth.User` table.
- `UserProfile` (keyed by `cognito_sub`) is created lazily on the first `/api/auth/me` call and seeds the four default categories.

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/me` | ✓ | Current user profile (creates on first call) |
| GET | `/api/auth/healthz` | — | ALB health check |
| POST | `/api/auth/dev-token` | — | Dev-mode token (DEBUG=True only) |
| GET/POST | `/api/notes/` | ✓ | List / create notes |
| GET/PATCH/DELETE | `/api/notes/<id>/` | ✓ | Note detail |
| GET/POST | `/api/categories/` | ✓ | List / create categories |
| PATCH/DELETE | `/api/categories/<id>/` | ✓ | Category detail |

---

## Deploy to AWS

Requires `AWS_REGION`, `AWS_ACCOUNT_ID`, and `ENV` exported, plus Cognito configured:

```bash
export AWS_REGION=us-east-1 AWS_ACCOUNT_ID=123456789012 ENV=dev
bash scripts/deploy.sh
```

Steps performed:
1. `terraform apply` — provisions VPC, ECR repos, RDS, Cognito, ECS cluster, ALB
2. ECR login + `docker buildx build --platform linux/amd64` + push (backend & frontend)
3. Second `terraform apply` — rolls task definitions to new image tags
4. One-off Fargate task: `python manage.py migrate --noinput`
5. `aws ecs update-service --force-new-deployment` → prints ALB URL

Tear down: `bash scripts/destroy.sh`

### Cost ballpark (us-east-1, idle dev env)

| Resource | ~$/mo |
|---|---|
| ALB | $16 |
| 2× Fargate (0.25 vCPU / 0.5 GB) | $30 |
| RDS db.t4g.micro + 20 GB gp3 | $13 |
| **NAT Gateway** (main cost driver) | **$32** |
| Cognito (< 50k MAU) | free |
| ECR + CloudWatch + data transfer | ~$5 |
| **Total** | **~$96/mo** |

Replace the NAT Gateway with VPC endpoints for ECR, S3, SSM, and Secrets Manager to cut dev costs significantly.

---

## Project structure

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/         Auth: CognitoJWTAuthentication, DevJWTAuthentication,
│   │   │                     DevTokenView, UserProfile, /api/auth/me
│   │   └── notes/            Category + Note (JSONB) models, DRF viewsets, seeds
│   ├── config/               Django settings, URLs, WSGI
│   └── manage.py
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/       Login page (dev-mode form or Cognito button)
│       │   ├── (app)/              Protected layout, notes grid, note editor,
│       │   │                       category-filtered views
│       │   └── api/auth/           Route Handlers: dev-login, login, callback,
│       │                           refresh, logout, me, proxy
│       ├── components/
│       │   ├── auth/               AuthProvider, DevLoginForm
│       │   └── notes/              CategorySidebar, NoteList (grid), NoteEditor
│       ├── hooks/                  useNotes, useCategories
│       └── lib/                    api.ts, cognito.ts, cookies.ts, tiptap-utils.ts
├── infra/
│   └── modules/              network, ecr, auth, data, alb, ecs
├── scripts/
│   ├── deploy.sh
│   └── destroy.sh
├── .cursor/rules/            readme-sync.mdc (keep README current)
├── AGENTS.md
├── docker-compose.yml
└── .env.example
```

## Quality gates

Run before every commit:

```bash
# Backend
cd backend && ruff check . --fix && mypy .

# Frontend
cd frontend && npm run typecheck && npm run lint -- --quiet
```
