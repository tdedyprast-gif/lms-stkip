package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	JWTSecret     string
	AdminEmail    string
	AdminPassword string
	Port          string
	Service       string
	UploadDir     string
	CorsOrigins   string
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func Load() Config {
	// Load .env if present (ignore error in production/container)
	_ = godotenv.Load("/app/backend/.env")
	_ = godotenv.Load(".env")

	return Config{
		DatabaseURL:   env("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=obelms port=5432 sslmode=disable TimeZone=Asia/Jakarta"),
		JWTSecret:     env("JWT_SECRET", "change-me-in-production"),
		AdminEmail:    env("ADMIN_EMAIL", "admin@stkippacitan.ac.id"),
		AdminPassword: env("ADMIN_PASSWORD", "admin123"),
		Port:          env("PORT", "9000"),
		Service:       env("SERVICE", "all"),
		UploadDir:     env("UPLOAD_DIR", "/app/backend/uploads"),
		CorsOrigins:   env("CORS_ORIGINS", "*"),
	}
}
