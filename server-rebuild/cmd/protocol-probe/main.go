package main

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type chunkEvent struct {
	Sequence  uint64
	Time      string
	Direction string
	Length    int
	Hex       string
}

type metadata struct {
	Started  string
	Client   string
	Upstream string
	Listen   string
}

var sequence atomic.Uint64

func main() {
	listenAddr := flag.String("listen", "127.0.0.1:19061", "client-facing listen address")
	upstreamAddr := flag.String("upstream", "127.0.0.1:19063", "legacy game-server address")
	captureRoot := flag.String("captures", "captures/local", "capture directory")
	flag.Parse()

	if err := os.MkdirAll(*captureRoot, 0755); err != nil {
		log.Fatal(err)
	}

	listener, err := net.Listen("tcp", *listenAddr)
	if err != nil {
		log.Fatal(err)
	}
	defer listener.Close()

	log.Printf("9Yin protocol capture proxy")
	log.Printf("listen:   %s", *listenAddr)
	log.Printf("upstream: %s", *upstreamAddr)
	log.Printf("captures: %s", *captureRoot)

	for {
		client, err := listener.Accept()
		if err != nil {
			log.Printf("accept: %v", err)
			continue
		}
		go handleConnection(client, *listenAddr, *upstreamAddr, *captureRoot)
	}
}

func handleConnection(client net.Conn, listenAddr, upstreamAddr, captureRoot string) {
	defer client.Close()

	upstream, err := net.DialTimeout("tcp", upstreamAddr, 5*time.Second)
	if err != nil {
		log.Printf("upstream connection failed for %s: %v", client.RemoteAddr(), err)
		return
	}
	defer upstream.Close()

	sessionID := fmt.Sprintf(
		"%s_%s",
		time.Now().Format("20060102-150405.000"),
		safeName(client.RemoteAddr().String()),
	)
	sessionDir := filepath.Join(captureRoot, sessionID)
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		log.Printf("create capture directory: %v", err)
		return
	}

	meta := metadata{
		Started:  time.Now().Format(time.RFC3339Nano),
		Client:   client.RemoteAddr().String(),
		Upstream: upstreamAddr,
		Listen:   listenAddr,
	}
	metaBytes, _ := json.MarshalIndent(meta, "", "  ")
	_ = os.WriteFile(filepath.Join(sessionDir, "meta.json"), metaBytes, 0644)

	c2s, err := os.Create(filepath.Join(sessionDir, "c2s.bin"))
	if err != nil {
		log.Printf("create c2s capture: %v", err)
		return
	}
	defer c2s.Close()

	s2c, err := os.Create(filepath.Join(sessionDir, "s2c.bin"))
	if err != nil {
		log.Printf("create s2c capture: %v", err)
		return
	}
	defer s2c.Close()

	events, err := os.Create(filepath.Join(sessionDir, "chunks.jsonl"))
	if err != nil {
		log.Printf("create event capture: %v", err)
		return
	}
	defer events.Close()

	var eventMu sync.Mutex
	errCh := make(chan error, 2)

	go func() {
		errCh <- pump(upstream, client, "c2s", c2s, events, &eventMu)
	}()
	go func() {
		errCh <- pump(client, upstream, "s2c", s2c, events, &eventMu)
	}()

	log.Printf("capture started: %s -> %s (%s)", client.RemoteAddr(), upstreamAddr, sessionID)

	firstErr := <-errCh
	_ = client.Close()
	_ = upstream.Close()
	secondErr := <-errCh

	for _, streamErr := range []error{firstErr, secondErr} {
		if streamErr != nil && !errors.Is(streamErr, io.EOF) && !isClosedError(streamErr) {
			log.Printf("%s stream: %v", sessionID, streamErr)
		}
	}

	log.Printf("capture finished: %s", sessionID)
}

func pump(dst net.Conn, src net.Conn, direction string, raw *os.File, events *os.File, eventMu *sync.Mutex) error {
	buffer := make([]byte, 64*1024)

	for {
		n, readErr := src.Read(buffer)
		if n > 0 {
			chunk := append([]byte(nil), buffer[:n]...)

			if _, err := raw.Write(chunk); err != nil {
				return fmt.Errorf("%s raw capture: %w", direction, err)
			}

			event := chunkEvent{
				Sequence:  sequence.Add(1),
				Time:      time.Now().Format(time.RFC3339Nano),
				Direction: direction,
				Length:    len(chunk),
				Hex:       hex.EncodeToString(chunk),
			}

			eventMu.Lock()
			encodeErr := json.NewEncoder(events).Encode(event)
			eventMu.Unlock()
			if encodeErr != nil {
				return fmt.Errorf("%s event capture: %w", direction, encodeErr)
			}

			if err := writeAll(dst, chunk); err != nil {
				return fmt.Errorf("%s forwarding: %w", direction, err)
			}
		}

		if readErr != nil {
			return readErr
		}
	}
}

func writeAll(w io.Writer, data []byte) error {
	for len(data) > 0 {
		n, err := w.Write(data)
		if err != nil {
			return err
		}
		if n <= 0 {
			return io.ErrUnexpectedEOF
		}
		data = data[n:]
	}
	return nil
}

func safeName(s string) string {
	replacer := strings.NewReplacer(
		":", "-",
		".", "-",
		"[", "",
		"]", "",
		"%", "-",
	)
	return replacer.Replace(s)
}

func isClosedError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "use of closed network connection") ||
		strings.Contains(s, "forcibly closed") ||
		strings.Contains(s, "connection reset")
}
