package store

import (
	"database/sql"
	"time"
)

type Account struct {
	ID           uint64
	Key          []byte
	PasswordHash []byte
	Status       uint8
	Version      uint64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Role struct {
	ID                uint64
	AccountID         uint64
	Slot              uint16
	Name              string
	DeleteRequestedAt sql.NullTime
	Version           uint64
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type Location struct {
	RoleID        uint64
	SceneConfig   string
	SceneResource string
	X             float32
	Y             float32
	Z             float32
	Orient        float32
	Version       uint64
	UpdatedAt     time.Time
}
