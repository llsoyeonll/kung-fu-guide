package mysqlstore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	_ "github.com/go-sql-driver/mysql"

	"github.com/local/9yin-go-server/internal/store"
)

var ErrNotFound = errors.New("store: not found")

type Store struct {
	db *sql.DB
}

func Open(dsn string) (*Store, error) {
	if dsn == "" {
		return nil, errors.New("mysql dsn is empty")
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	return &Store{db: db}, nil
}

func New(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) DB() *sql.DB {
	return s.db
}

func (s *Store) Ping(ctx context.Context) error {
	if s == nil || s.db == nil {
		return errors.New("mysql store is not initialized")
	}
	if err := s.db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping mysql: %w", err)
	}
	return nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) AccountByKey(ctx context.Context, key []byte) (store.Account, error) {
	const q = "SELECT account_id, account_key, password_hash, status, version, created_at, updated_at FROM accounts WHERE account_key = ? LIMIT 1"

	var out store.Account
	var passwordHash []byte

	err := s.db.QueryRowContext(ctx, q, key).Scan(
		&out.ID,
		&out.Key,
		&passwordHash,
		&out.Status,
		&out.Version,
		&out.CreatedAt,
		&out.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return store.Account{}, ErrNotFound
	}
	if err != nil {
		return store.Account{}, fmt.Errorf("load account by key: %w", err)
	}

	out.PasswordHash = passwordHash
	return out, nil
}

func (s *Store) RolesByAccount(ctx context.Context, accountID uint64) ([]store.Role, error) {
	const q = "SELECT role_id, account_id, slot, name, delete_requested_at, version, created_at, updated_at FROM roles WHERE account_id = ? ORDER BY slot, role_id"

	rows, err := s.db.QueryContext(ctx, q, accountID)
	if err != nil {
		return nil, fmt.Errorf("load roles by account: %w", err)
	}
	defer rows.Close()

	var out []store.Role
	for rows.Next() {
		var role store.Role
		if err := rows.Scan(
			&role.ID,
			&role.AccountID,
			&role.Slot,
			&role.Name,
			&role.DeleteRequestedAt,
			&role.Version,
			&role.CreatedAt,
			&role.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		out = append(out, role)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}

	return out, nil
}

func (s *Store) LocationByRole(ctx context.Context, roleID uint64) (store.Location, error) {
	const q = "SELECT role_id, scene_config, scene_resource, pos_x, pos_y, pos_z, orient, version, updated_at FROM role_locations WHERE role_id = ? LIMIT 1"

	var out store.Location
	err := s.db.QueryRowContext(ctx, q, roleID).Scan(
		&out.RoleID,
		&out.SceneConfig,
		&out.SceneResource,
		&out.X,
		&out.Y,
		&out.Z,
		&out.Orient,
		&out.Version,
		&out.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return store.Location{}, ErrNotFound
	}
	if err != nil {
		return store.Location{}, fmt.Errorf("load role location: %w", err)
	}

	return out, nil
}
