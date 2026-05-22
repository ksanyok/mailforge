# Contributing to MailForge

Thank you for your interest in contributing to MailForge!

## Development Setup

1. Fork the repository and clone your fork
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and configure
4. Start database and Redis: `docker compose up db redis -d`
5. Run migrations: `pnpm db:migrate`
6. Seed data: `pnpm db:seed`
7. Start dev servers: `pnpm dev`

## Code Style

- TypeScript strict mode enabled throughout
- ESLint configured for both API and web
- No `any` types unless absolutely necessary
- No unnecessary comments — code should be self-documenting
- Prefer explicit over implicit

## Commit Convention

```
type(scope): description

Examples:
feat(campaigns): add A/B subject line testing
fix(warmup): prevent negative daily limit after pause
refactor(contacts): extract validation into separate service
docs: update API endpoint documentation
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate tests
3. Ensure `pnpm lint` and `pnpm build` pass
4. Open a PR with a clear description of what and why
5. Link any related issues

## Adding a New Module

Backend (NestJS):
1. Create `apps/api/src/modules/{name}/` directory
2. Add `{name}.module.ts`, `{name}.service.ts`, `{name}.controller.ts`
3. Import the module in `app.module.ts`
4. Add Prisma models to `schema.prisma` and run `pnpm db:generate`

Frontend (React):
1. Add API functions to `apps/web/src/api/index.ts`
2. Create page component in `apps/web/src/pages/{name}/`
3. Add route to `apps/web/src/router.tsx`
4. Add nav item to `apps/web/src/components/layout/Sidebar.tsx`

## Testing

```bash
# Run API tests
pnpm --filter @mailforge/api test

# Run API e2e tests
pnpm --filter @mailforge/api test:e2e
```

## Reporting Issues

Please use GitHub Issues with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, Docker version)
