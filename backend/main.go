package main

import (
	"log"

	"obelms/internal/api"
	"obelms/internal/config"
)

func main() {
	cfg := config.Load()
	db := api.ConnectDB(cfg)
	server := api.NewServer(db, cfg)
	server.Seed()

	r := server.Router()
	addr := "0.0.0.0:" + cfg.Port
	log.Printf("OBE-LMS backend listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
