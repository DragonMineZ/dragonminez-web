#!/bin/sh
# The only command the GitHub deploy key may run on the VPS (docs/deploy.md). Installed once at
# /usr/local/sbin/dmz-web-deploy, owned by root, so the key cannot change it.
# It deploys what is on main: fetch docker-compose.yml, pull the image GitHub Actions built, restart the container.
set -eu

cd /opt/dragonminez-web

# The query string defeats the CDN cache, so a deploy right after a merge sees the new file.
curl -fsSL "https://raw.githubusercontent.com/DragonMineZ/dragonminez-web/main/docker-compose.yml?t=$(date +%s)" -o docker-compose.yml.new
# Refuse a broken file (or a missing required variable in .env) before it replaces the working one.
docker compose -f docker-compose.yml.new config -q
mv docker-compose.yml.new docker-compose.yml

docker compose pull
docker compose up -d --remove-orphans
docker image prune -f > /dev/null
docker compose ps
