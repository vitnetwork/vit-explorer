# ── Stage 1: Build React app ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: Serve with lightweight Python/FastAPI ─────────────────────────
FROM python:3.11-slim
WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn[standard] aiofiles

COPY --from=builder /app/dist /app/dist
COPY serve.py /app/serve.py

ENV PORT=8000
EXPOSE 8000

CMD uvicorn serve:app --host 0.0.0.0 --port ${PORT}
