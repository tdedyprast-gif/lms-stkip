package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ---------- Meetings (16 pertemuan) ----------

func (s *Server) ListMeetings(c *gin.Context) {
	var meetings []models.Meeting
	s.DB.Where("course_id = ?", c.Param("id")).Preload("Materials").Order("week asc").Find(&meetings)
	c.JSON(http.StatusOK, meetings)
}

func (s *Server) CreateMeeting(c *gin.Context) {
	var m models.Meeting
	if !bind(c, &m) {
		return
	}
	s.DB.Create(&m)
	c.JSON(http.StatusOK, m)
}

func (s *Server) UpdateMeeting(c *gin.Context) {
	var m models.Meeting
	if err := s.DB.First(&m, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "pertemuan tidak ditemukan")
		return
	}
	var body models.Meeting
	_ = c.ShouldBindJSON(&body)
	m.Topic = body.Topic
	m.Description = body.Description
	m.Week = body.Week
	s.DB.Save(&m)
	c.JSON(http.StatusOK, m)
}

func (s *Server) DeleteMeeting(c *gin.Context) {
	id := c.Param("id")
	s.DB.Where("meeting_id = ?", id).Delete(&models.Material{})
	s.DB.Delete(&models.Meeting{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Materials ----------

func (s *Server) CreateMaterial(c *gin.Context) {
	var m models.Material
	if !bind(c, &m) {
		return
	}
	s.DB.Create(&m)
	c.JSON(http.StatusOK, m)
}

func (s *Server) DeleteMaterial(c *gin.Context) {
	s.DB.Delete(&models.Material{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (s *Server) saveUpload(c *gin.Context) (string, string, bool) {
	file, err := c.FormFile("file")
	if err != nil {
		fail(c, http.StatusBadRequest, "file tidak ditemukan")
		return "", "", false
	}
	_ = os.MkdirAll(s.Cfg.UploadDir, 0755)
	ext := filepath.Ext(file.Filename)
	stored := uuid.NewString() + ext
	dst := filepath.Join(s.Cfg.UploadDir, stored)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		fail(c, http.StatusInternalServerError, "gagal menyimpan file")
		return "", "", false
	}
	return stored, file.Filename, true
}

func (s *Server) UploadMaterial(c *gin.Context) {
	stored, orig, ok := s.saveUpload(c)
	if !ok {
		return
	}
	m := models.Material{
		MeetingID: c.PostForm("meeting_id"),
		Title:     c.DefaultPostForm("title", orig),
		Type:      "file",
		FilePath:  stored,
		FileName:  orig,
	}
	s.DB.Create(&m)
	c.JSON(http.StatusOK, m)
}

func (s *Server) DownloadFile(c *gin.Context) {
	stored := c.Param("file")
	path := filepath.Join(s.Cfg.UploadDir, filepath.Base(stored))
	if _, err := os.Stat(path); err != nil {
		fail(c, http.StatusNotFound, "file tidak ditemukan")
		return
	}
	c.File(path)
}

// ---------- Submissions ----------

func (s *Server) UploadSubmission(c *gin.Context) {
	stored, orig, ok := s.saveUpload(c)
	if !ok {
		return
	}
	assessmentID := c.PostForm("assessment_id")
	studentID := currentUserID(c)
	var sub models.Submission
	if err := s.DB.Where("assessment_id = ? AND student_id = ?", assessmentID, studentID).First(&sub).Error; err != nil {
		sub = models.Submission{AssessmentID: assessmentID, StudentID: studentID, FilePath: stored, FileName: orig, Note: c.PostForm("note")}
		s.DB.Create(&sub)
	} else {
		sub.FilePath = stored
		sub.FileName = orig
		sub.Note = c.PostForm("note")
		s.DB.Save(&sub)
	}
	c.JSON(http.StatusOK, sub)
}

func (s *Server) ListSubmissions(c *gin.Context) {
	var subs []models.Submission
	s.DB.Where("assessment_id = ?", c.Param("id")).Preload("Student").Order("created_at desc").Find(&subs)
	c.JSON(http.StatusOK, subs)
}

// ---------- Discussions ----------

func (s *Server) ListDiscussions(c *gin.Context) {
	var items []models.Discussion
	q := s.DB.Where("course_id = ?", c.Param("id"))
	if mid := c.Query("meeting_id"); mid != "" {
		q = q.Where("meeting_id = ?", mid)
	}
	q.Preload("User").Order("created_at asc").Find(&items)
	c.JSON(http.StatusOK, items)
}

func (s *Server) CreateDiscussion(c *gin.Context) {
	var d models.Discussion
	if !bind(c, &d) {
		return
	}
	d.UserID = currentUserID(c)
	s.DB.Create(&d)
	s.DB.Preload("User").First(&d, "id = ?", d.ID)
	c.JSON(http.StatusOK, d)
}

func (s *Server) DeleteDiscussion(c *gin.Context) {
	s.DB.Delete(&models.Discussion{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Remediation / CQI ----------

func (s *Server) ListRemediation(c *gin.Context) {
	var items []models.Remediation
	q := s.DB.Where("course_id = ?", c.Param("id"))
	if currentRole(c) == "mahasiswa" {
		q = q.Where("student_id = ?", currentUserID(c))
	}
	q.Preload("Student").Order("created_at desc").Find(&items)
	c.JSON(http.StatusOK, items)
}

func (s *Server) CreateRemediation(c *gin.Context) {
	var r models.Remediation
	if !bind(c, &r) {
		return
	}
	if r.Status == "" {
		r.Status = "pending"
	}
	s.DB.Create(&r)
	s.DB.Preload("Student").First(&r, "id = ?", r.ID)
	c.JSON(http.StatusOK, r)
}

func (s *Server) UpdateRemediation(c *gin.Context) {
	var r models.Remediation
	if err := s.DB.First(&r, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "remidiasi tidak ditemukan")
		return
	}
	var body models.Remediation
	_ = c.ShouldBindJSON(&body)
	if body.Status != "" {
		r.Status = body.Status
	}
	r.Note = body.Note
	r.Score = body.Score
	s.DB.Save(&r)
	c.JSON(http.StatusOK, r)
}

func (s *Server) DeleteRemediation(c *gin.Context) {
	s.DB.Delete(&models.Remediation{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

var _ = fmt.Sprintf
var _ = time.Now
