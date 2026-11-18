# DragonMineZ Forum

Community forum for the DragonMineZ mod: Discord login, categories and threads, a community server listing, profiles, notifications, search and staff moderation. Astro 5 + Tailwind 4 + Prisma 7 on PostgreSQL. Spec: `docs/SPEC.md`.

## Run locally

Node 24, no Docker or Postgres install needed:

```
npm install
npm run dev:all
```

This starts a local database (kept in `.pgdata/`), applies migrations, seeds sample data and serves http://localhost:4321.

Dev login: open `/auth/dev` and pick a name and role (member, mod or admin). It only exists on the dev server with `DEV_LOGIN=1`.

## Real Discord login

Create a Discord application, set its redirect URL to `http://localhost:4321/auth/callback`, and set these in `.env` (see `.env.example` for all variables): `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` and `ADMIN_DISCORD_IDS`. Moderator roles from a guild additionally need `DISCORD_TOKEN` and `DISCORD_GUILD_ID`.

Until launch the forum is staff-only: it stays locked unless `FORUM_PUBLIC=1` is set, and only members with a Discord moderator/admin role (`DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_MODERATOR_ROLES`, `ADMIN_DISCORD_IDS`) get in.

`npm test` runs the tests, `npm run build` makes the production build.
