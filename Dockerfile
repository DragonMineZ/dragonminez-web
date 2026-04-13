FROM oven/bun:latest AS base
WORKDIR /app

# ── Build: Instalación y Compilación
FROM base AS build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
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
