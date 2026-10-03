package mysqlstore

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func newMockStore(t *testing.T) (*Store, sqlmock.Sqlmock, func()) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}

	return New(db), mock, func() { _ = db.Close() }
}

func TestAccountByKey(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	now := time.Date(2026, 10, 3, 1, 2, 3, 0, time.UTC)

	mock.ExpectQuery("SELECT account_id, account_key").
		WithArgs([]byte("tester")).
		WillReturnRows(sqlmock.NewRows([]string{
			"account_id", "account_key", "password_hash", "status", "version", "created_at", "updated_at",
		}).AddRow(uint64(7), []byte("tester"), []byte("hash"), uint8(1), uint64(2), now, now))

	got, err := s.AccountByKey(context.Background(), []byte("tester"))
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != 7 || string(got.Key) != "tester" || got.Status != 1 {
		t.Fatalf("unexpected account: %+v", got)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestAccountByKeyNotFound(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	mock.ExpectQuery("FROM accounts").
		WithArgs([]byte("missing")).
		WillReturnError(sql.ErrNoRows)

	_, err := s.AccountByKey(context.Background(), []byte("missing"))
	if err != ErrNotFound {
		t.Fatalf("got %v want ErrNotFound", err)
	}
}

func TestRolesByAccount(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	now := time.Date(2026, 10, 3, 1, 2, 3, 0, time.UTC)

	mock.ExpectQuery("FROM roles").
		WithArgs(uint64(7)).
		WillReturnRows(sqlmock.NewRows([]string{
			"role_id", "account_id", "slot", "name", "delete_requested_at", "version", "created_at", "updated_at",
		}).
			AddRow(uint64(11), uint64(7), uint16(0), "Soyeon", nil, uint64(3), now, now).
			AddRow(uint64(12), uint64(7), uint16(1), "Alt", nil, uint64(1), now, now))

	roles, err := s.RolesByAccount(context.Background(), 7)
	if err != nil {
		t.Fatal(err)
	}
	if len(roles) != 2 {
		t.Fatalf("roles=%d want=2", len(roles))
	}
	if roles[0].Name != "Soyeon" || roles[1].Slot != 1 {
		t.Fatalf("unexpected roles: %+v", roles)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestLocationByRole(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	now := time.Date(2026, 10, 3, 1, 2, 3, 0, time.UTC)

	mock.ExpectQuery("FROM role_locations").
		WithArgs(uint64(11)).
		WillReturnRows(sqlmock.NewRows([]string{
			"role_id", "scene_config", "scene_resource", "pos_x", "pos_y", "pos_z", "orient", "version", "updated_at",
		}).AddRow(
			uint64(11), "scene_01", "scene_01", float32(1.5), float32(2.5), float32(3.5), float32(90), uint64(4), now,
		))

	loc, err := s.LocationByRole(context.Background(), 11)
	if err != nil {
		t.Fatal(err)
	}
	if loc.RoleID != 11 || loc.SceneResource != "scene_01" || loc.X != 1.5 {
		t.Fatalf("unexpected location: %+v", loc)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
