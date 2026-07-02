# TanStack Start Migration Design

## Context

The project is currently a Next.js 15 App Router application for collecting and managing Zhihu paid-column and answer content. It contains:

- React pages under `app/`
- Next API routes under `app/api/`
- Prisma models for crawl tasks, runtime config, cookie checks, and rate-limit logs
- A crawler based on `cheerio`, `opentype.js`, `sharp`, and SiliconFlow OCR
- A lightweight admin area for article management and Zhihu Cookie configuration

The migration goal is to leave the Next.js/Vercel stack, keep deployment simple, and improve runtime administration. The chosen direction is a TanStack Start full-stack single application. NestJS, a separate backend process, and a separate worker are intentionally out of scope for this phase.

## Decisions

1. Use TanStack Start as the full-stack application framework.
2. Keep a single application process that serves pages, API routes, and synchronous crawler execution.
3. Do not introduce NestJS during this migration.
4. Do not introduce an independent worker process.
5. Do not include PostgreSQL in Docker Compose. The database is an external dependency supplied through `DATABASE_URL`.
6. Keep the current product workflow stable before making larger UX changes.
7. Move runtime business configuration out of environment variables and into the admin-managed database config.

## Target Architecture

The first implementation should keep the repository close to the current shape to reduce migration risk:

```txt
app/ or src/app/        TanStack Start file routes and server routes
components/             Existing React UI components
lib/crawler/            Existing crawler core
lib/config/             Runtime config definitions and access helpers
lib/prisma.ts           Prisma client
lib/api-error.ts        Framework-neutral API response helpers
prisma/                 Prisma schema
public/                 Static assets
Dockerfile              Application container
docker-compose.yml      Single web service
```

A monorepo is not required in this phase. Code boundaries should still be kept clean so future extraction into `packages/crawler`, `packages/db`, or a NestJS backend remains practical.

## Deployment Boundary

Docker Compose should run only the application service:

```txt
docker compose
  web: TanStack Start Node service

external dependency
  PostgreSQL database configured by DATABASE_URL
```

The compose file must not create or manage a PostgreSQL service, volume, or database lifecycle. The operator supplies a working PostgreSQL connection string.

Database schema updates should use committed Prisma migrations. The production container should run `prisma migrate deploy` before starting the HTTP server so Docker Compose deployments apply pending schema changes automatically. The container must not run `prisma db push` in production.

## Environment Variables

Environment variables should be limited to startup-level concerns:

```txt
DATABASE_URL      Required external PostgreSQL connection string
ADMIN_PASSWORD    Initial or fallback admin password
APP_SECRET        Token signing secret and future encryption root
PORT              HTTP port, default 3000
NODE_ENV          Runtime mode
```

Runtime business settings should not be read directly from environment variables after migration.

## Runtime Configuration

Runtime business settings are managed in `SystemConfig` and edited through the admin UI.

Required keys:

```txt
zhihu_cookie
siliconflow_api_key
crawler_user_agent
crawler_request_delay_ms
rate_limit_window_minutes
rate_limit_max_requests
cookie_check_url
cookie_check_retention_days
```

Optional keys:

```txt
site_name
site_url
seo_description
```

The app should define config metadata in code:

- key
- label
- type
- default value
- whether the value is sensitive
- validation rule
- help text

The database can remain a key/value table for now. Keeping config metadata in code avoids a wider schema migration while still giving the admin UI enough structure.

Runtime behavior:

- Crawler execution reads config from the database immediately before each crawl.
- OCR reads `siliconflow_api_key` from runtime config, not from `process.env`.
- Rate limiting reads window and max-request settings from runtime config.
- Cookie checks read `zhihu_cookie` and `cookie_check_url` from runtime config.
- Sensitive values are stored as real values but returned to the admin UI as masked values.
- Saving a value in the admin UI takes effect for the next request, crawl, or check without restarting the app.

There should be no `ZHIHU_COOKIE` or `SILICONFLOW_API_KEY` fallback after the runtime config migration. This prevents confusing cases where the admin UI appears changed but the server still uses an environment value.

## Routing Migration

Page routes map from Next.js App Router to TanStack Start file routes:

```txt
app/page.tsx              -> index route
app/tasks/[id]/page.tsx   -> /tasks/$id route
app/admin/page.tsx        -> /admin route
app/stats/page.tsx        -> /stats route
app/about/page.tsx        -> /about route
```

Next-specific APIs should be replaced:

```txt
next/link              -> @tanstack/react-router Link
next/navigation        -> TanStack Router hooks/navigation
next/image             -> img or @unpic/react
next Metadata          -> route head()
next/og                -> static metadata in this phase
nextjs-toploader       -> remove or replace with router pending UI
@vercel/analytics      -> remove
@vercel/speed-insights -> remove
```

React Server Components should not be used as a migration dependency. TanStack Start is currently in release-candidate status, and the migration should stay on stable documented Start primitives.

## API Migration

Existing API paths and response shapes should be preserved where practical:

```txt
GET/POST    /api/tasks
GET/DELETE  /api/tasks/$id
DELETE      /api/tasks/clear-failed
POST        /api/crawl
GET         /api/articles
GET         /api/stats
POST        /api/admin/auth
GET/PUT     /api/admin/configs
GET/PUT     /api/admin/configs/$key
GET/DELETE  /api/admin/articles
GET/PUT/DELETE /api/admin/articles/$id
GET         /api/admin/cookie-status
POST        /api/admin/check-cookie
```

`/api/cron/check-cookie` should be replaced by `/api/admin/check-cookie`. Future scheduled checks can call this admin route from an external scheduler if needed.

