package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Base struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

// User: admin, dosen, mahasiswa
type User struct {
	Base
	Name         string `json:"name"`
	Email        string `gorm:"uniqueIndex" json:"email"`
	PasswordHash string `json:"-"`
	Role         string `json:"role"`
	NIM          string `json:"nim"`
	NIDN         string `json:"nidn"`
	Prodi        string `json:"prodi"`
}

// CPL - Capaian Pembelajaran Lulusan (program level)
type CPL struct {
	Base
	Code        string `json:"code"`
	Description string `json:"description"`
	Domain      string `json:"domain"`
}

type Course struct {
	Base
	Code        string `json:"code"`
	Name        string `json:"name"`
	SKS         int    `json:"sks"`
	Semester    int    `json:"semester"`
	Description string `json:"description"`
	LecturerID  string `gorm:"type:uuid" json:"lecturer_id"`
	Lecturer    *User  `gorm:"foreignKey:LecturerID" json:"lecturer,omitempty"`
}

type CPMK struct {
	Base
	CourseID    string    `gorm:"type:uuid;index" json:"course_id"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	Threshold   float64   `gorm:"default:65" json:"threshold"`
	CPLLinks    []CPMKCPL `gorm:"foreignKey:CPMKID" json:"cpl_links,omitempty"`
	SubCPMKs    []SubCPMK `gorm:"foreignKey:CPMKID" json:"sub_cpmks,omitempty"`
}

type CPMKCPL struct {
	Base
	CPMKID string  `gorm:"type:uuid;index" json:"cpmk_id"`
	CPLID  string  `gorm:"type:uuid;index" json:"cpl_id"`
	CPL    *CPL    `gorm:"foreignKey:CPLID" json:"cpl,omitempty"`
	Weight float64 `json:"weight"`
}

type SubCPMK struct {
	Base
	CPMKID      string `gorm:"type:uuid;index" json:"cpmk_id"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Week        int    `json:"week"`
}

type Enrollment struct {
	Base
	StudentID string `gorm:"type:uuid;index" json:"student_id"`
	CourseID  string `gorm:"type:uuid;index" json:"course_id"`
	Student   *User  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

// Assessment types: keaktifan, tugas, quiz, uts, uas, project
type Assessment struct {
	Base
	CourseID  string           `gorm:"type:uuid;index" json:"course_id"`
	Type      string           `json:"type"`
	Title     string           `json:"title"`
	Weight    float64          `json:"weight"`
	MaxScore  float64          `gorm:"default:100" json:"max_score"`
	Week      int              `json:"week"`
	CPMKLinks []AssessmentCPMK `gorm:"foreignKey:AssessmentID" json:"cpmk_links,omitempty"`
}

type AssessmentCPMK struct {
	Base
	AssessmentID string  `gorm:"type:uuid;index" json:"assessment_id"`
	CPMKID       string  `gorm:"type:uuid;index" json:"cpmk_id"`
	SubCPMKID    string  `gorm:"index" json:"sub_cpmk_id"`
	Weight       float64 `json:"weight"`
}

type Rubric struct {
	Base
	AssessmentID string            `gorm:"type:uuid;index" json:"assessment_id"`
	Name         string            `json:"name"`
	Criteria     []RubricCriterion `gorm:"foreignKey:RubricID" json:"criteria,omitempty"`
}

type RubricCriterion struct {
	Base
	RubricID  string  `gorm:"type:uuid;index" json:"rubric_id"`
	Name      string  `json:"name"`
	SubCPMKID string  `gorm:"index" json:"sub_cpmk_id"`
	MaxScore  float64 `json:"max_score"`
	Levels    string  `gorm:"type:text" json:"levels"`
}

type Grade struct {
	Base
	AssessmentID string  `gorm:"type:uuid;index" json:"assessment_id"`
	StudentID    string  `gorm:"type:uuid;index" json:"student_id"`
	Score        float64 `json:"score"`
	Note         string  `json:"note"`
}

type Meeting struct {
	Base
	CourseID    string     `gorm:"type:uuid;index" json:"course_id"`
	Week        int        `json:"week"`
	Topic       string     `json:"topic"`
	Description string     `gorm:"type:text" json:"description"`
	Materials   []Material `gorm:"foreignKey:MeetingID" json:"materials,omitempty"`
}

type Material struct {
	Base
	MeetingID string `gorm:"type:uuid;index" json:"meeting_id"`
	Title     string `json:"title"`
	Type      string `json:"type"`
	FilePath  string `json:"file_path"`
	FileName  string `json:"file_name"`
	URL       string `json:"url"`
	Content   string `gorm:"type:text" json:"content"`
}

type Submission struct {
	Base
	AssessmentID string  `gorm:"type:uuid;index" json:"assessment_id"`
	StudentID    string  `gorm:"type:uuid;index" json:"student_id"`
	FilePath     string  `json:"file_path"`
	FileName     string  `json:"file_name"`
	Note         string  `json:"note"`
	Score        float64 `json:"score"`
	Student      *User   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

type Discussion struct {
	Base
	CourseID  string `gorm:"type:uuid;index" json:"course_id"`
	MeetingID string `gorm:"index" json:"meeting_id"`
	UserID    string `gorm:"type:uuid" json:"user_id"`
	ParentID  string `json:"parent_id"`
	Message   string `gorm:"type:text" json:"message"`
	User      *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Remediation / CQI
type Remediation struct {
	Base
	CourseID  string  `gorm:"type:uuid;index" json:"course_id"`
	CPMKID    string  `gorm:"index" json:"cpmk_id"`
	SubCPMKID string  `json:"sub_cpmk_id"`
	StudentID string  `gorm:"type:uuid;index" json:"student_id"`
	Reason    string  `json:"reason"`
	Status    string  `gorm:"default:pending" json:"status"`
	Note      string  `json:"note"`
	Score     float64 `json:"score"`
	Student   *User   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

type RPS struct {
	Base
	CourseID string `gorm:"type:uuid;uniqueIndex" json:"course_id"`
	Data     string `gorm:"type:text" json:"data"`
}
