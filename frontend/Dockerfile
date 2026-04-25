FROM oven/bun:1.2.23-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.23-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_BACKEND_ORIGIN=http://backend:8000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_BACKEND_ORIGIN=${NEXT_PUBLIC_BACKEND_ORIGIN}
COPY --from=deps /app/node_modules ./node_modules
COPY frontend ./
RUN bun run build \
	&& rm -rf .next/cache

FROM oven/bun:1.2.23-alpine AS prod-deps
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2.23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
EXPOSE 3000
CMD ["bun", "run", "start"]
