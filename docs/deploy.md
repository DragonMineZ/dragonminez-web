# Deploy

Merging to `main` deploys the website. Nobody has to click anything and no one needs a Dokploy login.

```
push to main -> GitHub Actions builds the image -> ghcr.io/dragonminez/dragonminez-web
             -> the deploy job connects to the VPS over SSH (the key can run one script and nothing else)
             -> the script fetches docker-compose.yml from main, pulls the image, restarts the container
             -> the container runs `prisma migrate deploy` and starts; Traefik routes dragonminez.com to it
```

Everything that decides how the site runs is in this repository: `Dockerfile`, `docker-compose.yml`, `deploy/vps-deploy.sh` and `.github/workflows/deploy.yml`. Anyone who can merge can change it, so protect `main` (pull request and one review) like production.

## Where things live

| What | Where |
|---|---|
| Image | `ghcr.io/dragonminez/dragonminez-web` (public, built with the built-in `GITHUB_TOKEN`, no personal tokens) |
| GitHub variables | `DMZ_VPS_HOST` and `DMZ_VPS_PORT`: org-level variables the mod repo already uses, available here as they are |
| GitHub secrets | `DMZ_VPS_KNOWN_HOSTS` (the org secret the mod repo already uses), `WEB_DEPLOY_KEY` (new, in the `production` environment) |
| GitHub environment | `production`, limited to the `main` branch, holds `WEB_DEPLOY_KEY` |
| VPS user | `dmzweb`, in the `docker` group, its SSH key can only run the deploy script |
| VPS folder | `/opt/dragonminez-web/` with `.env` (the secrets, not in git) and `docker-compose.yml` (fetched from main on every deploy) |
| VPS script | `/usr/local/sbin/dmz-web-deploy` (a copy of `deploy/vps-deploy.sh`, owned by root) |

## Variables in `/opt/dragonminez-web/.env`

`docker-compose.yml` refuses to start if a required one is missing.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://dmz_web:<password>@localhost/dragonminez_web?host=/var/run/postgresql`: the Postgres installed on the host (the bot's `dragonminez_ai` lives there too), reached through its Unix socket, which `docker-compose.yml` mounts into the container. The `dmz_web` role is only allowed on that database, by one line in `pg_hba.conf`. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `PUBLIC_APP_URL` | yes | Same values the site already uses. |
| `DISCORD_TOKEN` | for staff | Bot token. Without it nobody counts as staff and the locked forum stays closed except to `ADMIN_DISCORD_IDS`. |
| `DISCORD_GUILD_ID` | no | Defaults to the DragonMineZ server. |
| `DISCORD_MODERATOR_ROLES` | no | Defaults to `Moderator`. Comma list of role names or ids. |
| `ADMIN_DISCORD_IDS` | no | Break-glass admins by Discord user id. |
| `FORUM_PUBLIC` | no | Leave unset to keep the forum staff-only; `1` opens it. |
| `WEB_IMAGE` | no | Pin an exact build, for example `ghcr.io/dragonminez/dragonminez-web:<commit sha>`. Unset follows `main`. |
| `WEB_TRAEFIK` | no | Set to `false` for a first start that must not take traffic (see below). Unset means Traefik routes the container. |

## One-time setup on the VPS (as root)

1. The deploy user and folder:
   ```bash
   adduser --disabled-password --gecos "" dmzweb
   usermod -aG docker dmzweb
   install -d -m 750 -o dmzweb -g dmzweb /opt/dragonminez-web
   ```
2. The `.env`, copied from the running site so the secrets never leave the server:
   ```bash
   docker inspect $(docker ps -q -f ancestor=bennndev/dragonminez-web:latest) --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^(DATABASE_URL|PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY|CLERK_WEBHOOK_SIGNING_SECRET|PUBLIC_APP_URL|DISCORD_TOKEN|DISCORD_GUILD_ID)=' > /opt/dragonminez-web/.env
   echo 'ADMIN_DISCORD_IDS=YOUR_DISCORD_USER_ID' >> /opt/dragonminez-web/.env
   echo 'WEB_TRAEFIK=false' >> /opt/dragonminez-web/.env
   chown root:dmzweb /opt/dragonminez-web/.env && chmod 640 /opt/dragonminez-web/.env
   ```
   Add `DISCORD_MODERATOR_ROLES=...` if your staff role is not called `Moderator`. `WEB_TRAEFIK=false` keeps the first start away from real traffic; the cutover removes it.
