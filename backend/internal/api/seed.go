package api

import (
	"fmt"
	"log"
	"os"

	"obelms/internal/models"
)

func (s *Server) Seed() {
	// --- Admin (idempotent upsert) ---
	var admin models.User
	if err := s.DB.Where("email = ?", s.Cfg.AdminEmail).First(&admin).Error; err != nil {
		hash, _ := hashPassword(s.Cfg.AdminPassword)
		admin = models.User{Name: "Administrator", Email: s.Cfg.AdminEmail, PasswordHash: hash, Role: "admin", Prodi: "TI"}
		s.DB.Create(&admin)
	}

	// Only seed demo data once
	var courseCount int64
	s.DB.Model(&models.Course{}).Count(&courseCount)
	if courseCount > 0 {
		s.writeTestCreds()
		return
	}

	dh, _ := hashPassword("dosen123")
	dosen := models.User{Name: "Budi Santoso, M.Kom", Email: "dosen@stkippacitan.ac.id", PasswordHash: dh, Role: "dosen", NIDN: "0712088501", Prodi: "Pendidikan TI"}
	s.DB.Create(&dosen)

	mh, _ := hashPassword("mahasiswa123")
	students := []models.User{
		{Name: "Ahmad Fauzi", Email: "ahmad@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207005", Prodi: "Pendidikan TI"},
		{Name: "Siti Nurhaliza", Email: "siti@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207012", Prodi: "Pendidikan TI"},
		{Name: "Rangga Pratama", Email: "rangga@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207018", Prodi: "Pendidikan TI"},
		{Name: "Dewi Lestari", Email: "dewi@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207023", Prodi: "Pendidikan TI"},
		{Name: "Fajar Ramadhan", Email: "fajar@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207031", Prodi: "Pendidikan TI"},
		{Name: "Nabila Putri", Email: "nabila@student.stkippacitan.ac.id", PasswordHash: mh, Role: "mahasiswa", NIM: "2283207044", Prodi: "Pendidikan TI"},
	}
	for i := range students {
		s.DB.Create(&students[i])
	}

	// --- CPL ---
	cpls := []models.CPL{
		{Code: "CPL-1", Domain: "Sikap", Description: "Menunjukkan sikap religius, humanis, dan tanggung jawab profesional."},
		{Code: "CPL-2", Domain: "Pengetahuan", Description: "Menguasai konsep teoritis rekayasa perangkat lunak dan pemrograman."},
		{Code: "CPL-3", Domain: "Keterampilan Umum", Description: "Mampu menerapkan pemikiran logis, kritis, dan inovatif."},
		{Code: "CPL-4", Domain: "Keterampilan Khusus", Description: "Mampu merancang dan membangun aplikasi web fungsional."},
	}
	for i := range cpls {
		s.DB.Create(&cpls[i])
	}

	// --- Course ---
	course := models.Course{Code: "TIF301", Name: "Pemrograman Web", SKS: 3, Semester: 5, LecturerID: dosen.ID,
		Description: "Mata kuliah pengembangan aplikasi web berbasis OBE meliputi HTML, CSS, JavaScript, backend, dan basis data."}
	s.DB.Create(&course)

	// --- CPMK ---
	cpmkDefs := []struct {
		Code, Desc string
		CPLIdx     int
		Threshold  float64
	}{
		{"CPMK-1", "Mampu menjelaskan konsep dasar dan arsitektur aplikasi web.", 1, 65},
		{"CPMK-2", "Mampu membangun antarmuka web responsif dengan HTML/CSS/JS.", 3, 70},
		{"CPMK-3", "Mampu mengembangkan layanan backend dan mengelola basis data.", 3, 70},
		{"CPMK-4", "Mampu merancang proyek aplikasi web utuh secara kolaboratif.", 0, 65},
	}
	cpmks := make([]models.CPMK, 0)
	for _, d := range cpmkDefs {
		cm := models.CPMK{CourseID: course.ID, Code: d.Code, Description: d.Desc, Threshold: d.Threshold}
		s.DB.Create(&cm)
		// link to CPL
		s.DB.Create(&models.CPMKCPL{CPMKID: cm.ID, CPLID: cpls[d.CPLIdx].ID, Weight: 1})
		if d.CPLIdx != 1 {
			s.DB.Create(&models.CPMKCPL{CPMKID: cm.ID, CPLID: cpls[1].ID, Weight: 0.5})
		}
		cpmks = append(cpmks, cm)
	}

	// --- Sub-CPMK across 16 weeks ---
	subDefs := []struct {
		CPMKIdx int
		Week    int
		Code    string
		Desc    string
	}{
		{0, 1, "Sub-1.1", "Menjelaskan arsitektur client-server."},
		{0, 2, "Sub-1.2", "Menjelaskan protokol HTTP dan siklus request-response."},
		{1, 3, "Sub-2.1", "Membuat struktur halaman dengan HTML semantik."},
		{1, 4, "Sub-2.2", "Menata tampilan dengan CSS dan Flexbox/Grid."},
		{1, 5, "Sub-2.3", "Menambahkan interaktivitas dengan JavaScript."},
		{1, 6, "Sub-2.4", "Membangun layout responsif untuk mobile."},
		{2, 9, "Sub-3.1", "Membangun REST API sederhana."},
		{2, 10, "Sub-3.2", "Mengelola koneksi dan query basis data."},
		{2, 11, "Sub-3.3", "Menerapkan autentikasi dan otorisasi."},
		{3, 13, "Sub-4.1", "Merancang arsitektur proyek aplikasi web."},
		{3, 14, "Sub-4.2", "Mengintegrasikan frontend dan backend."},
	}
	for _, d := range subDefs {
		s.DB.Create(&models.SubCPMK{CPMKID: cpmks[d.CPMKIdx].ID, Code: d.Code, Description: d.Desc, Week: d.Week})
	}

	// --- Assessments ---
	assessDefs := []struct {
		Type    string
		Title   string
		Weight  float64
		Week    int
		CPMKIdx []int
	}{
		{"keaktifan", "Keaktifan & Partisipasi", 10, 0, []int{0, 1, 2, 3}},
		{"tugas", "Tugas 1 - HTML & CSS", 10, 4, []int{1}},
		{"tugas", "Tugas 2 - JavaScript", 10, 6, []int{1}},
		{"quiz", "Quiz 1 - Dasar Web", 5, 3, []int{0}},
		{"quiz", "Quiz 2 - Backend", 5, 11, []int{2}},
		{"uts", "Ujian Tengah Semester", 20, 8, []int{0, 1}},
		{"uas", "Ujian Akhir Semester", 20, 16, []int{2, 3}},
		{"project", "Proyek Aplikasi Web", 20, 15, []int{3, 2}},
	}
	assessments := make([]models.Assessment, 0)
	for _, d := range assessDefs {
		a := models.Assessment{CourseID: course.ID, Type: d.Type, Title: d.Title, Weight: d.Weight, MaxScore: 100, Week: d.Week}
		s.DB.Create(&a)
		for _, ci := range d.CPMKIdx {
			s.DB.Create(&models.AssessmentCPMK{AssessmentID: a.ID, CPMKID: cpmks[ci].ID, Weight: 1})
		}
		assessments = append(assessments, a)
	}

	// --- Enroll + Grades ---
	// scores per student per assessment index (8 assessments). Fajar (idx4) at risk.
	scoreTable := [][]float64{
		{90, 85, 88, 80, 82, 78, 84, 86}, // Ahmad
		{85, 90, 87, 90, 88, 85, 82, 90}, // Siti
		{75, 70, 72, 68, 74, 70, 76, 78}, // Rangga
		{88, 82, 80, 85, 79, 80, 83, 85}, // Dewi
		{50, 45, 55, 40, 48, 52, 44, 50}, // Fajar (at risk)
		{80, 78, 82, 76, 80, 77, 81, 79}, // Nabila
	}
	for si, st := range students {
		s.DB.Create(&models.Enrollment{CourseID: course.ID, StudentID: st.ID})
		for ai, a := range assessments {
			s.DB.Create(&models.Grade{AssessmentID: a.ID, StudentID: st.ID, Score: scoreTable[si][ai]})
		}
	}

	// --- 16 Meetings ---
	topics := []string{
		"Pengantar Pemrograman Web & Arsitektur Client-Server",
		"Protokol HTTP dan Struktur Website",
		"HTML Semantik & Struktur Dokumen",
		"CSS: Styling, Flexbox & Grid",
		"JavaScript Dasar & DOM Manipulation",
		"Desain Web Responsif untuk Mobile",
		"Framework Frontend (Pengenalan React)",
		"Ujian Tengah Semester (UTS)",
		"Pengenalan Backend & REST API",
		"Basis Data & Query",
		"Autentikasi, Otorisasi & Keamanan Web",
		"Integrasi Frontend-Backend",
		"Arsitektur Proyek & Version Control",
		"Deployment Aplikasi Web",
		"Presentasi Proyek Akhir",
		"Ujian Akhir Semester (UAS)",
	}
	for i, t := range topics {
		s.DB.Create(&models.Meeting{CourseID: course.ID, Week: i + 1, Topic: t,
			Description: fmt.Sprintf("Materi pertemuan ke-%d membahas %s.", i+1, t)})
	}

	// --- Sample discussion & remediation ---
	s.DB.Create(&models.Discussion{CourseID: course.ID, UserID: dosen.ID, Message: "Selamat datang di kelas Pemrograman Web! Silakan perkenalkan diri kalian di sini."})
	s.DB.Create(&models.Discussion{CourseID: course.ID, UserID: students[0].ID, Message: "Halo, saya Ahmad. Senang bergabung di kelas ini!"})
	s.DB.Create(&models.Remediation{CourseID: course.ID, CPMKID: cpmks[0].ID, StudentID: students[4].ID,
		Reason: "Nilai CPMK-1 di bawah ambang batas (65).", Status: "pending"})

	log.Println("Seed selesai: 1 admin, 1 dosen, 6 mahasiswa, 1 mata kuliah lengkap.")
	s.writeTestCreds()
}

