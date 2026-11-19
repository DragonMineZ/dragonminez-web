# Forum

The community forum lives inside the website at `/forum`. It shares the website's header, footer, theme, language switch, login (Clerk with Discord) and database. There is no separate service.

- Categories: Announcements (admins post), Community Servers, Guides (staff post), Suggestions (votes and status), Bug-reports (structured form and status).
- Members log in with the website's Discord login. Staff are decided by Discord roles (see below).
- Until `FORUM_PUBLIC=1` is set, only staff can open the forum. Everyone else sees a "The forum isn't open yet" page.

## Environment variables

The forum needs no new Discord app and no new login keys: it uses the ones the website already has.

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | The website's Postgres. Forum tables are prefixed `forum_`, so they sit next to the hair tables. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | login | Already set (build argument). |
| `CLERK_SECRET_KEY` | login | Already set. |
| `PUBLIC_APP_URL` | login | Already set (`https://dragonminez.com`). |
| `DISCORD_TOKEN` | staff check | Bot token of the bot that is in the DragonMineZ server. Already used by the HairSalon moderation. Runtime variable. |
| `DISCORD_GUILD_ID` | staff check | Optional: defaults to the DragonMineZ server. |
| `DISCORD_MODERATOR_ROLES` | staff check | Comma list of Discord role names or ids that count as forum moderators, for example `Helper,Moderator`. This is the same list the HairSalon uses for moderation. |
| `ADMIN_DISCORD_IDS` | break-glass | Comma list of Discord user ids that are always forum admins, even if Discord cannot be reached or `DISCORD_TOKEN` is missing. Set it to your own id for the first deploy. |
| `FORUM_PUBLIC` | opening the forum | New. Leave it unset (or anything but `1`) while the forum is staff-only. Set it to `1` to open the forum to everyone. |
| `FORUM_DEV_LOGIN` | local development | Never set it on the server. It only works under `astro dev` and is ignored in production builds. |

Who is staff: the server owner and anyone with a role that has the Administrator permission are **forum admins** (they post announcements, edit them and manage roles). Anyone with a role in `DISCORD_MODERATOR_ROLES` is a **moderator** (pin, lock, delete, statuses, reports, servers, bans, Guides). Everyone else is a member. While the forum is locked, admins and moderators are the only ones who can enter.

How to get a Discord user id (only for `ADMIN_DISCORD_IDS`): Discord settings, Advanced, turn on Developer Mode, then right-click the person and choose Copy User ID.

Discord and Clerk: the Discord login is the "Discord" connection in the Clerk dashboard (SSO connections). It is already on because the website uses it. Staff roles are read with the bot token, so the bot must be in the server. A role change counts after the person's forum profile refreshes (within 5 minutes) or after they log in again.

## Database

The forum uses the website's own database, `dragonminez_web`, in the Postgres installed on the VPS host (the Discord bot's `dragonminez_ai` is in the same instance). The container reaches it over the Unix socket; the connection string and the role are described in [deploy.md](deploy.md). The forum tables are created by the migration `prisma/migrations/20261118000000_forum`. It only adds the `forum_*` tables and the five categories and never touches the hair tables. The website's container runs `prisma migrate deploy` when it starts, so deploying is enough.

See which database the website points at, without showing the password. Run on the VPS:

```bash
grep '^DATABASE_URL=' /opt/dragonminez-web/.env | sed -E 's#(://[^:]+:)[^@]+@#\1***@#'
```

Back up before a risky migration:

```bash
sudo -u postgres pg_dump -Fc dragonminez_web > dragonminez_web_$(date +%F).dump
```

## Deploy

How the site is built and deployed (GitHub Actions, the image on GHCR, the SSH deploy to the VPS, the variables, rollback) is in [deploy.md](deploy.md). For the forum:

1. Push to `main` and let the site deploy. The forum migration runs when the container starts.
2. Check, logged in as an admin: `/forum` opens, `/forum/c/announcements/new` works, `/forum/mod` shows the queue. Logged out, `/forum` shows "The forum isn't open yet".

## Opening the forum

When the forum is ready for everyone: set `FORUM_PUBLIC=1` in `/opt/dragonminez-web/.env` on the VPS and run `cd /opt/dragonminez-web && sudo -u dmzweb docker compose up -d --force-recreate`. To lock it again, remove the line and run the same command.

## Local development

```bash
bun install
export DATABASE_URL=postgresql://user:pass@localhost:5432/dragonminez_web
bunx prisma migrate deploy
FORUM_DEV_LOGIN=1 FORUM_PUBLIC=1 bun run dev
# then open /forum/dev?as=admin (or mod, member, off) to log in as a fake user without Clerk
bun run test:forum   # forum unit tests (Node 24)
```
