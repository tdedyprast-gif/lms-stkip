package api

import (
	"net/http"

	"obelms/internal/config"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Server struct {
	DB  *gorm.DB
	Cfg config.Config
}

func NewServer(db *gorm.DB, cfg config.Config) *Server {
	return &Server{DB: db, Cfg: cfg}
}

func fail(c *gin.Context, code int, msg string) {
	c.JSON(code, gin.H{"detail": msg})
}

// currentUserID returns the authenticated user id set by AuthMiddleware.
func currentUserID(c *gin.Context) string {
	v, _ := c.Get("user_id")
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func currentRole(c *gin.Context) string {
	v, _ := c.Get("role")
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// bind is a helper that binds JSON and returns false on error (response already sent).
func bind(c *gin.Context, obj interface{}) bool {
	if err := c.ShouldBindJSON(obj); err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}
