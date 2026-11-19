# dragonminez-web

The DragonMineZ website (dragonminez.com): landing page, HairSalon (hair designs and 3D viewer) and the community forum at `/forum`. One Astro app, one database, one container.

Stack: Astro 5 SSR (`@astrojs/node`), React islands, Tailwind 4, Prisma 7 with `@prisma/adapter-pg`, Clerk (Discord login), bun in the Docker image. Last checked 2026-11-18.

Keep this file and `docs/` true: when infrastructure, the layout or a rule below changes, update them in the same commit.

## Rules

- Commit and push straight to `main`. No feature branches, no pull requests (Bruno, 2026-11-18). A push builds the image and, if the build passes, deploys to production, so run the checks below first.
- Commits are authored by Bruno V. Short, plain messages ("forum link and beta page"). No bodies, no trailers, no Co-Authored-By, no attribution lines anywhere (commits, code, docs, PRs).
- Never commit secrets. They live in `/opt/dragonminez-web/.env` on the VPS and in GitHub secrets.
- Fewest files and dependencies that do the job. No abstractions with one user.
- Windows dev machine without bun or Docker: use `npm`/`node` locally. The CI Docker build (`bun astro build`) is the real build check.
- Check before pushing: `node --test "tests/forum/**/*.test.ts"` (needs `npm install` once for `markdown-it`). After the push, watch the Actions run (`gh run watch`); the deploy job only runs when the build passes.
- Prisma migrations run automatically on every deploy (`prisma migrate deploy` at container start). Keep them additive. For anything destructive, take a `pg_dump` first (see `docs/deploy.md`, Backups).

## Forum rules

- Pages are server-rendered Astro with plain HTML forms (POST, then redirect). React only where a page needs client state.
- User-written text is rendered only through `src/lib/forum/text.ts` (markdown-it, no raw HTML). Never `set:html` on anything a user wrote.
- Every write handler checks login, ban, role, zod validation (`src/lib/forum/schemas.ts`) and the rate limit on the server.
- Forum UI strings go through `t()` (`src/lib/forum/i18n/{en,es,pt}.ts`): en, es (Latin American), pt (Brazilian). Site-wide header and page strings live in `src/i18n/translations/{en,es,pt}.ts` and are applied client-side through `data-i18n`, which replaces an element's whole text, so wrap the text in its own `<span>`.
- `/forum/dev` (fake login) must stay unreachable in production builds.
- The forum is staff-only until `FORUM_PUBLIC=1` (`src/lib/forum/access.ts`). Keep that lock when changing forum pages: the middleware rewrites every other forum URL to `/forum/locked` for non-staff and answers `/api/forum/*` with 403.

## Layout

- `src/middleware.ts`: security headers, rate limit, runtime env shim, Clerk, then forum (loads `locals.user`, enforces the lock). The order matters.
- `src/pages/forum/`, `src/pages/api/forum/`, `src/components/forum/`, `src/layouts/ForumLayout.astro`, `src/lib/forum/`, `tests/forum/`: the forum. `src/pages/api/webhooks/clerk.ts`: Clerk user webhook.
- `src/components/Header.astro`, `src/layouts/Layout.astro`: the site shell the forum shares.
- `prisma/schema.prisma` and `prisma/migrations/`: forum tables are `forum_*` (`@@map`), next to the hair tables. `src/lib/discord/moderation.ts`: staff level from Discord roles.
- Forum design and variables: `docs/forum.md`. Deploy and VPS: `docs/deploy.md`.

## Runtime and environment

- Astro inlines `import.meta.env` private variables at build time, so secrets must not depend on them. `withRuntimeEnv` in the middleware copies `process.env` into `locals.runtime.env` so Clerk reads its keys at runtime. Only `PUBLIC_CLERK_PUBLISHABLE_KEY` and `PUBLIC_APP_URL` are baked into the image (build args from GitHub secrets).
- Runtime variables (in `/opt/dragonminez-web/.env`, listed in `docs/deploy.md`): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_MODERATOR_ROLES`, `ADMIN_DISCORD_IDS`, `FORUM_PUBLIC`, `WEB_IMAGE`, `WEB_TRAEFIK`. `docker-compose.yml` refuses to start without the required ones.
- Staff: server owner and anyone with an Administrator role are forum admins; roles in `DISCORD_MODERATOR_ROLES` (default: the staff role ids `1341596685339725885,1286814599215317034`) are moderators; `ADMIN_DISCORD_IDS` are always admins. The forum profile is synced from Clerk with a 5-minute TTL.

## Database

- The Postgres installed on the VPS host (16.x), shared with the Discord bot. This site: database `dragonminez_web`, role `dmz_web`. The bot's `dragonminez_ai` is in the same instance and is not ours to touch.
- The container reaches it over the Unix socket `/var/run/postgresql` (mounted by `docker-compose.yml`): `DATABASE_URL=postgresql://dmz_web:<password>@localhost/dragonminez_web?host=/var/run/postgresql`. `pg_hba.conf` allows `dmz_web` on that database only. Password: `/root/dmz_web_pw` on the VPS (root only).
- The old Dokploy Postgres 18 container (`dragonminez-7x11e5`, database `dragonminez_prod`) is the pre-migration copy, kept only as a fallback until it is deleted.
- Backups: the hosting provider backs up the whole server, so no dump job runs here. Take a manual `pg_dump` before a destructive migration (`docs/deploy.md`, Backups).

## Deploy

Push to `main` -> GitHub Actions (`.github/workflows/deploy.yml`) builds `ghcr.io/dragonminez/dragonminez-web` -> the deploy job SSHes to the VPS as `dmzweb` (forced command `/usr/local/sbin/dmz-web-deploy`, a root-owned copy of `deploy/vps-deploy.sh`; copy it again as root when it changes) -> the script fetches `docker-compose.yml` from `main`, pulls the image and recreates the container. Traefik (installed by Dokploy) routes `dragonminez.com` to it through the compose labels. The wiki (repo `dragonminez-wiki`, MediaWiki) is a separate container on the same Traefik: its own compose labels route `dragonminez.com/wiki` to it, so never add a `/wiki` page here. Nobody needs a Dokploy login, and the old Dokploy app (`dragonminezweb-v7b1ac`) is scaled to 0: never deploy it from Dokploy again, it would write its route back. Rollback and troubleshooting: `docs/deploy.md`.

## Retired

The separate `dragonminez-forum` repo is archived; the forum lives here. Do not recreate it.