3. The deploy script:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/DragonMineZ/dragonminez-web/main/deploy/vps-deploy.sh -o /usr/local/sbin/dmz-web-deploy
   chown root:root /usr/local/sbin/dmz-web-deploy && chmod 755 /usr/local/sbin/dmz-web-deploy
   ```
4. The deploy key, locked to that script:
   ```bash
   ssh-keygen -t ed25519 -N "" -C "github actions dragonminez-web" -f /root/dmz_web_deploy
   install -d -m 700 -o dmzweb -g dmzweb /home/dmzweb/.ssh
   echo 'command="/usr/local/sbin/dmz-web-deploy",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty' "$(cat /root/dmz_web_deploy.pub)" > /home/dmzweb/.ssh/authorized_keys
   chown dmzweb:dmzweb /home/dmzweb/.ssh/authorized_keys && chmod 600 /home/dmzweb/.ssh/authorized_keys
   cat /root/dmz_web_deploy
   ```
   Copy the whole private key (including the BEGIN and END lines) into the GitHub secret in the next section, then delete both files: `shred -u /root/dmz_web_deploy /root/dmz_web_deploy.pub`.

## One-time setup on GitHub

In the repository: Settings, Secrets and variables, Actions.
1. `DMZ_VPS_HOST` and `DMZ_VPS_PORT` are org-level variables the mod repo already uses; this repo sees them without any setup.
2. Settings, Environments, `production` (it already exists and only the `main` branch can deploy to it): add the secret `WEB_DEPLOY_KEY` with the private key from step 4.
3. `DMZ_VPS_KNOWN_HOSTS` is the org secret the mod repo already uses and is already available here.

## First start, without taking traffic

Run the script by hand (the first merge to `main` after this does the same thing):

```bash
sudo -u dmzweb /usr/local/sbin/dmz-web-deploy
cd /opt/dragonminez-web && sudo -u dmzweb docker compose logs web | tail -30
sudo -u dmzweb docker compose exec web wget -qO- http://127.0.0.1:4321/ | head -c 300
```

You want `All migrations have been successfully applied` in the logs and HTML from the last command. The first migration only adds the `forum_*` tables, so the live site is unaffected. The old site keeps serving because Traefik is told to ignore this container (`WEB_TRAEFIK=false`).

## Cutover

Two steps, so a mistake never takes the site down. First the new container joins the domain next to the old app (both serve the same site from the same database, so visitors see no difference). Only after you have checked it does the old app leave.

1. Let Traefik route the new container, and check what it will route:
   ```bash
   sed -i '/^WEB_TRAEFIK=/d' /opt/dragonminez-web/.env
   cd /opt/dragonminez-web && sudo -u dmzweb docker compose up -d --force-recreate
   docker inspect dragonminez-web-web-1 --format '{{index .Config.Labels "traefik.http.routers.dmzweb.rule"}}'
   ```
   The last command must print ``Host(`dragonminez.com`)``. Wait for `healthy` in `sudo -u dmzweb docker compose ps`, then open the site.
2. Take the old app out:
   ```bash
   docker service scale dragonminezweb-v7b1ac=0
   mkdir -p /etc/dokploy/traefik/disabled
   mv /etc/dokploy/traefik/dynamic/dragonminezweb-v7b1ac.yml /etc/dokploy/traefik/disabled/
   ```

Then check the site, the HairSalon, login and the vote page, and `/forum` as an admin. Logged out, `/forum` must show "The forum isn't open yet". Traefik already holds the certificate for `dragonminez.com`, so HTTPS keeps working.

Do not deploy the old app from Dokploy again; that would write its route back.

If the site answers `404 page not found` after step 2, Traefik has no route for the domain: use the whole-move rollback below, then compare `docker logs dokploy-traefik --tail 40` with step 1.

## Rolling back

- A bad release: set `WEB_IMAGE=ghcr.io/dragonminez/dragonminez-web:<previous commit sha>` in `/opt/dragonminez-web/.env` and run `sudo -u dmzweb /usr/local/sbin/dmz-web-deploy`. Remove the line to follow `main` again.
- The whole move:
  ```bash
  cd /opt/dragonminez-web && sudo -u dmzweb docker compose down
  mv /etc/dokploy/traefik/disabled/dragonminezweb-v7b1ac.yml /etc/dokploy/traefik/dynamic/
  docker service scale dragonminezweb-v7b1ac=1
  ```
- The migrations only add tables, so going back never needs a database restore. Keep the dump taken before the first deploy anyway.

## Troubleshooting

- The deploy job fails with `Permission denied (publickey)`: the public key is not in `/home/dmzweb/.ssh/authorized_keys`, or `WEB_DEPLOY_KEY` is not the matching private key.
- It fails with `Host key verification failed`: `DMZ_VPS_KNOWN_HOSTS` does not contain this host and port.
- `config -q` fails in the log: a required variable is missing from `.env`, and the message names which one. The running container is left alone.
- The domain answers 404 or 502: check `docker compose ps` (the container must be healthy) and that the old route file is out of `/etc/dokploy/traefik/dynamic/`.
- `Conflict. The container name ... is already in use`: an interrupted swap left a container named like `<id>_dragonminez-web-web-1`. The script removes those on every run now; by hand: `docker rm -f <that id>` and deploy again.
- Updating the deploy script itself: copy `deploy/vps-deploy.sh` to `/usr/local/sbin/dmz-web-deploy` again as root.

## Backups

Both databases (`dragonminez_web` and the bot's `dragonminez_ai`) live in the host's Postgres. A nightly cron job (`/etc/cron.d/dmz-db-backup`, running `/usr/local/sbin/dmz-db-backup`) dumps them into `/var/backups/dmz/` and keeps 14 days. Copy that folder off the server now and then. By hand:

```bash
sudo -u postgres pg_dump -Fc dragonminez_web > /root/dragonminez_web_$(date +%F).dump
```
