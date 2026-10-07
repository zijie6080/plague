# Server mode: one container serves the site, runs the scheduler in-process and
# pushes updates to open pages over SSE. Mount /app/data to keep history.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
ENV PORT=8080 NODE_ENV=production
EXPOSE 8080
VOLUME ["/app/data"]
HEALTHCHECK --interval=60s --timeout=5s CMD curl -fs http://localhost:8080/api/health || exit 1
CMD ["node", "--max-http-header-size=65536", "server/index.mjs"]