func (s *Server) writeTestCreds() {
	content := `# Test Credentials - OBE LMS STKIP PGRI Pacitan

## Admin
- Email: ` + s.Cfg.AdminEmail + `
- Password: ` + s.Cfg.AdminPassword + `
- Role: admin

## Dosen
- Email: dosen@stkippacitan.ac.id
- Password: dosen123
- Role: dosen (mengampu MK Pemrograman Web / TIF301)

## Mahasiswa (password sama: mahasiswa123)
- ahmad@student.stkippacitan.ac.id (NIM 2283207005)
- siti@student.stkippacitan.ac.id (NIM 2283207012)
- rangga@student.stkippacitan.ac.id (NIM 2283207018)
- dewi@student.stkippacitan.ac.id (NIM 2283207023)
- fajar@student.stkippacitan.ac.id (NIM 2283207031) -> AT RISK (untuk uji early warning)
- nabila@student.stkippacitan.ac.id (NIM 2283207044)

## Auth Endpoints
- POST /api/auth/login  {email, password} -> {token, user}
- POST /api/auth/register
- GET  /api/auth/me  (Bearer token)

Token dikirim via header: Authorization: Bearer <token>
`
	_ = os.MkdirAll("/app/memory", 0755)
	_ = os.WriteFile("/app/memory/test_credentials.md", []byte(content), 0644)
}
