package api

import (
	"math"
	"net/http"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
)

type cpmkResult struct {
	CPMKID      string  `json:"cpmk_id"`
	Code        string  `json:"code"`
	Description string  `json:"description"`
	Threshold   float64 `json:"threshold"`
	Score       float64 `json:"score"`
	Achieved    bool    `json:"achieved"`
}

type cplResult struct {
	CPLID string  `json:"cpl_id"`
	Code  string  `json:"code"`
	Score float64 `json:"score"`
}

type studentResult struct {
	StudentID  string       `json:"student_id"`
	Name       string       `json:"name"`
	NIM        string       `json:"nim"`
	CPMK       []cpmkResult `json:"cpmk"`
	CPL        []cplResult  `json:"cpl"`
	FinalScore float64      `json:"final_score"`
	AtRisk     bool         `json:"at_risk"`
}

type attainmentData struct {
	CPMKMeta   []cpmkResult    `json:"cpmk_meta"`
	Students   []studentResult `json:"students"`
	ClassCPMK  []cpmkResult    `json:"class_cpmk"`
	ClassCPL   []cplResult     `json:"class_cpl"`
	ClassFinal float64         `json:"class_final"`
}

// compute the full attainment picture for a course.
func (s *Server) compute(courseID string) attainmentData {
	var cpmks []models.CPMK
	s.DB.Where("course_id = ?", courseID).Preload("CPLLinks.CPL").Order("code asc").Find(&cpmks)

	var assessments []models.Assessment
	s.DB.Where("course_id = ?", courseID).Preload("CPMKLinks").Find(&assessments)

	var enrolls []models.Enrollment
	s.DB.Where("course_id = ?", courseID).Preload("Student").Find(&enrolls)

	assIDs := make([]string, 0)
	assMax := map[string]float64{}
	for _, a := range assessments {
		assIDs = append(assIDs, a.ID)
		assMax[a.ID] = a.MaxScore
	}
	var grades []models.Grade
	if len(assIDs) > 0 {
		s.DB.Where("assessment_id IN ?", assIDs).Find(&grades)
	}
	// student -> assessment -> percent
	pct := map[string]map[string]float64{}
	for _, g := range grades {
		mx := assMax[g.AssessmentID]
		if mx <= 0 {
			mx = 100
		}
		if pct[g.StudentID] == nil {
			pct[g.StudentID] = map[string]float64{}
		}
		pct[g.StudentID][g.AssessmentID] = g.Score / mx * 100
	}

	data := attainmentData{}
	for _, cm := range cpmks {
		data.CPMKMeta = append(data.CPMKMeta, cpmkResult{CPMKID: cm.ID, Code: cm.Code, Description: cm.Description, Threshold: cm.Threshold})
	}

	// accumulators for class averages
	classCPMKsum := map[string]float64{}
	classCPLsum := map[string]float64{}
	classCPLcode := map[string]string{}
	var classFinalSum float64
	nStudents := 0

	for _, e := range enrolls {
		if e.Student == nil {
			continue
		}
		nStudents++
		sr := studentResult{StudentID: e.Student.ID, Name: e.Student.Name, NIM: e.Student.NIM}
		cpmkScore := map[string]float64{}

		for _, cm := range cpmks {
			var num, den float64
			for _, a := range assessments {
				for _, link := range a.CPMKLinks {
					if link.CPMKID == cm.ID {
						sp := pct[e.Student.ID][a.ID] // 0 if missing
						num += sp * link.Weight
						den += link.Weight
					}
				}
			}
			score := 0.0
			if den > 0 {
				score = num / den
			}
			cpmkScore[cm.ID] = score
			achieved := score >= cm.Threshold
			if !achieved {
				sr.AtRisk = true
			}
			sr.CPMK = append(sr.CPMK, cpmkResult{CPMKID: cm.ID, Code: cm.Code, Description: cm.Description, Threshold: cm.Threshold, Score: round2(score), Achieved: achieved})
			classCPMKsum[cm.ID] += score
		}

		// CPL aggregation
		cplNum := map[string]float64{}
		cplDen := map[string]float64{}
		for _, cm := range cpmks {
			for _, link := range cm.CPLLinks {
				w := link.Weight
				if w == 0 {
					w = 1
				}
				cplNum[link.CPLID] += cpmkScore[cm.ID] * w
				cplDen[link.CPLID] += w
				if link.CPL != nil {
					classCPLcode[link.CPLID] = link.CPL.Code
				}
			}
		}
		for cplID, den := range cplDen {
			score := 0.0
			if den > 0 {
				score = cplNum[cplID] / den
			}
			sr.CPL = append(sr.CPL, cplResult{CPLID: cplID, Code: classCPLcode[cplID], Score: round2(score)})
			classCPLsum[cplID] += score
		}

		// final course grade
		var fnum, fden float64
		for _, a := range assessments {
			w := a.Weight
			if w == 0 {
				continue
			}
			fnum += pct[e.Student.ID][a.ID] * w
			fden += w
		}
		if fden > 0 {
			sr.FinalScore = round2(fnum / fden)
		}
		classFinalSum += sr.FinalScore
		data.Students = append(data.Students, sr)
	}

	if nStudents > 0 {
		for _, cm := range cpmks {
			avg := round2(classCPMKsum[cm.ID] / float64(nStudents))
			data.ClassCPMK = append(data.ClassCPMK, cpmkResult{CPMKID: cm.ID, Code: cm.Code, Description: cm.Description, Threshold: cm.Threshold, Score: avg, Achieved: avg >= cm.Threshold})
		}
		for cplID, sum := range classCPLsum {
			data.ClassCPL = append(data.ClassCPL, cplResult{CPLID: cplID, Code: classCPLcode[cplID], Score: round2(sum / float64(nStudents))})
		}
		data.ClassFinal = round2(classFinalSum / float64(nStudents))
	}
	return data
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func (s *Server) CourseAttainment(c *gin.Context) {
	c.JSON(http.StatusOK, s.compute(c.Param("id")))
}

// StudentPortfolio: attainment for a single student within a course.
func (s *Server) StudentPortfolio(c *gin.Context) {
	courseID := c.Query("course_id")
	studentID := c.Param("id")
	if studentID == "me" {
		studentID = currentUserID(c)
	}
	// A student may only view their own portfolio.
	if currentRole(c) == "mahasiswa" && studentID != currentUserID(c) {
		fail(c, http.StatusForbidden, "Anda hanya dapat melihat portofolio sendiri")
		return
	}
	data := s.compute(courseID)
	for _, st := range data.Students {
		if st.StudentID == studentID {
			c.JSON(http.StatusOK, gin.H{"student": st, "class_cpmk": data.ClassCPMK, "cpmk_meta": data.CPMKMeta})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"student": nil, "class_cpmk": data.ClassCPMK, "cpmk_meta": data.CPMKMeta})
}

// EarlyWarning: students below CPMK threshold.
func (s *Server) EarlyWarning(c *gin.Context) {
	data := s.compute(c.Param("id"))
	warnings := []gin.H{}
	for _, st := range data.Students {
		var failing []cpmkResult
		for _, cm := range st.CPMK {
			if !cm.Achieved {
				failing = append(failing, cm)
			}
		}
		if len(failing) > 0 {
			warnings = append(warnings, gin.H{
				"student_id":   st.StudentID,
				"name":         st.Name,
				"nim":          st.NIM,
				"final_score":  st.FinalScore,
				"failing_cpmk": failing,
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"warnings": warnings, "total_at_risk": len(warnings)})
}

// Dashboard stats depending on the role.
func (s *Server) Dashboard(c *gin.Context) {
	role := currentRole(c)
	uid := currentUserID(c)
	out := gin.H{"role": role}

	switch role {
	case "admin":
		var users, courses, cpl int64
		s.DB.Model(&models.User{}).Count(&users)
		s.DB.Model(&models.Course{}).Count(&courses)
		s.DB.Model(&models.CPL{}).Count(&cpl)
		var dosen, mhs int64
		s.DB.Model(&models.User{}).Where("role = ?", "dosen").Count(&dosen)
		s.DB.Model(&models.User{}).Where("role = ?", "mahasiswa").Count(&mhs)
		out["total_users"] = users
		out["total_courses"] = courses
		out["total_cpl"] = cpl
		out["total_dosen"] = dosen
		out["total_mahasiswa"] = mhs
	case "dosen":
		var courses []models.Course
		s.DB.Where("lecturer_id = ?", uid).Find(&courses)
		out["total_courses"] = len(courses)
		totalStudents := 0
		atRisk := 0
		courseSummaries := []gin.H{}
		for _, cr := range courses {
			var cnt int64
			s.DB.Model(&models.Enrollment{}).Where("course_id = ?", cr.ID).Count(&cnt)
			totalStudents += int(cnt)
			d := s.compute(cr.ID)
			risk := 0
			for _, st := range d.Students {
				if st.AtRisk {
					risk++
				}
			}
			atRisk += risk
			courseSummaries = append(courseSummaries, gin.H{
				"id": cr.ID, "code": cr.Code, "name": cr.Name,
				"students": cnt, "class_final": d.ClassFinal, "at_risk": risk,
			})
		}
		out["total_students"] = totalStudents
		out["at_risk"] = atRisk
		out["courses"] = courseSummaries
	case "mahasiswa":
		var ids []string
		s.DB.Model(&models.Enrollment{}).Where("student_id = ?", uid).Pluck("course_id", &ids)
		out["total_courses"] = len(ids)
		courseSummaries := []gin.H{}
		riskCount := 0
		for _, id := range ids {
			var cr models.Course
			s.DB.First(&cr, "id = ?", id)
			d := s.compute(id)
			for _, st := range d.Students {
				if st.StudentID == uid {
					if st.AtRisk {
						riskCount++
					}
					courseSummaries = append(courseSummaries, gin.H{
						"id": cr.ID, "code": cr.Code, "name": cr.Name,
						"final_score": st.FinalScore, "at_risk": st.AtRisk,
					})
				}
			}
		}
		out["at_risk_courses"] = riskCount
		out["courses"] = courseSummaries
	}
	c.JSON(http.StatusOK, out)
}
