package mysqlstore

import (
	"context"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func schemaRows(omit string) *sqlmock.Rows {
	rows := sqlmock.NewRows([]string{"table_name", "column_name"})
	for table, columns := range requiredColumns {
		for _, column := range columns {
			if table+"."+column == omit {
				continue
			}
			rows.AddRow(table, column)
		}
	}
	return rows
}

func TestCheckCoreSchema(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	mock.ExpectQuery("information_schema.columns").
		WillReturnRows(schemaRows(""))

	if err := s.CheckCoreSchema(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestCheckCoreSchemaReportsMissingColumn(t *testing.T) {
	s, mock, done := newMockStore(t)
	defer done()

	mock.ExpectQuery("information_schema.columns").
		WillReturnRows(schemaRows("role_locations.orient"))

	err := s.CheckCoreSchema(context.Background())
	if err == nil {
		t.Fatal("expected incompatible schema error")
	}
	if !strings.Contains(err.Error(), "role_locations.orient") {
		t.Fatalf("unexpected error: %v", err)
	}
}
