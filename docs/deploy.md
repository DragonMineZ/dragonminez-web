# Deploy

Merging to `main` deploys the website. Nobody has to click anything.

```
push to main -> GitHub Actions builds the image -> ghcr.io/dragonminez/dragonminez-web
             -> the workflow calls the Dokploy webhook -> Dokploy redeploys the Compose app
             -> the container runs `prisma migrate deploy` and starts
```

Everything that decides how the site runs is in this repository: `Dockerfile`, `docker-compose.yml` and `.github/workflows/deploy.yml`. Anyone who can merge can change it. The only things outside the repo are the variables (in Dokploy) and the one webhook secret (in GitHub).

## GitHub secrets the workflow uses

| Secret | Notes |
|---|---|
| `PUBLIC_CLERK_PUBLISHABLE_KEY`, `PUBLIC_APP_URL` | Public values, baked into the build. Already set. |
| `DOKPLOY_WEBHOOK_URL` | The Compose app's "Deploy Webhook" URL from Dokploy. Optional: without it the image is built but nothing redeploys. |

The image is pushed with the built-in `GITHUB_TOKEN`, so no Docker Hub account or personal token is needed. `CLERK_SECRET_KEY` and `DATABASE_URL` are not needed to build and are not in the image.

## Variables in Dokploy

Set them in the Compose app's Environment tab. `docker-compose.yml` passes them to the container and refuses to start if a required one is missing.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | The website's Postgres (the Dokploy Postgres service). |
| `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `PUBLIC_APP_URL` | yes | Same values the site already uses. |
| `DISCORD_TOKEN` | for staff | Bot token. Without it nobody counts as staff and the locked forum stays closed to everyone except `ADMIN_DISCORD_IDS`. |
| `DISCORD_GUILD_ID` | no | Defaults to the DragonMineZ server. |
| `DISCORD_MODERATOR_ROLES` | no | Defaults to `Moderator`. Comma list of role names or ids. |
| `ADMIN_DISCORD_IDS` | no | Break-glass admins by Discord user id. |
| `FORUM_PUBLIC` | no | Leave empty to keep the forum staff-only; `1` opens it. |
| `WEB_IMAGE` | no | Pin an exact build, for example `ghcr.io/dragonminez/dragonminez-web:<commit sha>`. Unset follows `main`. |

## One-time setup in Dokploy

1. Merge the pull request. The workflow builds `ghcr.io/dragonminez/dragonminez-web:latest`. If Dokploy cannot pull it, open the package on GitHub (organization, Packages) and make it public (the image holds no secrets), or add the GitHub registry credentials in Dokploy (the wiki app may already use them).
2. In Dokploy create a service of type **Compose** next to the old website app: source **Git**, repository `https://github.com/DragonMineZ/dragonminez-web`, branch `main`, compose path `./docker-compose.yml`, type **Docker Compose**.
3. Environment tab: add the variables above. Copy the values from the old website app (its Environment tab).
4. Do not add the domain yet. Deploy and open the Logs tab. You want to see `All migrations have been successfully applied` and the server listening on 4321. The migration only adds the `forum_*` tables, so the old site keeps working meanwhile.
5. Cut over: in the old app note its domain settings (host, HTTPS, certificate type) and remove the domain, then in the new Compose app open Domains and add the same host with service `web`, port `4321`, HTTPS on. Deploy. The gap is a minute or two.
6. Check the site, the HairSalon, login, and `/forum` as an admin (and logged out, which must show "The forum isn't open yet").
7. Auto deploy: in the Compose app open the Deployments tab, turn on Autodeploy, copy the Deploy Webhook URL, and add it to GitHub as the `DOKPLOY_WEBHOOK_URL` secret. The next merge to `main` deploys by itself.
8. Keep the old app stopped (not deleted) for a few days as the way back, then delete it.

## Rolling back

- A bad release: in Dokploy set `WEB_IMAGE` to the previous commit's image (`ghcr.io/dragonminez/dragonminez-web:<sha>`, the sha is on the GitHub commit) and redeploy. Remove the variable to follow `main` again.
- The whole move: remove the domain from the new app, add it back to the old app and start it.
- The migrations only add tables, so going back never needs a database restore. Keep the dump taken before the first deploy anyway.

## Troubleshooting

- The workflow's last step fails with a 4xx: Autodeploy is off in Dokploy, or the app's branch is not `main`.
- Dokploy cannot pull the image: the package is private (see step 1).
- The domain answers 404 or 502: the service must be `web`, port `4321`, and the app must be on `dokploy-network` (already set in the compose file).
- The container exits at start: Logs tab. A missing required variable says which one; a migration error means `DATABASE_URL` is wrong.

## Backups

Schedule backups of the Postgres service from Dokploy's dashboard (database, Backups) to an off-server bucket. A manual dump:

```bash
docker exec $(docker ps -q -f ancestor=postgres:18) pg_dump -U dragon_admin -Fc dragonminez_prod > dragonminez_prod_$(date +%F).dump
```
