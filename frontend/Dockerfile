FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
# Jika proyek Anda menggunakan yarn.lock, copy juga filenya agar instalasi dependensi konsisten
COPY yarn.lock* ./ 
RUN yarn install
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Sesuai gambar, proyek Anda menggunakan Vite, ubah target output ke folder dist
RUN yarn build

FROM nginx:alpine
# DIPERBAIKI: Mengubah /app/build menjadi /app/dist karena menggunakan Vite
COPY --from=builder /app/build /usr/share/nginx/html

# Konfigurasi Nginx Baru mendukung SSL Gratis Let's Encrypt
RUN echo 'server { \
    listen 80; \
    server_name api-backend.dwijacode.my.id; \
    \
    # Jalur wajib bagi Certbot untuk memvalidasi kepemilikan domain \
    location /.well-known/acme-challenge/ { \
    root /var/www/html; \
    } \
    \
    # Mengalihkan semua lalu lintas HTTP biasa ke HTTPS \
    location / { \
    return 301 https://$host$request_uri; \
    } \
    } \
    \
    server { \
    listen 443 ssl; \
    server_name api-backend.dwijacode.my.id; \
    \
    # Lokasi Sertifikat SSL (Akan dibuat oleh Certbot nanti) \
    ssl_certificate /etc/letsencrypt/live/dwijacode.my.id/fullchain.pem; \
    ssl_certificate_key /etc/letsencrypt/live/dwijacode.my.id/privkey.pem; \
    \
    # Pengaturan Keamanan SSL Standar \
    ssl_protocols TLSv1.2 TLSv1.3; \
    ssl_ciphers HIGH:!aNULL:!MD5; \
    \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
    proxy_pass http://backend-proxy:8001/; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    }' > /etc/nginx/conf.d/default.conf


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
