package api

import (
	"fmt"
	"net/http"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// typeAverages computes per-student per-type percentage scores for a course.
func (s *Server) typeAverages(courseID string) (map[string]map[string]float64, []models.Enrollment) {
	var assessments []models.Assessment
	s.DB.Where("course_id = ?", courseID).Find(&assessments)
	var enrolls []models.Enrollment
	s.DB.Where("course_id = ?", courseID).Preload("Student").Find(&enrolls)

	assIDs := []string{}
	for _, a := range assessments {
		assIDs = append(assIDs, a.ID)
	}
	var grades []models.Grade
	if len(assIDs) > 0 {
		s.DB.Where("assessment_id IN ?", assIDs).Find(&grades)
	}
	gmap := map[string]map[string]float64{}
	for _, g := range grades {
		if gmap[g.StudentID] == nil {
			gmap[g.StudentID] = map[string]float64{}
		}
		gmap[g.StudentID][g.AssessmentID] = g.Score
	}

	result := map[string]map[string]float64{}
	for _, e := range enrolls {
		if e.Student == nil {
			continue
		}
		byType := map[string]float64{}
		numByType := map[string]float64{}
		denByType := map[string]float64{}
		for _, a := range assessments {
			mx := a.MaxScore
			if mx <= 0 {
				mx = 100
			}
			w := a.Weight
			if w == 0 {
				w = 1
			}
			sp := gmap[e.Student.ID][a.ID] / mx * 100
			numByType[a.Type] += sp * w
			denByType[a.Type] += w
		}
		for t, den := range denByType {
			if den > 0 {
				byType[t] = round2(numByType[t] / den)
			}
		}
		result[e.Student.ID] = byType
	}
	return result, enrolls
}

// ExportSIAKAD exports grades in the STKIP PGRI Pacitan SIAKAD column format.
func (s *Server) ExportSIAKAD(c *gin.Context) {
	courseID := c.Param("id")
	var course models.Course
	s.DB.First(&course, "id = ?", courseID)

	averages, enrolls := s.typeAverages(courseID)

	f := excelize.NewFile()
	sheet := "Nilai"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"NIM", "AKTIVITAS", "HASIL_PROYEK", "QUIZ", "TUGAS", "UTS", "UAS"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	// map assessment type -> column
	col := map[string]string{
		"keaktifan": "AKTIVITAS",
		"project":   "HASIL_PROYEK",
		"quiz":      "QUIZ",
		"tugas":     "TUGAS",
		"uts":       "UTS",
		"uas":       "UAS",
	}
	row := 2
	for _, e := range enrolls {
		if e.Student == nil {
			continue
		}
		vals := averages[e.Student.ID]
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), e.Student.NIM)
		colVals := map[string]float64{"AKTIVITAS": 0, "HASIL_PROYEK": 0, "QUIZ": 0, "TUGAS": 0, "UTS": 0, "UAS": 0}
		for t, v := range vals {
			if name, ok := col[t]; ok {
				colVals[name] = v
			}
		}
		order := []string{"AKTIVITAS", "HASIL_PROYEK", "QUIZ", "TUGAS", "UTS", "UAS"}
		for i, name := range order {
			cell, _ := excelize.CoordinatesToCellName(i+2, row)
			f.SetCellValue(sheet, cell, int(colVals[name]+0.5))
		}
		row++
	}
	style, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	f.SetCellStyle(sheet, "A1", "G1", style)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=SIAKAD_%s.xlsx", safeName(course.Code)))
	_ = f.Write(c.Writer)
}

// ExportOBE exports CPL/CPMK attainment for accreditation audit (LAM/BAN-PT).
func (s *Server) ExportOBE(c *gin.Context) {
	courseID := c.Param("id")
	var course models.Course
	s.DB.First(&course, "id = ?", courseID)
	data := s.compute(courseID)

	f := excelize.NewFile()

	// Sheet 1: CPMK per student
	sheet := "Ketercapaian CPMK"
	f.SetSheetName("Sheet1", sheet)
	f.SetCellValue(sheet, "A1", "Laporan Ketercapaian CPMK - "+course.Code+" "+course.Name)
	headers := []string{"NIM", "Nama"}
	for _, cm := range data.CPMKMeta {
		headers = append(headers, cm.Code)
	}
	headers = append(headers, "Nilai Akhir", "Status")
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheet, cell, h)
	}
	row := 4
	for _, st := range data.Students {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), st.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), st.Name)
		for i, cm := range st.CPMK {
			cell, _ := excelize.CoordinatesToCellName(i+3, row)
			f.SetCellValue(sheet, cell, cm.Score)
		}
		finalCol, _ := excelize.CoordinatesToCellName(len(data.CPMKMeta)+3, row)
		f.SetCellValue(sheet, finalCol, st.FinalScore)
		statusCol, _ := excelize.CoordinatesToCellName(len(data.CPMKMeta)+4, row)
		status := "TUNTAS"
		if st.AtRisk {
			status = "PERLU REMIDIASI"
		}
		f.SetCellValue(sheet, statusCol, status)
		row++
	}

	// Sheet 2: Rata-rata kelas per CPMK
	sheet2 := "Rekap Kelas"
	f.NewSheet(sheet2)
	f.SetCellValue(sheet2, "A1", "Kode CPMK")
	f.SetCellValue(sheet2, "B1", "Deskripsi")
	f.SetCellValue(sheet2, "C1", "Rata-rata Kelas")
	f.SetCellValue(sheet2, "D1", "Ambang Batas")
	f.SetCellValue(sheet2, "E1", "Status")
	r := 2
	for _, cm := range data.ClassCPMK {
		f.SetCellValue(sheet2, fmt.Sprintf("A%d", r), cm.Code)
		f.SetCellValue(sheet2, fmt.Sprintf("B%d", r), cm.Description)
		f.SetCellValue(sheet2, fmt.Sprintf("C%d", r), cm.Score)
		f.SetCellValue(sheet2, fmt.Sprintf("D%d", r), cm.Threshold)
		status := "TERCAPAI"
		if !cm.Achieved {
			status = "BELUM TERCAPAI"
		}
		f.SetCellValue(sheet2, fmt.Sprintf("E%d", r), status)
		r++
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=OBE_Audit_%s.xlsx", safeName(course.Code)))
	_ = f.Write(c.Writer)
}

func safeName(s string) string {
	out := ""
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			out += string(r)
		} else {
			out += "_"
		}
	}
	if out == "" {
		out = "export"
	}
	return out
}

var _ = http.StatusOK
