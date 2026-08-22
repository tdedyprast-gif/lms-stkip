package api

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) Router() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders:    []string{"Content-Disposition"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")

	api.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "OBE-LMS STKIP PGRI Pacitan API", "status": "ok"})
	})
	api.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "healthy"}) })

	// Public auth
	api.POST("/auth/register", s.Register)
	api.POST("/auth/login", s.Login)

	// Public file download
	api.GET("/files/:file", s.DownloadFile)

	// Authenticated
	auth := api.Group("")
	auth.Use(s.AuthMiddleware())
	{
		auth.GET("/auth/me", s.Me)
		auth.GET("/dashboard", s.Dashboard)

		// Users (admin manages; dosen may list students for enrollment)
		auth.GET("/users", s.RequireRole("admin", "dosen"), s.ListUsers)
		auth.POST("/users", s.RequireRole("admin"), s.CreateUser)
		auth.PUT("/users/:id", s.RequireRole("admin"), s.UpdateUser)
		auth.DELETE("/users/:id", s.RequireRole("admin"), s.DeleteUser)

		// CPL
		auth.GET("/cpl", s.ListCPL)
		auth.POST("/cpl", s.RequireRole("admin", "dosen"), s.CreateCPL)
		auth.PUT("/cpl/:id", s.RequireRole("admin", "dosen"), s.UpdateCPL)
		auth.DELETE("/cpl/:id", s.RequireRole("admin", "dosen"), s.DeleteCPL)

		// Courses
		auth.GET("/courses", s.ListCourses)
		auth.GET("/courses/:id", s.GetCourse)
		auth.POST("/courses", s.RequireRole("admin", "dosen"), s.CreateCourse)
		auth.PUT("/courses/:id", s.RequireRole("admin", "dosen"), s.UpdateCourse)
		auth.DELETE("/courses/:id", s.RequireRole("admin", "dosen"), s.DeleteCourse)

		// CPMK (nested under course)
		auth.GET("/courses/:id/cpmk", s.ListCPMK)
		auth.POST("/cpmk", s.RequireRole("admin", "dosen"), s.CreateCPMK)
		auth.PUT("/cpmk/:id", s.RequireRole("admin", "dosen"), s.UpdateCPMK)
		auth.DELETE("/cpmk/:id", s.RequireRole("admin", "dosen"), s.DeleteCPMK)
		auth.POST("/cpmk/:id/cpl", s.RequireRole("admin", "dosen"), s.LinkCPMKtoCPL)
		auth.DELETE("/cpmk-cpl/:id", s.RequireRole("admin", "dosen"), s.UnlinkCPMKCPL)

		// Sub-CPMK
		auth.POST("/subcpmk", s.RequireRole("admin", "dosen"), s.CreateSubCPMK)
		auth.PUT("/subcpmk/:id", s.RequireRole("admin", "dosen"), s.UpdateSubCPMK)
		auth.DELETE("/subcpmk/:id", s.RequireRole("admin", "dosen"), s.DeleteSubCPMK)

		// Enrollment
		auth.GET("/courses/:id/students", s.ListStudents)
		auth.POST("/courses/:id/enroll", s.RequireRole("admin", "dosen"), s.EnrollStudent)
		auth.DELETE("/enrollments/:id", s.RequireRole("admin", "dosen"), s.Unenroll)

		// RPS
		auth.GET("/courses/:id/rps", s.GetRPS)
		auth.PUT("/courses/:id/rps", s.RequireRole("admin", "dosen"), s.SaveRPS)

		// Assessments
		auth.GET("/courses/:id/assessments", s.ListAssessments)
		auth.POST("/assessments", s.RequireRole("admin", "dosen"), s.CreateAssessment)
		auth.PUT("/assessments/:id", s.RequireRole("admin", "dosen"), s.UpdateAssessment)
		auth.DELETE("/assessments/:id", s.RequireRole("admin", "dosen"), s.DeleteAssessment)
		auth.POST("/assessments/:id/tag", s.RequireRole("admin", "dosen"), s.TagAssessment)
		auth.DELETE("/assessment-cpmk/:id", s.RequireRole("admin", "dosen"), s.UntagAssessment)

		// Rubrics
		auth.GET("/assessments/:id/rubric", s.GetRubric)
		auth.POST("/rubrics", s.RequireRole("admin", "dosen"), s.CreateRubric)
		auth.DELETE("/rubrics/:id", s.RequireRole("admin", "dosen"), s.DeleteRubric)
		auth.POST("/rubric-criteria", s.RequireRole("admin", "dosen"), s.CreateCriterion)
		auth.DELETE("/rubric-criteria/:id", s.RequireRole("admin", "dosen"), s.DeleteCriterion)

		// Grades
		auth.GET("/courses/:id/grades", s.RequireRole("admin", "dosen"), s.GradeMatrix)
		auth.POST("/grades", s.RequireRole("admin", "dosen"), s.SaveGrades)

		// Analytics & Portfolio
		auth.GET("/courses/:id/attainment", s.RequireRole("admin", "dosen"), s.CourseAttainment)
		auth.GET("/courses/:id/early-warning", s.RequireRole("admin", "dosen"), s.EarlyWarning)
		auth.GET("/students/:id/portfolio", s.StudentPortfolio)
		auth.GET("/courses/:id/export/siakad", s.RequireRole("admin", "dosen"), s.ExportSIAKAD)
		auth.GET("/courses/:id/export/obe", s.RequireRole("admin", "dosen"), s.ExportOBE)

		// Meetings & Materials
		auth.GET("/courses/:id/meetings", s.ListMeetings)
		auth.POST("/meetings", s.RequireRole("admin", "dosen"), s.CreateMeeting)
		auth.PUT("/meetings/:id", s.RequireRole("admin", "dosen"), s.UpdateMeeting)
		auth.DELETE("/meetings/:id", s.RequireRole("admin", "dosen"), s.DeleteMeeting)
		auth.POST("/materials", s.RequireRole("admin", "dosen"), s.CreateMaterial)
		auth.POST("/materials/upload", s.RequireRole("admin", "dosen"), s.UploadMaterial)
		auth.DELETE("/materials/:id", s.RequireRole("admin", "dosen"), s.DeleteMaterial)

		// Submissions
		auth.POST("/submissions/upload", s.UploadSubmission)
		auth.GET("/assessments/:id/submissions", s.ListSubmissions)

		// Discussions
		auth.GET("/courses/:id/discussions", s.ListDiscussions)
		auth.POST("/discussions", s.CreateDiscussion)
		auth.DELETE("/discussions/:id", s.DeleteDiscussion)

		// Remediation / CQI
		auth.GET("/courses/:id/remediation", s.ListRemediation)
		auth.POST("/remediation", s.RequireRole("admin", "dosen"), s.CreateRemediation)
		auth.PUT("/remediation/:id", s.RequireRole("admin", "dosen"), s.UpdateRemediation)
		auth.DELETE("/remediation/:id", s.RequireRole("admin", "dosen"), s.DeleteRemediation)
	}

	return r
}
