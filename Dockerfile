# ── Stage 1: Build the frontend ──────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/dashboard

# Copy package files first, install dependencies
# We do this before copying source code intentionally (explained below)
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci

# Now copy source and build
COPY dashboard/ .
RUN npm run build


# ── Stage 2: Python backend ───────────────────────────────────
FROM python:3.12-slim AS backend

WORKDIR /app/server

# Copy and install Python dependencies first (same reason as above)
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY server/ .

# Ensure data directory exists for SQLite DB
RUN mkdir -p /app/server/data

# Copy the built frontend from Stage 1 into the right place
# FastAPI looks for ../dashboard/dist relative to server/
COPY --from=frontend-builder /app/dashboard/dist ../dashboard/dist

# Expose the port uvicorn will listen on
EXPOSE 8001

# Start the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]