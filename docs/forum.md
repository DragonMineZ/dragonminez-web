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
| `DISCORD_MODERATOR_ROLES` | staff check | Comma list of Discord role names or ids that count as staff, for example `Helper,Moderator`. The server owner and any role with the Administrator permission always count. This is the same list the HairSalon uses for moderation. |
| `ADMIN_DISCORD_IDS` | forum admins | New. Comma list of Discord user ids that are forum admins (they post announcements and manage roles). Everyone else on the staff list is a moderator. |
| `FORUM_PUBLIC` | opening the forum | New. Leave it unset (or anything but `1`) while the forum is staff-only. Set it to `1` to open the forum to everyone. |
| `FORUM_DEV_LOGIN` | local development | Never set it on the server. It only works under `astro dev` and is ignored in production builds. |

How to get a Discord user id: Discord settings, Advanced, turn on Developer Mode, then right-click the person and choose Copy User ID.

Discord and Clerk: the Discord login is the "Discord" connection in the Clerk dashboard (SSO connections). It is already on because the website uses it. Staff roles are read with the bot token, so the bot must be in the server. A role change counts after the person's forum profile refreshes (within 5 minutes) or after they log in again.

## Database

The forum tables are created by the migration `prisma/migrations/20261118000000_forum`. It only adds the `forum_*` tables and the five categories and never touches the hair tables. The website's container already runs `prisma migrate deploy` when it starts, so deploying is enough.

If the website's database does not exist yet, create it on the VPS Postgres (separate from the bot's):

```bash
sudo -u postgres psql -c "CREATE USER dmz_web WITH PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE dragonminez_web OWNER dmz_web;"
# DATABASE_URL=postgresql://dmz_web:change-me@HOST:5432/dragonminez_web
```

Back up before the first deploy: `pg_dump -Fc dragonminez_web > dragonminez_web.dump`.

## Deploy

The website image is built by `.github/workflows/deploy.yml` on every push to `main` and pushed to Docker Hub. The forum rides on that image.

1. Open a pull request from the `forum` branch to `main` and merge it. The forum is staff-only by default, so merging does not open it to the public.
2. Let the workflow build, then redeploy the website container the way you normally do. The migration runs on start.
3. Set `ADMIN_DISCORD_IDS` (and `DISCORD_MODERATOR_ROLES` if you want helpers in) in the container's environment and restart.
4. Check, logged in as a staff member: `/forum` opens, `/forum/c/announcements/new` works for an admin, `/forum/mod` shows the queue. Logged out, `/forum` shows "The forum isn't open yet".

If you can deploy the website by hand on the VPS and want to skip the pipeline, build the same image yourself from the branch and swap the container (keep the old one so you can switch back):

```bash
git clone --branch forum https://github.com/DragonMineZ/dragonminez-web.git && cd dragonminez-web
docker build -t dragonminez-web:forum \
  --build-arg PUBLIC_CLERK_PUBLISHABLE_KEY=... --build-arg PUBLIC_APP_URL=https://dragonminez.com \
  --build-arg CLERK_SECRET_KEY=... --build-arg DATABASE_URL=... .
docker stop dmz-web && docker rename dmz-web dmz-web-old
docker run -d --name dmz-web --restart unless-stopped -p 4321:4321 \
  -e DATABASE_URL=... -e PUBLIC_CLERK_PUBLISHABLE_KEY=... -e CLERK_SECRET_KEY=... -e PUBLIC_APP_URL=https://dragonminez.com \
  -e DISCORD_TOKEN=... -e DISCORD_MODERATOR_ROLES=... -e ADMIN_DISCORD_IDS=... dragonminez-web:forum
# back out: docker stop dmz-web && docker rm dmz-web && docker rename dmz-web-old dmz-web && docker start dmz-web
```

Use the container name, port and variables your website container already has (`docker inspect dmz-web`). Clerk production keys only work on `dragonminez.com`, so a copy on another address cannot log in.

## Opening the forum

When the forum is ready for everyone: set `FORUM_PUBLIC=1` in the container's environment and restart. To lock it again, remove the variable and restart.

## Local development

```bash
bun install
export DATABASE_URL=postgresql://user:pass@localhost:5432/dragonminez_web
bunx prisma migrate deploy
FORUM_DEV_LOGIN=1 FORUM_PUBLIC=1 bun run dev
# then open /forum/dev?as=admin (or mod, member, off) to log in as a fake user without Clerk
bun run test:forum   # forum unit tests (Node 24)
```
