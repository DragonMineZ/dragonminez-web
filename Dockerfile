FROM oven/bun:latest AS base
WORKDIR /app

# ── Build: Instalación y Compilación
FROM base AS build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# ── Build-time Arguments
ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG PUBLIC_APP_URL
ARG CLERK_SECRET_KEY
ARG DATABASE_URL
ENV PUBLIC_CLERK_PUBLISHABLE_KEY=$PUBLIC_CLERK_PUBLISHABLE_KEY
ENV PUBLIC_APP_URL=$PUBLIC_APP_URL
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL

# ── Desactivar telemetría y limitar memoria
ENV ASTRO_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

# ── Generar cliente Prisma y compilar
RUN bun prisma generate
RUN bun run build

# ── Runtime
FROM base AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# ── Entorno y Red
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321
CMD ["bun", "run", "start"]