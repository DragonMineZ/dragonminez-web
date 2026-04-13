FROM oven/bun:1-alpine AS base
WORKDIR /app

# ── Build
FROM base AS build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG PUBLIC_APP_URL
ARG CLERK_SECRET_KEY
ARG DATABASE_URL

ENV PUBLIC_CLERK_PUBLISHABLE_KEY=$PUBLIC_CLERK_PUBLISHABLE_KEY
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV ASTRO_TELEMETRY_DISABLED=1

RUN bun prisma generate && bun run build

# ── Runtime
FROM base AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated

ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG PUBLIC_APP_URL
ARG CLERK_SECRET_KEY
ARG DATABASE_URL

ENV PUBLIC_CLERK_PUBLISHABLE_KEY=$PUBLIC_CLERK_PUBLISHABLE_KEY
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321
CMD ["bun", "prisma", "migrate", "deploy", "&&", "bun", "run", "start"]
