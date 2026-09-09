FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies first (better caching)
COPY package.json bun.lockb* ./
RUN bun install --production

# Copy app source
COPY src/ ./src/
COPY public/ ./public/
COPY tsconfig.json ./

# Runtime
EXPOSE 10901
ENV PORT=10901

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:10901/health').then(r => process.exit(r.ok ? 0 : 1))"

CMD ["bun", "run", "src/index.tsx"]
