# SavariGo API — NestJS 11 + Prisma 6.
#
# Build from the repository root, because the workspace resolves hoisted
# dependencies there:
#
#   docker build -f apps/api/Dockerfile -t savarigo/api:0.3.0 .
#
# Migrations are not run by this image. On a VPS they belong to a one-shot
# service (see the repository-root docker-compose.yml) so the long-running
# process never needs DDL rights on the production database.
FROM node:24-slim AS deps
WORKDIR /app
# The Prisma query engine links against OpenSSL, which -slim does not ship.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# Scoped to the API workspace: a full `npm ci` would also drop the website's
# 485 MB of Next, Tailwind and Playwright into the backend image. This lockfile
# hoists every API dependency to the root node_modules, so `-w api` is enough
# for both the CLI and the runtime.
RUN npm ci --workspace=api --no-audit --no-fund

FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# The whole dependency tree exactly as `npm ci` laid it out, not just the root
# node_modules, because npm records where each package belongs.
COPY --from=deps /app ./
# The API carries its own tsconfig.build.json (nest-cli.json points at it), so no
# root TypeScript config is needed to compile it.
COPY apps/api ./apps/api
# Generates .prisma/client (the engine binary lands in node_modules/.prisma) and
# then compiles Nest; both must happen before the runtime stage copies anything.
RUN npm run db:generate --workspace=api && npm run build --workspace=api

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# 4000 is the API default; compose and nginx override PORT when the topology differs.
ENV PORT=4000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs savarigo
# The dev toolchain (nest, prisma CLI, ts-node, jest) stays: `prisma migrate
# deploy` is run from this image by the migration service.
COPY --from=build --chown=savarigo:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=savarigo:nodejs /app/package.json ./package.json
COPY --from=build --chown=savarigo:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=savarigo:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=savarigo:nodejs /app/apps/api/prisma ./apps/api/prisma
USER savarigo
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
