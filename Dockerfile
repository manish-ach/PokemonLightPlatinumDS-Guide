# syntax=docker/dockerfile:1

# ---- build stage ---------------------------------------------------------
FROM node:26-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage -------------------------------------------------------
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/build ./build
COPY data/seed.json ./data/seed.json
EXPOSE 3000
CMD ["node", "build"]