API error helpers should be changed from `NextResponse` to standard `Response` objects. The external response format remains:

```json
{
  "error": "中文错误信息",
  "code": "ERROR_CODE"
}
```

## Crawl Flow

The crawl flow remains synchronous and keeps the current two-step behavior:

1. Frontend submits a Zhihu URL.
2. `POST /api/tasks` creates or returns a task.
3. Frontend calls `POST /api/crawl` with the task id.
4. API checks rate limit and URL validity.
5. API marks the task as `RUNNING`.
6. API reads fresh runtime config.
7. `ZhihuCrawler` executes.
8. API writes `COMPLETED` with article content or `FAILED` with an error message.
9. Frontend refreshes or polls task state.

The API must write crawler failures to `CrawlTask.error` so users can see why a task failed.

Missing runtime config should be explicit:

- Missing Cookie returns a clear crawler configuration error.
- Missing SiliconFlow API key returns a clear OCR configuration error when OCR is required.
- Invalid numeric config values fall back to code defaults and should be visible in admin validation.

## Admin UI

The admin page should be reorganized into three areas:

```txt
Article Management
Runtime Configuration
Status Checks
```

Article Management keeps the existing behaviors:

- search
- pagination
- edit title and author
- delete and batch delete
- task status display

Runtime Configuration should include:

```txt
Zhihu Cookie
SiliconFlow API Key
Crawler User-Agent
Crawler request delay in milliseconds
Rate-limit window in minutes
Rate-limit max requests
Cookie check URL
Cookie check log retention days
Optional site name, site URL, and SEO description
```

Sensitive values should be masked by default. The UI should support replacing sensitive values without revealing the stored value.

Each successful save should tell the user that the value has been saved and will affect the next matching request. No restart is required.

Status Checks should include:

- latest Cookie check result
- 24-hour Cookie success rate
- manual Cookie check button
- OCR key configured status
- optional OCR test button in a later iteration

## Admin Authentication

The current localStorage token pattern can stay for UX continuity, but server trust must come from a signed token. The token should be signed and verified with `APP_SECRET`.

Protected admin APIs must validate the token on the server. The frontend must not be treated as authenticated merely because localStorage contains a value.

## Build And Deployment

Package scripts should be updated around TanStack Start:

```txt
npm run dev       Start TanStack Start dev server
npm run build     Generate Prisma client and build the app
npm run start     Start the built Node server
npm run start:prod        Apply production migrations and start the built Node server
npm run db:migrate:dev    Generate and apply Prisma migrations locally
npm run db:migrate:deploy Apply committed Prisma migrations in production
npm run db:push           Prototype-only schema sync, not for production
npm run lint      Run linting
```

Docker deliverables:

- `Dockerfile` for building and running the web service
- `docker-compose.yml` with one `web` service
- `.env.example` documenting required startup variables
- README deployment section

The README should describe:

1. Create or obtain a PostgreSQL database.
2. Fill `DATABASE_URL`, `ADMIN_PASSWORD`, `APP_SECRET`, and `PORT`.
3. Start the app with Docker Compose.
4. Let the production startup script apply pending Prisma migrations.
5. Open the admin page and configure Zhihu Cookie and SiliconFlow API Key.

## Verification

Required local checks:

```txt
npm run lint
npm run build
npm run db:migrate:deploy against a test database
```

Required smoke checks:

```txt
GET /                Home/articles page renders
GET /tasks/:id       Completed article page renders
GET /admin           Admin login renders
GET /stats           Stats page renders
GET /about           About page renders
GET /api/articles    Articles API responds
GET /api/tasks       Tasks API responds
GET /api/stats       Stats API responds
Admin config save    Saved value is returned masked if sensitive
Cookie check         Reads the just-saved Cookie config
Crawl                Reads the just-saved Cookie and OCR config
Docker compose       Web service starts and serves the app
```

## Implementation Phases

### Phase 1: TanStack Start Skeleton

- Remove Next and Vercel-only dependencies.
- Add TanStack Start, TanStack Router, Vite/Nitro, and Tailwind Vite integration.
- Create the root route and router entry.
- Port the main page routes enough for navigation and rendering.

### Phase 2: Server Routes

- Migrate existing API routes to TanStack Start server routes.
- Preserve API paths and JSON shapes.
- Convert API helpers to standard `Response`.
- Confirm Prisma, crawler, and OCR dependencies run in the Node server runtime.

### Phase 3: Runtime Configuration

- Add config definitions and runtime config access helpers.
- Update crawler config, OCR, rate limiting, and Cookie checks to use database config.
- Expand the admin UI into runtime config and status check sections.
- Remove business-config environment fallbacks.

### Phase 4: Docker Deployment

- Add Dockerfile and single-service Docker Compose.
- Update `.env.example`.
- Update README with external database setup and automatic production migration deployment.
- Verify container startup and basic app access.

## Out Of Scope

- NestJS backend.
- Independent worker process.
- Redis or BullMQ.
- Docker-managed PostgreSQL.
- Full monorepo conversion.
- React Server Components as a required migration feature.
- Automatically running `prisma db push` on every container startup.

## Open Risks

- TanStack Start is in release-candidate status, so implementation should follow current official docs and avoid experimental features.
- Native dependencies such as `sharp` must be validated inside the Docker image.
- External database connectivity errors must be surfaced clearly.
- Long crawler requests are accepted for this phase because expected usage is personal or low concurrency. If crawl duration or concurrency grows later, the task execution boundary should be revisited.
