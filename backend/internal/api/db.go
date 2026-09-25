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
		&models.Prodi{},
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

	// Seed 8 program studi if empty
	var count int64
	db.Model(&models.Prodi{}).Count(&count)
	if count == 0 {
		prodiList := []models.Prodi{
			{Code: "PSEJ", Name: "Program Studi Pendidikan Sejarah"},
			{Code: "PMAT", Name: "Program Studi Pendidikan Matematika"},
			{Code: "PBSI", Name: "Program Studi Pendidikan Bahasa dan Sastra Indonesia"},
			{Code: "PBI", Name: "Program Studi Pendidikan Bahasa Inggris"},
			{Code: "PJKR", Name: "Program Studi Pendidikan Jasmani Kesehatan dan Rekreasi"},
			{Code: "PIN", Name: "Program Studi Pendidikan Informatika"},
			{Code: "PGSD", Name: "Program Studi Pendidikan Guru Sekolah Dasar"},
			{Code: "PPG", Name: "Program Studi Pendidikan Profesi Guru"},
		}
		for i := range prodiList {
			if err := db.Create(&prodiList[i]).Error; err != nil {
				log.Printf("seed prodi %s: %v", prodiList[i].Code, err)
			}
		}
		log.Printf("seeded %d program studi", len(prodiList))
	}

	return db
}
