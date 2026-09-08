# =============================================================================
# Frontend Dockerfile — CRA + CRACO → Nginx Static Server
#
# Stage 1 (builder): Build React app → output di /app/build
# Stage 2 (runner) : Nginx alpine serve static files dari /app/build
#
# SSL TIDAK dikonfigurasi di sini — SSL dihandle oleh Nginx di host VPS.
# Container ini hanya serve HTTP di port 80 (internal network saja).
# =============================================================================

# --- Stage 1: Build React Application ---
FROM node:20-alpine AS builder
RUN apk add --no-cache curl


WORKDIR /app

# Copy dependency files dulu untuk memanfaatkan Docker layer cache
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# REACT_APP_BACKEND_URL dikirim dari docker-compose build args
# Di VPS: nilainya /api (relative path, dihandle Nginx host)
ARG REACT_APP_BACKEND_URL=/api
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build production bundle (CRA + CRACO → output: /app/build)
RUN yarn build

# --- Stage 2: Serve Static Files with Nginx ---
FROM nginx:1.27-alpine AS runner

# Hapus default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config untuk SPA (React Router support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy hasil build dari stage 1
COPY --from=builder /app/build /usr/share/nginx/html

# Pastikan file statis dapat dibaca oleh nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80 (HTTP internal — SSL ada di Nginx host VPS)
EXPOSE 80

# Jalankan Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]
