#!/bin/bash
#
# ==========================================================
#  SKRIP MIGRASI & REDEPLOY OBE-LMS STKIP PGRI PACITAN
#  Perubahan: kolom prodi → prodi_code, prodi_id → prodi_code
# ==========================================================
#
#  CARA PAKAI:
#    cd /var/www/lms-stkip   (atau path project di VPS)
#    chmod +x migrate-and-redeploy.sh
#    ./migrate-and-redeploy.sh
#
#  APA YANG DILAKUKAN:
#    1. Backup database (pg_dump ke file .sql)
#    2. Stop container backend-go (jangan stop DB!)
#    3. Jalankan migrasi SQL manual (rename kolom)
#    4. Rebuild backend image dengan kode baru
#    5. Rebuild frontend image dengan kode baru
#    6. Start semua container
#    7. Verifikasi
#
#  DATA AMAN: volume postgres_data TIDAK dihapus.
#  Backup .sql juga dibuat sebagai jaga-jaga.
# ==========================================================

set -e  # Stop pada error

echo "=========================================="
echo "  MIGRASI & REDEPLOY OBE-LMS"
echo "=========================================="

# --- 0. Load .env ---
if [ ! -f .env ]; then
  echo "ERROR: File .env tidak ditemukan!"
  exit 1
fi

source .env

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_db_${TIMESTAMP}.sql"

echo ""
echo "[1/7] BACKUP DATABASE ke ${BACKUP_FILE}..."
echo "------------------------------------------"
# Dump database dari container ke file lokal
docker compose exec -T db \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  --no-owner --no-privileges \
  > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "  ✓ Backup tersimpan: ${BACKUP_FILE} (${FILE_SIZE})"

echo ""
echo "[2/7] STOP BACKEND (DB tetap berjalan)..."
echo "------------------------------------------"
# Stop hanya backend, DB tetap hidup untuk migrasi
docker compose stop backend-go backend-proxy frontend
echo "  ✓ Backend & frontend dihentikan"
echo "  ✓ Database masih berjalan"

echo ""
echo "[3/7] MIGRASI SKEMA DATABASE..."
echo "------------------------------------------"

# Jalankan migrasi SQL via psql di container DB
# AutoMigrate GORM akan menambah kolom baru tapi TIDAK menghapus kolom lama,
# jadi kita lakukan rename manual supaya data lama terselamatkan
docker compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<'SQL'
BEGIN;

-- ====================================
-- TABEL: users
-- Kolom lama: prodi (text) → prodi_code (text)
-- ====================================

-- Tambah kolom prodi_code jika belum ada
ALTER TABLE users ADD COLUMN IF NOT EXISTS prodi_code VARCHAR;

-- Copy data dari prodi ke prodi_code
-- Mapping nilai lama ke kode prodi
UPDATE users SET prodi_code = CASE
  WHEN prodi ILIKE '%informatika%' OR prodi ILIKE '%TI%' THEN 'PIN'
  WHEN prodi ILIKE '%matematika%' THEN 'PMAT'
  WHEN prodi ILIKE '%sejarah%' THEN 'PSEJ'
  WHEN prodi ILIKE '%bahasa%inggris%' THEN 'PBI'
  WHEN prodi ILIKE '%bahasa%indonesia%' THEN 'PBSI'
  WHEN prodi ILIKE '%jasmani%' OR prodi ILIKE '%olahraga%' THEN 'PJKR'
  WHEN prodi ILIKE '%sekolah%dasar%' THEN 'PGSD'
  WHEN prodi ILIKE '%profesi%guru%' THEN 'PPG'
  WHEN prodi IS NOT NULL AND prodi != '' THEN 'PIN'  -- fallback
  ELSE prodi_code
END
WHERE prodi IS NOT NULL AND prodi != '';

-- Hapus kolom lama prodi (opsional, bisa dikomentari jika ragu)
-- ALTER TABLE users DROP COLUMN IF EXISTS prodi;

-- ====================================
-- TABEL: cpls
-- Kolom lama: prodi_id (uuid) → prodi_code (text)
-- ====================================

