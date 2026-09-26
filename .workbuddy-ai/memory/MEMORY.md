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
- All prodi relations use **ProdiCode** (text-based FK referencing `Prodi.Code`), NOT UUID
- `User` has `ProdiCode` — dosen/mahasiswa linked to prodi via code
- `CPL` has `ProdiCode` — each prodi manages its own CPL set
- `Course` has `ProdiCode` — courses belong to a prodi
- `ListCPL` supports `?prodi_code=` filter, `ListCourses` supports `?prodi_code=`
- `ObeTab` filters CPL by `course.prodi_code`
- RPS print shows prodi name dynamically in identitas table
- AdminCPL: has CreateDialog, EditCPLDialog, CreateProdiDialog
- AdminUsers: UserFormFields uses `<Select>` dropdown for prodi (fetched from /prodi)
- Backend routes: GET/POST /prodi, PUT /prodi/:id, GET /cpl?prodi_code=, GET /courses?prodi_code=

## Conventions
- Indonesian language for UI labels
- Test IDs: `data-testid` on interactive elements
- Responsive: `lg:` breakpoint for desktop sidebar, mobile bottom nav below
