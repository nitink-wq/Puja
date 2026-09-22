# Node 24 (current LTS). Static site, no build step, no dependencies —
# server.js uses only Node core modules (http/fs/path).
FROM node:24-alpine AS base

WORKDIR /app
ENV NODE_ENV=production

COPY . .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
