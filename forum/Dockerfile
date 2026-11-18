FROM oven/bun:1-alpine AS base
WORKDIR /app

# ── Build
FROM base AS build
ARG PUBLIC_APP_URL
ARG DATABASE_URL

COPY package.json bun.lock* package-lock.json* ./
RUN bun install

COPY . .

ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV DATABASE_URL=$DATABASE_URL
ENV ASTRO_TELEMETRY_DISABLED=1

RUN bun prisma generate && bun run build

# ── Runtime
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated

EXPOSE 4321
CMD bun prisma migrate deploy && bun run start
