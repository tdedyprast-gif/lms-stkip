package api

import (
	"encoding/json"
	"net/http"

	"strings"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// ---------- Users (admin) ----------

func (s *Server) ListUsers(c *gin.Context) {
	var users []models.User
	q := s.DB.Preload("Prodi").Order("created_at desc")
	if role := c.Query("role"); role != "" {
		q = q.Where("role = ?", role)
	}
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ? OR nim ILIKE ?", like, like, like)
	}
	q.Find(&users)
	c.JSON(http.StatusOK, users)
}

func (s *Server) CreateUser(c *gin.Context) {
	var req registerReq
	if !bind(c, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	var existing models.User
	if err := s.DB.Where("email = ?", email).First(&existing).Error; err == nil {
		fail(c, http.StatusBadRequest, "Email sudah terdaftar")
		return
	}
	hash, _ := hashPassword(req.Password)
	role := req.Role
	if role == "" {
		role = "mahasiswa"
	}
	u := models.User{Name: req.Name, Email: email, PasswordHash: hash, Role: role, NIM: req.NIM, NIDN: req.NIDN, ProdiCode: req.ProdiCode}
	if err := s.DB.Create(&u).Error; err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, u)
}

func (s *Server) UpdateUser(c *gin.Context) {
	var u models.User
	if err := s.DB.First(&u, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "user tidak ditemukan")
		return
	}
	var req registerReq
	_ = c.ShouldBindJSON(&req)
	if req.Name != "" {
		u.Name = req.Name
	}
	if req.Role != "" {
		u.Role = req.Role
	}
	if req.NIM != "" {
		u.NIM = req.NIM
	}
	if req.NIDN != "" {
		u.NIDN = req.NIDN
	}
	if req.ProdiCode != "" {
		u.ProdiCode = req.ProdiCode
	}
	if req.Password != "" {
		u.PasswordHash, _ = hashPassword(req.Password)
	}
	s.DB.Save(&u)
	c.JSON(http.StatusOK, u)
}