-- Tambah kolom prodi_code jika belum ada
ALTER TABLE cpls ADD COLUMN IF NOT EXISTS prodi_code VARCHAR;

-- Copy data: cari kode prodi dari tabel prodis berdasarkan prodi_id
UPDATE cpls SET prodi_code = sub.code
FROM (
  SELECT p.id, p.code FROM prodis p
) sub
WHERE cpls.prodi_id = sub.id AND cpls.prodi_code IS NULL;

-- Jika ada CPL tanpa prodi_code, set default ke PIN
UPDATE cpls SET prodi_code = 'PIN' WHERE prodi_code IS NULL;

-- Hapus foreign key constraint lama jika ada (prodi_id)
-- Lalu hapus kolom prodi_id
ALTER TABLE cpls DROP COLUMN IF EXISTS prodi_id;

-- ====================================
-- TABEL: courses
-- Kolom lama: prodi_id (uuid) → prodi_code (text)
-- ====================================

-- Tambah kolom prodi_code jika belum ada
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prodi_code VARCHAR;

-- Copy data: cari kode prodi dari tabel prodis berdasarkan prodi_id
UPDATE courses SET prodi_code = sub.code
FROM (
  SELECT p.id, p.code FROM prodis p
) sub
WHERE courses.prodi_id = sub.id AND courses.prodi_code IS NULL;

-- Jika ada course tanpa prodi_code, set default ke PIN
UPDATE courses SET prodi_code = 'PIN' WHERE prodi_code IS NULL;

-- Hapus kolom prodi_id
ALTER TABLE courses DROP COLUMN IF EXISTS prodi_id;

COMMIT;

-- Verifikasi
SELECT 'users dengan prodi_code:' as info, count(*) as total FROM users WHERE prodi_code IS NOT NULL AND prodi_code != ''
UNION ALL
SELECT 'cpls dengan prodi_code:', count(*) FROM cpls WHERE prodi_code IS NOT NULL AND prodi_code != ''
UNION ALL
SELECT 'courses dengan prodi_code:', count(*) FROM courses WHERE prodi_code IS NOT NULL AND prodi_code != '';
SQL

echo "  ✓ Migrasi skema selesai"

echo ""
echo "[4/7] PULL KODE TERBARU..."
echo "------------------------------------------"
git pull
echo "  ✓ Kode terbaru di-pull"

echo ""
echo "[5/7] REBUILD DOCKER IMAGES..."
echo "------------------------------------------"
# Build ulang backend dan frontend dengan kode baru
docker compose build --no-cache backend-go backend-proxy frontend
echo "  ✓ Images selesai di-build"

echo ""
echo "[6/7] START SEMUA CONTAINER..."
echo "------------------------------------------"
docker compose up -d
echo "  ✓ Container dimulai"

echo ""
echo "[7/7] VERIFIKASI..."
echo "------------------------------------------"
sleep 5  # Tunggu container stabil

echo "  Status container:"
docker compose ps

echo ""
echo "  Test API health:"
if curl -sf http://127.0.0.1:8001/api/health > /dev/null 2>&1; then
  echo "  ✓ API backend: OK"
else
  echo "  ✗ API backend: GAGAL (cek log: docker compose logs backend-go)"
fi

if curl -sf http://127.0.0.1:3001 > /dev/null 2>&1; then
  echo "  ✓ Frontend: OK"
else
  echo "  ✗ Frontend: GAGAL (cek log: docker compose logs frontend)"
fi

echo ""
echo "=========================================="
echo "  MIGRASI SELESAI"
echo "=========================================="
echo ""
echo "  Backup DB: ${BACKUP_FILE} (${FILE_SIZE})"
echo "  Volume DB: lms_stkip_postgres_data (TIDAK dihapus)"
echo ""
echo "  Jika ada masalah, restore backup:"
echo "    docker compose exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < ${BACKUP_FILE}"
echo ""
echo "  Cek log jika perlu:"
echo "    docker compose logs -f backend-go"
echo ""
