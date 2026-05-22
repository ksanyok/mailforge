# MailForge

A self-hosted, open-source email delivery, contact management, warmup, and deliverability monitoring platform.

## Features

- **Contact Management** — Import contacts from CSV/XLSX/JSON/TXT, manage lists, tags, engagement scoring, and risk scoring
- **Campaign Builder** — Multi-step wizard with HTML editor, variable interpolation, scheduling, and throttling
- **SMTP Sender Rotation** — Multiple SMTP accounts with round-robin, weighted, and health-based rotation
- **Email Warmup Engine** — Automated progressive warmup with configurable rules, auto-pause on critical metrics
- **Open/Click/Unsubscribe Tracking** — Pixel tracking, redirect tracking, one-click unsubscribe
- **Deliverability Monitoring** — SPF, DKIM, DMARC, MX, RDNS, SMTP and blacklist checks
- **Rules-Based Recommendations** — Automated alerts for bounce rates, complaint rates, DNS issues
- **Analytics Dashboard** — KPI cards, activity charts, campaign funnels, sender health comparison
- **Suppression List** — Global suppression management with automatic hard-bounce suppression
- **Role-Based Access Control** — Admin, Manager, Viewer roles
- **Notification System** — In-app notifications for key events
- **Audit Log** — Full activity trail

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10 + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Database | MySQL 8 via Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| UI | Tailwind CSS + Shadcn/ui + Recharts |
| Monorepo | pnpm workspaces + Turborepo |
| Container | Docker + Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ and pnpm 9+

### With Docker (recommended)

```bash
# Clone the repository
git clone https://github.com/ksanyok/mailforge.git
cd mailforge

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start all services
docker compose up -d

# Run migrations and seed
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
```

Access the app at [http://localhost:3000](http://localhost:3000)

Default credentials: `admin@mailforge.local` / `Admin123!`

### Development Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Start MySQL and Redis (or use docker compose for just these)
docker compose up db redis -d

# Run database migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development servers
pnpm dev
```

- API: [http://localhost:3001](http://localhost:3001)
- Web: [http://localhost:3000](http://localhost:3000)
- API Docs (Swagger): [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## Environment Variables

See [.env.example](.env.example) for all required variables.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `JWT_SECRET` | JWT signing secret (min 16 chars) | — |
| `JWT_REFRESH_SECRET` | JWT refresh signing secret | — |
| `ENCRYPTION_KEY` | SMTP password encryption key | — |
| `APP_URL` | Backend URL | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `http://localhost:3000` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |

## Project Structure

```
mailforge/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # React frontend (port 3000)
├── packages/
│   └── shared/       # Shared TypeScript types and enums
├── docker/
│   ├── api/          # API Dockerfiles
│   └── web/          # Web Dockerfiles + nginx config
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

## API Documentation

When running in development mode, Swagger UI is available at `/api/docs`.

Key API endpoints:

- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET /api/contacts` — List contacts
- `POST /api/campaigns/:id/dispatch` — Send a campaign
- `GET /t/o/:token` — Open tracking pixel
- `GET /t/c/:token` — Click redirect
- `GET /t/u/:token` — Unsubscribe page

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policy and vulnerability reporting.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features.

## License

MIT License — see [LICENSE](LICENSE) for details.
