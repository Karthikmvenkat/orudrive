# SavariGo website — Next.js 15 App Router with a same-origin BFF.
#
#   docker build -f apps/web/Dockerfile -t savarigo/web:0.1.0 .
#
# Two kinds of API address exist here and only one of them is a build argument:
#   * NEXT_PUBLIC_API_URL is inlined into the browser bundle at build time, so
#     it must be the address the *visitor's* browser can reach.
#   * API_URL is read by the server at runtime (route handlers and SSR), so it
#     must be the address the *container* can reach — inside compose that is
#     http://api:4000/api/v1, not the public hostname.
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# Scoped to the website workspace, so the Nest/Prisma/Jest toolchain never
# enters this image.
RUN npm ci --workspace=web --no-audit --no-fund
# This lockfile was generated on Windows and npm records only the platform it
# resolved for, so it contains @img/sharp-win32-x64 and no Linux binary — while
# Next's optimizer hard-requires sharp at runtime (next/dist/server/
# image-optimizer.js does `require('sharp')`). Installing it here lets npm pick
# the @img/sharp-linux-* build for this image, and the require below fails the
# build rather than the site: a missing sharp turns every /_next/image request
# into a 500 in production. --no-save keeps the committed lockfile
# authoritative for everything else.
RUN SHARP_VERSION=$(node -p "require('./package-lock.json').packages['apps/web/node_modules/sharp']?.version ?? ''") \
  && if [ -n "$SHARP_VERSION" ]; then \
      npm install --no-save --workspace=web --no-audit --no-fund "sharp@$SHARP_VERSION" \
      && cd apps/web \
      && node -e "const s=require('sharp');console.log('sharp',s.versions.sharp,'with libvips',s.versions.vips)"; \
    fi

FROM node:24-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV API_URL=${API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# The dependency tree as `npm ci` laid it out: this lockfile nests next, sharp
# and 300 other packages under apps/web/node_modules instead of hoisting them,
# so copying only the root tree would leave `next` unresolvable.
COPY --from=deps /app ./
COPY apps/web ./apps/web
# No API is reachable during the build. Pages that call it fall back to local
# fixtures, and every one of those pages is either dynamic or revalidates within
# a minute, so the artefacts stay correct once the API is up.
RUN npm run build --workspace=web

FROM node:24-slim AS runner
# The app directory is where Next looks for next.config.ts, .next and public, so
# the runtime keeps the workspace layout instead of flattening it.
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
# Whichever tree npm placed the CLI in is resolvable through PATH, so the start
# command does not depend on the hoisting outcome recorded in the lockfile.
ENV PATH="/app/apps/web/node_modules/.bin:/app/node_modules/.bin:${PATH}"
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# ca-certificates is here for the split deployment, where API_URL points at an
# https origin on another host and it is this container's Node process that
# validates the certificate chain.
COPY --from=build --chown=nextjs:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json /app/package.json
COPY --from=build --chown=nextjs:nodejs /app/apps/web/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/apps/web/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/apps/web/next.config.ts ./next.config.ts
COPY --from=build --chown=nextjs:nodejs /app/apps/web/tsconfig.json ./tsconfig.json
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next ./.next
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["next", "start"]
