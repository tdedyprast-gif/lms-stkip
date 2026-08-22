package api

import (
	"net/http"
	"strings"
	"time"

	"obelms/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func checkPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

func (s *Server) createToken(u models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":   u.ID,
		"email": u.Email,
		"role":  u.Role,
		"name":  u.Name,
		"type":  "access",
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.Cfg.JWTSecret))
}

// AuthMiddleware verifies the Bearer token and loads the user id/role.
func (s *Server) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			fail(c, http.StatusUnauthorized, "Not authenticated")
			c.Abort()
			return
		}
		tokenStr := strings.TrimPrefix(auth, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(s.Cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			fail(c, http.StatusUnauthorized, "Invalid or expired token")
			c.Abort()
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fail(c, http.StatusUnauthorized, "Invalid token")
			c.Abort()
			return
		}
		c.Set("user_id", claims["sub"])
		c.Set("role", claims["role"])
		c.Next()
	}
}

// RequireRole restricts a route to certain roles.
func (s *Server) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := currentRole(c)
		for _, r := range roles {
			if r == role {
				c.Next()
				return
			}
		}
		fail(c, http.StatusForbidden, "Access denied for role: "+role)
		c.Abort()
	}
}

type registerReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role"`
	NIM      string `json:"nim"`
	NIDN     string `json:"nidn"`
	Prodi    string `json:"prodi"`
}

func (s *Server) Register(c *gin.Context) {
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
	// Public registration always creates a student account.
	// Dosen/Admin accounts are provisioned by an administrator via /api/users.
	role := "mahasiswa"
	hash, err := hashPassword(req.Password)
	if err != nil {
		fail(c, http.StatusInternalServerError, "gagal hash password")
		return
	}
	u := models.User{
		Name: req.Name, Email: email, PasswordHash: hash, Role: role,
		NIM: req.NIM, NIDN: req.NIDN, Prodi: req.Prodi,
	}
	if err := s.DB.Create(&u).Error; err != nil {
		fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	tok, _ := s.createToken(u)
	c.JSON(http.StatusOK, gin.H{"token": tok, "user": u})
}

type loginReq struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (s *Server) Login(c *gin.Context) {
	var req loginReq
	if !bind(c, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	var u models.User
	if err := s.DB.Where("email = ?", email).First(&u).Error; err != nil {
		fail(c, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	if !checkPassword(u.PasswordHash, req.Password) {
		fail(c, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	tok, _ := s.createToken(u)
	c.JSON(http.StatusOK, gin.H{"token": tok, "user": u})
}

func (s *Server) Me(c *gin.Context) {
	var u models.User
	if err := s.DB.First(&u, "id = ?", currentUserID(c)).Error; err != nil {
		fail(c, http.StatusNotFound, "User tidak ditemukan")
		return
	}
	c.JSON(http.StatusOK, u)
}
