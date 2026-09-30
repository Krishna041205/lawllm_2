# Stage 1: Build Frontend and Server Bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source
COPY . .

# Build Vite client assets and compile backend server to dist/
RUN npm run build

# Stage 2: Production Execution Environment
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist

# Copy migrations and database scripts for runtime database management
COPY --from=builder /app/backend ./backend

EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
