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

# Public Firebase web config — must be present at `next build` (client-inlined).
# Cloud Run `--set-build-env-vars` does not reliably map to Docker ARG for --source builds.
ENV NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyCJ9hJbciDjqxqSR7EMnnqnYpfiahyHNO4" \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="antiable-anipin.firebaseapp.com" \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="antiable-anipin" \
    NEXT_PUBLIC_FIREBASE_APP_ID="1:852169798731:web:eb95735b011d77ce36c9ce" \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-PMSD55TH5V"

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
