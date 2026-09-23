# Node 24 (current LTS). Static site plus a minimal event-capture API -
# server.js uses the `pg` package to write events to Postgres.
FROM node:24-alpine AS base

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
