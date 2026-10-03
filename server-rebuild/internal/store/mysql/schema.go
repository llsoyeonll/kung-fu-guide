package mysqlstore

import (
	"context"
	"fmt"
	"sort"
	"strings"
)

var requiredColumns = map[string][]string{
	"accounts": {"account_id", "account_key", "password_hash", "status", "version", "created_at", "updated_at"},
	"roles": {"role_id", "account_id", "slot", "name", "delete_requested_at", "version", "created_at", "updated_at"},
	"role_locations": {"role_id", "scene_config", "scene_resource", "pos_x", "pos_y", "pos_z", "orient", "version", "updated_at"},
}

func (s *Store) CheckCoreSchema(ctx context.Context) error {
	const q = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN ('accounts', 'roles', 'role_locations')"

	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return fmt.Errorf("read information_schema: %w", err)
	}
	defer rows.Close()

	found := make(map[string]map[string]bool)
	for rows.Next() {
		var table, column string
		if err := rows.Scan(&table, &column); err != nil {
			return fmt.Errorf("scan information_schema: %w", err)
		}
		if found[table] == nil {
			found[table] = make(map[string]bool)
		}
		found[table][column] = true
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate information_schema: %w", err)
	}

	var missing []string
	for table, columns := range requiredColumns {
		for _, column := range columns {
			if !found[table][column] {
				missing = append(missing, table+"."+column)
			}
		}
	}

	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("incompatible core schema; missing: %s", strings.Join(missing, ", "))
	}

	return nil
}
