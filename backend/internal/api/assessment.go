package api

import (
	"net/http"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
)

// ---------- Assessments ----------

func (s *Server) ListAssessments(c *gin.Context) {
	var items []models.Assessment
	s.DB.Where("course_id = ?", c.Param("id")).
		Preload("CPMKLinks").
		Order("week asc, created_at asc").Find(&items)
	c.JSON(http.StatusOK, items)
}

func (s *Server) CreateAssessment(c *gin.Context) {
	var a models.Assessment
	if !bind(c, &a) {
		return
	}
	if a.MaxScore == 0 {
		a.MaxScore = 100
	}
	s.DB.Create(&a)
	c.JSON(http.StatusOK, a)
}

func (s *Server) UpdateAssessment(c *gin.Context) {
	var a models.Assessment
	if err := s.DB.First(&a, "id = ?", c.Param("id")).Error; err != nil {
		fail(c, http.StatusNotFound, "asesmen tidak ditemukan")
		return
	}
	var body models.Assessment
	_ = c.ShouldBindJSON(&body)
	a.Type = body.Type
	a.Title = body.Title
	a.Weight = body.Weight
	if body.MaxScore > 0 {
		a.MaxScore = body.MaxScore
	}
	a.Week = body.Week
	s.DB.Save(&a)
	c.JSON(http.StatusOK, a)
}

func (s *Server) DeleteAssessment(c *gin.Context) {
	id := c.Param("id")
	s.DB.Where("assessment_id = ?", id).Delete(&models.AssessmentCPMK{})
	s.DB.Where("assessment_id = ?", id).Delete(&models.Grade{})
	s.DB.Delete(&models.Assessment{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Tag an assessment to a CPMK / Sub-CPMK with a weight
func (s *Server) TagAssessment(c *gin.Context) {
	var link models.AssessmentCPMK
	if !bind(c, &link) {
		return
	}
	link.AssessmentID = c.Param("id")
	if link.Weight == 0 {
		link.Weight = 1
	}
	s.DB.Create(&link)
	c.JSON(http.StatusOK, link)
}

func (s *Server) UntagAssessment(c *gin.Context) {
	s.DB.Delete(&models.AssessmentCPMK{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Rubrics ----------

func (s *Server) GetRubric(c *gin.Context) {
	var rubrics []models.Rubric
	s.DB.Where("assessment_id = ?", c.Param("id")).Preload("Criteria").Find(&rubrics)
	c.JSON(http.StatusOK, rubrics)
}

func (s *Server) CreateRubric(c *gin.Context) {
	var r models.Rubric
	if !bind(c, &r) {
		return
	}
	s.DB.Create(&r)
	c.JSON(http.StatusOK, r)
}

func (s *Server) DeleteRubric(c *gin.Context) {
	id := c.Param("id")
	s.DB.Where("rubric_id = ?", id).Delete(&models.RubricCriterion{})
	s.DB.Delete(&models.Rubric{}, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (s *Server) CreateCriterion(c *gin.Context) {
	var cr models.RubricCriterion
	if !bind(c, &cr) {
		return
	}
	s.DB.Create(&cr)
	c.JSON(http.StatusOK, cr)
}

func (s *Server) DeleteCriterion(c *gin.Context) {
	s.DB.Delete(&models.RubricCriterion{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---------- Grades ----------

// GradeMatrix returns students x assessments grid for a course.
func (s *Server) GradeMatrix(c *gin.Context) {
	courseID := c.Param("id")
	var assessments []models.Assessment
	s.DB.Where("course_id = ?", courseID).Order("week asc, created_at asc").Find(&assessments)

	var enrolls []models.Enrollment
	s.DB.Where("course_id = ?", courseID).Preload("Student").Find(&enrolls)

	assIDs := make([]string, 0, len(assessments))
	for _, a := range assessments {
		assIDs = append(assIDs, a.ID)
	}
	var grades []models.Grade
	if len(assIDs) > 0 {
		s.DB.Where("assessment_id IN ?", assIDs).Find(&grades)
	}
	gmap := map[string]map[string]models.Grade{} // student -> assessment -> grade
	for _, g := range grades {
		if gmap[g.StudentID] == nil {
			gmap[g.StudentID] = map[string]models.Grade{}
		}
		gmap[g.StudentID][g.AssessmentID] = g
	}

	students := make([]gin.H, 0, len(enrolls))
	for _, e := range enrolls {
		if e.Student == nil {
			continue
		}
		scores := gin.H{}
		for _, a := range assessments {
			if g, ok := gmap[e.Student.ID][a.ID]; ok {
				scores[a.ID] = g.Score
			}
		}
		students = append(students, gin.H{
			"student_id": e.Student.ID,
			"name":       e.Student.Name,
			"nim":        e.Student.NIM,
			"scores":     scores,
		})
	}
	c.JSON(http.StatusOK, gin.H{"assessments": assessments, "students": students})
}

type gradeEntry struct {
	AssessmentID string  `json:"assessment_id"`
	StudentID    string  `json:"student_id"`
	Score        float64 `json:"score"`
}

type bulkGradeReq struct {
	Grades []gradeEntry `json:"grades"`
}

func (s *Server) SaveGrades(c *gin.Context) {
	var req bulkGradeReq
	if !bind(c, &req) {
		return
	}
	// cache assessment max scores for validation
	maxCache := map[string]float64{}
	saved := 0
	for _, e := range req.Grades {
		mx, ok := maxCache[e.AssessmentID]
		if !ok {
			var a models.Assessment
			if err := s.DB.First(&a, "id = ?", e.AssessmentID).Error; err != nil {
				continue
			}
			mx = a.MaxScore
			if mx <= 0 {
				mx = 100
			}
			maxCache[e.AssessmentID] = mx
		}
		score := e.Score
		if score < 0 {
			score = 0
		}
		if score > mx {
			score = mx
		}
		var g models.Grade
		err := s.DB.Where("assessment_id = ? AND student_id = ?", e.AssessmentID, e.StudentID).First(&g).Error
		if err != nil {
			g = models.Grade{AssessmentID: e.AssessmentID, StudentID: e.StudentID, Score: score}
			s.DB.Create(&g)
		} else {
			g.Score = score
			s.DB.Save(&g)
		}
		saved++
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "saved": saved})
}
