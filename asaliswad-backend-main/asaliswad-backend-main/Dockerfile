FROM oven/bun:1-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN bun install --no-frozen-lockfile --production

# Copy source
COPY src ./src
COPY tsconfig.json ./

EXPOSE 5000
CMD ["bun", "src/index.ts"]
