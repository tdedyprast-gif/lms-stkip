package api

import (
	"log"

	"obelms/internal/config"
	"obelms/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectDB(cfg config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{},
		&models.CPL{},
		&models.Course{},
		&models.CPMK{},
		&models.CPMKCPL{},
		&models.SubCPMK{},
		&models.Enrollment{},
		&models.Assessment{},
		&models.AssessmentCPMK{},
		&models.Rubric{},
		&models.RubricCriterion{},
		&models.Grade{},
		&models.Meeting{},
		&models.Material{},
		&models.Submission{},
		&models.Discussion{},
		&models.Remediation{},
		&models.RPS{},
	); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}
	return db
}
