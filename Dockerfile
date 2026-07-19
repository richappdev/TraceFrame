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

# Public Firebase web config (baked into the Next.js client bundle at build time).
ARG NEXT_PUBLIC_FIREBASE_API_KEY=""
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="antiable-anipin.firebaseapp.com"
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID="antiable-anipin"
ARG NEXT_PUBLIC_FIREBASE_APP_ID=""
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

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

CMD ["node", "apps/web/start-production.mjs"]
