# Project Memory — OBE-LMS STKIP Pacitan

## Stack
- Backend: Go (Gin+GORM), PostgreSQL
- Frontend: React (CRA), TailwindCSS, shadcn/ui, lucide-react, sonner
- Path alias `@/` → `frontend/src/`

## Key Models
- Course: {code, name, sks, semester, description, lecturer}
- RPS: {course_id, data(text/JSON)} — stored as JSON string in `data` field
- CPMK → SubCPMK (week-based), CPMKCPL (links to CPL)
- Meeting: {week, topic, description, materials[]}
- Assessment: {type, title, weight, max_score, week, cpmk_links[]}

## RPS Print Format (from official docx)
- Table 1: Identitas (name, code, rumpun, sks, semester, tanggal)
- Table 2: Otorisasi (pengembang, koordinator, kaprodi) + CPL + CPMK + Sub-CPMK + deskripsi + pustaka
- Table 3: Jadwal 16 minggu (Mg, Sub-CPMK, Indikator, Kriteria, Luring, Daring, Materi, Bobot%)
- Table 4: Evaluasi ringkasan (No, Evaluasi, Persentase)
- Print module: `frontend/src/lib/printRps.js` — A4 landscape, Times New Roman

## Multi-Prodi Architecture
- `Prodi` model: {code, name} — 8 programs seeded on first run
- `CPL` has `ProdiID` — each prodi manages its own CPL set
- `Course` has `ProdiID` — courses belong to a prodi
- `ListCPL` supports `?prodi_id=` filter
- `ObeTab` filters CPL by `course.prodi_id`
- RPS print shows prodi name dynamically in identitas table

## Conventions
- Indonesian language for UI labels
- Test IDs: `data-testid` on interactive elements
- Responsive: `lg:` breakpoint for desktop sidebar, mobile bottom nav below
