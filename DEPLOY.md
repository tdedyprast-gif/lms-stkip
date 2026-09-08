# Panduan Deploy LMS STKIP ke VPS

Panduan ini mencakup proses deploy lengkap dari awal hingga aplikasi berjalan dengan HTTPS.

## Prasyarat di VPS

- Ubuntu 22.04 / Debian 12
- Docker Engine & Docker Compose Plugin terinstall
- Nginx terinstall di host (bukan dalam container)
- Domain sudah mengarah ke IP VPS (`dwijacode.my.id`)
- Certbot terinstall untuk SSL Let's Encrypt
- Port 80 dan 443 terbuka di firewall

---

## Langkah 1: Upload Kode ke VPS

```bash
# Dari local machine — clone atau rsync project ke VPS
git clone https://github.com/your-repo/lms-stkip.git /var/www/lms-stkip
cd /var/www/lms-stkip
```

---

## Langkah 2: Buat File `.env`

```bash
# Salin template
cp .env.example .env

# Edit dengan nilai production yang aman
nano .env
```

Isi `.env` minimal:

```env
# === DATABASE ===
POSTGRES_USER=lms_stkip_admin
POSTGRES_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT_32_KARAKTER
POSTGRES_DB=lms_stkip_db

# === APLIKASI ===
APP_TZ=Asia/Jakarta

# === FRONTEND ===
# Relative path — dihandle oleh Nginx host
REACT_APP_BACKEND_URL=/api
```

> ⚠️ **JANGAN** commit file `.env` ke Git. Pastikan `.gitignore` mengecualikannya.

---

## Langkah 3: Setup Nginx Host

```bash
# Copy config nginx ke sites-available
sudo cp nginx-vps.conf /etc/nginx/sites-available/lms-stkip.conf

# Aktifkan site
sudo ln -sf /etc/nginx/sites-available/lms-stkip.conf \
            /etc/nginx/sites-enabled/lms-stkip.conf

# Test konfigurasi
sudo nginx -t

# Reload nginx (belum ada SSL, hanya HTTP dulu)
sudo systemctl reload nginx
```

---

## Langkah 4: Dapatkan SSL Certificate (Let's Encrypt)

```bash
# Install Certbot jika belum ada
sudo apt install certbot python3-certbot-nginx -y

# Dapatkan certificate
sudo certbot --nginx -d dwijacode.my.id -d www.dwijacode.my.id -d belajar.dwijacode.my.id

# Certbot otomatis memodifikasi nginx config untuk SSL
# Verifikasi auto-renewal
sudo certbot renew --dry-run
```

---

## Langkah 5: Build dan Jalankan Docker Containers

```bash
cd /var/www/lms-stkip

# Build semua images (pertama kali atau setelah ada perubahan kode)
docker compose build

# Jalankan semua container di background
docker compose up -d

# Cek status semua container
docker compose ps
```

Output yang diharapkan:
```
NAME                        STATUS
lms_stkip_db                healthy
lms_stkip_backend_go        healthy
lms_stkip_backend_proxy     healthy
lms_stkip_frontend          healthy
```

---

## Langkah 6: Verifikasi Keamanan

### Pastikan port berbahaya TIDAK terbuka

```bash
# Cek port yang listening
ss -tlnp | grep LISTEN

# Yang BENAR (hanya loopback untuk container LMS):
#   127.0.0.1:3001   → frontend container
#   127.0.0.1:8001   → backend-proxy container
#
# Yang TIDAK BOLEH ADA:
#   0.0.0.0:5432     → database (berbahaya!)
#   0.0.0.0:9000     → backend-go (berbahaya!)
```

### Verifikasi isolasi network Docker

```bash
# List Docker networks
docker network ls | grep lms_stkip

# Inspeksi network (hanya container LMS yang boleh masuk)
docker network inspect lms_stkip_net
```

### Test endpoint dari luar

```bash
# Frontend harus bisa diakses via HTTPS
curl -I https://dwijacode.my.id

# API harus merespons
curl -I https://dwijacode.my.id/api/health

# Port 5432 harus TIDAK bisa diakses dari luar
# (ini harus gagal / connection refused)
curl -v telnet://dwijacode.my.id:5432
```

---

## Perintah Umum

```bash
# Lihat log semua container
docker compose logs -f

# Lihat log container tertentu
docker compose logs -f backend-proxy

# Restart satu service
docker compose restart frontend

# Update deploy (setelah push kode baru)
git pull
docker compose build --no-cache
docker compose up -d

# Stop semua
docker compose down

# Stop dan hapus volumes (HATI-HATI: data DB akan hilang!)
docker compose down -v
```

---

## Struktur Port di VPS

| Service | Port Host | Port Container | Akses dari |
|---------|-----------|----------------|------------|
| Nginx (HTTP) | `80` | — | Internet (redirect ke HTTPS) |
| Nginx (HTTPS) | `443` | — | Internet |
| Frontend container | `127.0.0.1:3001` | `80` | Nginx host only |
| Backend Proxy container | `127.0.0.1:8001` | `8001` | Nginx host only |
| Backend Go (**internal**) | ❌ tidak expose | `9000` | Container network only |
| Database (**internal**) | ❌ tidak expose | `5432` | Container network only |
| Grafana (existing) | `3000` | — | Portainer/internal |
| Portainer (existing) | `9443` | — | Admin only |

---

## Troubleshooting

### Container tidak mau start

```bash
# Cek logs detail
docker compose logs db
docker compose logs backend-go
docker compose logs backend-proxy
docker compose logs frontend
```

### Database connection error

```bash
# Pastikan container db sudah healthy
docker compose ps db

# Masuk ke container db dan test koneksi
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"
```

### Nginx error 502 Bad Gateway

```bash
# Pastikan container frontend berjalan dan listening
docker compose ps frontend
curl http://127.0.0.1:3001   # Harus merespons HTML

# Pastikan container backend-proxy berjalan
curl http://127.0.0.1:8001/health

# Test nginx config
sudo nginx -t
sudo nginx -s reload
```