func (s *Server) DeleteUser(c *gin.Context) {
	s.DB.Delete(&models.User{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Program Studi ----------

func (s *Server) ListProdi(c *gin.Context) {
	var prodis []models.Prodi
	s.DB.Order("code asc").Find(&prodis)
	c.JSON(http.StatusOK, prodis)
}

func (s *Server) CreateProdi(c *gin.Context) {
	var p models.Prodi
	if !bind(c, &p) {
		return
	}
	if p.Code == "" || p.Name == "" {
		fail(c, http.StatusBadRequest, "Kode dan nama prodi wajib diisi")
		return
	}
	// Check duplicate code
	var existing models.Prodi
	if err := s.DB.Where("code = ?", p.Code).First(&existing).Error; err == nil {
		fail(c, http.StatusBadRequest, "Kode prodi sudah digunakan")
		return
	}
	s.DB.Create(&p)
	c.JSON(http.StatusOK, p)
}

func (s *Server) UpdateProdi(c *gin.Context) {
	var p models.Prodi
	if err := s.DB.First(&p, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "prodi tidak ditemukan")
		return
	}
	var body models.Prodi
	_ = c.ShouldBindJSON(&body)
	if body.Code != "" {
		p.Code = body.Code
	}
	if body.Name != "" {
		p.Name = body.Name
	}
	s.DB.Save(&p)
	c.JSON(http.StatusOK, p)
}

// ---------- CPL ----------

func (s *Server) ListCPL(c *gin.Context) {
	var cpls []models.CPL
	q := s.DB.Preload("Prodi").Order("code asc")
	if prodiCode := c.Query("prodi_code"); prodiCode != "" {
		q = q.Where("prodi_code = ?", prodiCode)
	}
	q.Find(&cpls)
	c.JSON(http.StatusOK, cpls)
}

type cplInput struct {
	Code        string          `json:"code"`
	Description string          `json:"description"`
	Domain      json.RawMessage `json:"domain"`
	ProdiCode   string          `json:"prodi_code"`
}

func parseDomainRaw(raw json.RawMessage) datatypes.JSON {
	if len(raw) == 0 {
		return nil
	}
	// Coba string
	var str string
	if err := json.Unmarshal(raw, &str); err == nil {
		b, _ := json.Marshal([]string{str})
		return datatypes.JSON(b)
	}
	// Coba array
	var arr []string
	if err := json.Unmarshal(raw, &arr); err == nil {
		b, _ := json.Marshal(arr)
		return datatypes.JSON(b)
	}
	// Fallback
	return datatypes.JSON(raw)
}

func (s *Server) CreateCPL(c *gin.Context) {
	var input cplInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	cpl := models.CPL{
		Code:        input.Code,
		Description: input.Description,
		Domain:      parseDomainRaw(input.Domain),
		ProdiCode:   input.ProdiCode,
	}
	if err := s.DB.Create(&cpl).Error; err != nil {
		fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	s.DB.Preload("Prodi").First(&cpl, "id = ?", cpl.ID)
	c.JSON(http.StatusOK, cpl)
}

func (s *Server) UpdateCPL(c *gin.Context) {
	var cpl models.CPL
	if err := s.DB.First(&cpl, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "cpl tidak ditemukan")
		return
	}
	var input cplInput
	if err := c.ShouldBindJSON(&input); err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	cpl.Code = input.Code
	cpl.Description = input.Description
	if len(input.Domain) > 0 {
		cpl.Domain = parseDomainRaw(input.Domain)
	}
	if input.ProdiCode != "" {
		cpl.ProdiCode = input.ProdiCode
	}
	s.DB.Save(&cpl)
	s.DB.Preload("Prodi").First(&cpl, "id = ?", cpl.ID)
	c.JSON(http.StatusOK, cpl)
}

func (s *Server) DeleteCPL(c *gin.Context) {
	s.DB.Delete(&models.CPL{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Courses ----------

func (s *Server) ListCourses(c *gin.Context) {
	var courses []models.Course
	role := currentRole(c)
	uid := currentUserID(c)
	q := s.DB.Preload("Lecturer").Preload("Prodi").Order("created_at desc")
	if prodiCode := c.Query("prodi_code"); prodiCode != "" {
		q = q.Where("prodi_code = ?", prodiCode)
	}
	switch role {
	case "dosen":
		q = q.Where("lecturer_id = ?", uid)
	case "mahasiswa":
		var ids []string
		s.DB.Model(&models.Enrollment{}).Where("student_id = ?", uid).Pluck("course_id", &ids)
		if len(ids) == 0 {
			c.JSON(http.StatusOK, []models.Course{})
			return
		}
		q = q.Where("id IN ?", ids)
	}
	q.Find(&courses)
	c.JSON(http.StatusOK, courses)
}

func (s *Server) GetCourse(c *gin.Context) {
	var course models.Course
	if err := s.DB.Preload("Lecturer").Preload("Prodi").First(&course, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "mata kuliah tidak ditemukan")
		return
	}
	c.JSON(http.StatusOK, course)
}

func (s *Server) CreateCourse(c *gin.Context) {
	var course models.Course
	if !bind(c, &course) {
		return
	}
	if course.LecturerID == "" && currentRole(c) == "dosen" {
		course.LecturerID = currentUserID(c)
	}
	s.DB.Create(&course)
	s.DB.Preload("Lecturer").Preload("Prodi").First(&course, "id = ?", course.ID)
	c.JSON(http.StatusOK, course)
}

func (s *Server) UpdateCourse(c *gin.Context) {
	var course models.Course
	if err := s.DB.First(&course, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "mata kuliah tidak ditemukan")
		return
	}
	var body models.Course
	_ = c.ShouldBindJSON(&body)
	course.Code = body.Code
	course.Name = body.Name
	course.SKS = body.SKS
	course.Semester = body.Semester
	course.Description = body.Description
	if body.LecturerID != "" {
		course.LecturerID = body.LecturerID
	}
	if body.ProdiCode != "" {
		course.ProdiCode = body.ProdiCode
	}
	s.DB.Save(&course)
	s.DB.Preload("Lecturer").Preload("Prodi").First(&course, "id = ?", course.ID)
	c.JSON(http.StatusOK, course)
}

func (s *Server) DeleteCourse(c *gin.Context) {
	s.DB.Delete(&models.Course{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- CPMK ----------

func (s *Server) ListCPMK(c *gin.Context) {
	var cpmks []models.CPMK
	s.DB.Where("course_id = ?", c.Param("id")).
		Preload("CPLLinks.CPL").
		Order("code asc").Find(&cpmks)
	for i := range cpmks {
		s.DB.Where("cpmk_id = ?", cpmks[i].ID).Order("week asc").Find(&cpmks[i].SubCPMKs)
	}
	c.JSON(http.StatusOK, cpmks)
}

func (s *Server) CreateCPMK(c *gin.Context) {
	var cpmk models.CPMK
	if !bind(c, &cpmk) {
		return
	}
	if cpmk.Threshold == 0 {
		cpmk.Threshold = 65
	}
	s.DB.Create(&cpmk)
	c.JSON(http.StatusOK, cpmk)
}

func (s *Server) UpdateCPMK(c *gin.Context) {
	var cpmk models.CPMK
	if err := s.DB.First(&cpmk, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "cpmk tidak ditemukan")
		return
	}
	var body models.CPMK
	_ = c.ShouldBindJSON(&body)
	cpmk.Code = body.Code
	cpmk.Description = body.Description
	if body.Threshold > 0 {
		cpmk.Threshold = body.Threshold
	}
	s.DB.Save(&cpmk)
	c.JSON(http.StatusOK, cpmk)
}

func (s *Server) DeleteCPMK(c *gin.Context) {
	id := c.Param("id")
	s.DB.Where("cpmk_id = ?", id).Delete(&models.CPMKCPL{})
	s.DB.Where("cpmk_id = ?", id).Delete(&models.SubCPMK{})
	s.DB.Delete(&models.CPMK{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (s *Server) LinkCPMKtoCPL(c *gin.Context) {
	var link models.CPMKCPL
	if !bind(c, &link) {
		return
	}
	link.CPMKID = c.Param("id")
	s.DB.Create(&link)
	s.DB.Preload("CPL").First(&link, "id = ?", link.ID)
	c.JSON(http.StatusOK, link)
}

func (s *Server) UnlinkCPMKCPL(c *gin.Context) {
	s.DB.Delete(&models.CPMKCPL{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Sub-CPMK ----------

func (s *Server) CreateSubCPMK(c *gin.Context) {
	var sub models.SubCPMK
	if !bind(c, &sub) {
		return
	}
	s.DB.Create(&sub)
	c.JSON(http.StatusOK, sub)
}

func (s *Server) UpdateSubCPMK(c *gin.Context) {
	var sub models.SubCPMK
	if err := s.DB.First(&sub, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "sub-cpmk tidak ditemukan")
		return
	}
	var body models.SubCPMK
	_ = c.ShouldBindJSON(&body)
	sub.Code = body.Code
	sub.Description = body.Description
	sub.Week = body.Week
	s.DB.Save(&sub)
	c.JSON(http.StatusOK, sub)
}

func (s *Server) DeleteSubCPMK(c *gin.Context) {
	s.DB.Delete(&models.SubCPMK{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Enrollment ----------

func (s *Server) ListStudents(c *gin.Context) {
	var enrolls []models.Enrollment
	s.DB.Where("course_id = ?", c.Param("id")).Preload("Student").Find(&enrolls)
	c.JSON(http.StatusOK, enrolls)
}

type enrollReq struct {
	StudentID string `json:"student_id"`
}

func (s *Server) EnrollStudent(c *gin.Context) {
	var req enrollReq
	if !bind(c, &req) {
		return
	}
	courseID := c.Param("id")
	var count int64
	s.DB.Model(&models.Enrollment{}).Where("course_id = ? AND student_id = ?", courseID, req.StudentID).Count(&count)
	if count > 0 {
		fail(c, http.StatusBadRequest, "mahasiswa sudah terdaftar di kelas ini")
		return
	}
	e := models.Enrollment{CourseID: courseID, StudentID: req.StudentID}
	s.DB.Create(&e)
	s.DB.Preload("Student").First(&e, "id = ?", e.ID)
	c.JSON(http.StatusOK, e)
}

func (s *Server) Unenroll(c *gin.Context) {
	s.DB.Delete(&models.Enrollment{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- RPS ----------

func (s *Server) GetRPS(c *gin.Context) {
	var rps models.RPS
	if err := s.DB.First(&rps, "course_id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"course_id": c.Param("id"), "data": ""})
		return
	}
	c.JSON(http.StatusOK, rps)
}

type rpsReq struct {
	Data string `json:"data"`
}

func (s *Server) SaveRPS(c *gin.Context) {
	var req rpsReq
	if !bind(c, &req) {
		return
	}
	courseID := c.Param("id")
	var rps models.RPS
	if err := s.DB.First(&rps, "course_id = ?", courseID).Error; err != nil {
		rps = models.RPS{CourseID: courseID, Data: req.Data}
		s.DB.Create(&rps)
	} else {
		rps.Data = req.Data
		s.DB.Save(&rps)
	}
	c.JSON(http.StatusOK, rps)
}
