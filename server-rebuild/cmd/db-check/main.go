package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	mysqlstore "github.com/local/9yin-go-server/internal/store/mysql"
)

func main() {
	dsn := flag.String("dsn", os.Getenv("NINEYIN_MYSQL_DSN"), "MySQL DSN; defaults to NINEYIN_MYSQL_DSN")
	timeout := flag.Duration("timeout", 5*time.Second, "database check timeout")
	flag.Parse()

	if *dsn == "" {
		fmt.Fprintln(os.Stderr, "NINEYIN_MYSQL_DSN is empty; pass -dsn or set the environment variable")
		os.Exit(2)
	}

	s, err := mysqlstore.Open(*dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer s.Close()

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()

	if err := s.Ping(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "database connection failed:", err)
		os.Exit(1)
	}
	if err := s.CheckCoreSchema(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "database schema check failed:", err)
		os.Exit(1)
	}

	fmt.Println("OK: MySQL connection and core schema are compatible")
}
