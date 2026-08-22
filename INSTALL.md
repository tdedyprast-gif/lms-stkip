# OBE-LMS Docker Installation Guide

Panduan ini akan menjelaskan cara menjalankan seluruh layanan aplikasi OBE-LMS menggunakan Docker Compose. Aplikasi ini terdiri dari:
1. **PostgreSQL** (Database)
2. **Backend Go** (Service utama)
3. **Backend Proxy** (Python FastAPI)
4. **Frontend React** (Nginx web server)

## Prasyarat
- Pastikan [Docker](https://docs.docker.com/get-docker/) sudah terinstal di sistem Anda.
- Pastikan [Docker Compose](https://docs.docker.com/compose/install/) sudah terinstal.

## Cara Menjalankan

Anda dapat menjalankan backend dan frontend secara terpisah sesuai dengan kebutuhan.

1. Buka terminal dan arahkan ke direktori root proyek ini:
   ```bash
   cd /path/to/lms-stkip
   ```

2. **Penting (Keamanan)**: Salin file `.env.example` menjadi `.env` dan ganti kredensial database default dengan password yang kuat untuk keamanan produksi:
   ```bash
   cp .env.example .env
   nano .env
   ```

### 1. Menjalankan Backend Saja (Database, Go, Proxy)
Jika Anda hanya ingin menjalankan API (sangat berguna jika Anda sedang men-develop frontend secara terpisah di host machine), jalankan:
```bash
docker-compose up --build -d db backend-go backend-proxy
```

### 2. Menjalankan Frontend Saja
Jika backend sudah berjalan (atau berjalan di terminal terpisah), Anda bisa menjalankan frontend dengan:
```bash
docker-compose up --build -d frontend
```

> **Catatan**: Flag `-d` menjalankan container di *background*. Anda dapat menghapusnya jika ingin melihat log secara langsung.

### (Opsional) Menjalankan Semuanya Sekaligus
```bash
docker-compose up --build -d
```

## Mengakses Aplikasi

Setelah container berjalan, aplikasi dapat diakses melalui URL berikut:

- **Frontend Aplikasi**: [http://localhost:3000](http://localhost:3000)
- **Backend API Proxy (FastAPI)**: [http://localhost:8001](http://localhost:8001)
- **Backend Service (Go)**: [http://localhost:9000](http://localhost:9000)
- **Database PostgreSQL**: `localhost:5432` (Username: `postgres`, Password: `postgres`)

## Menghentikan Aplikasi

Sama seperti menjalankannya, Anda juga bisa menghentikannya secara terpisah:

### 1. Menghentikan Backend
```bash
docker-compose stop db backend-go backend-proxy
```
Untuk menghentikan dan **menghapus** container backend saja:
```bash
docker-compose rm -svf db backend-go backend-proxy
```

### 2. Menghentikan Frontend
```bash
docker-compose stop frontend
```
Untuk menghentikan dan **menghapus** container frontend saja:
```bash
docker-compose rm -svf frontend
```

### Menghentikan Semua Layanan Sekaligus
Untuk menghentikan seluruh layanan dan menghapus containernya:
```bash
docker-compose down
```

> **Penting**: Data upload file (`uploads_data`) dan database (`postgres_data`) disimpan dalam *Docker Volumes* sehingga data Anda tidak akan hilang meskipun container dihapus dengan perintah di atas.

## Menghapus Data Secara Keseluruhan (Hard Reset)

Jika Anda ingin mereset keseluruhan aplikasi termasuk menghapus seluruh data di dalam database dan file upload:
```bash
docker-compose down -v
```
*(Hati-hati, perintah ini akan menghapus semua volume data secara permanen).*
