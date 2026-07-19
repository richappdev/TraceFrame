FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

# Install the monorepo dependencies before copying sources for better layer reuse.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/anitabi/package.json packages/anitabi/package.json
COPY packages/bangumi/package.json packages/bangumi/package.json
COPY packages/presence/package.json packages/presence/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages
COPY valid-ids.csv ./valid-ids.csv

RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/tmp/antiable \
    APP_STORE=firestore

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone/ ./

USER node
EXPOSE 8080

CMD ["node", "apps/web/server.js"]
