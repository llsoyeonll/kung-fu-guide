package main

import (
	"encoding/binary"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"sort"
)

type candidate struct {
	Offset int
	Width  int
	Endian string
	Value  uint64
}

func main() {
	path := flag.String("file", "", "capture file (c2s.bin or s2c.bin)")
	preview := flag.Int("preview", 256, "number of bytes to hex-dump")
	maxFrame := flag.Int("max-frame", 65535, "largest plausible length candidate")
	flag.Parse()

	if *path == "" {
		fmt.Fprintln(os.Stderr, "usage: capture-inspect -file captures/local/.../c2s.bin")
		os.Exit(2)
	}

	data, err := os.ReadFile(*path)
	if err != nil {
		panic(err)
	}

	fmt.Printf("file: %s\n", *path)
	fmt.Printf("size: %d bytes\n\n", len(data))

	n := *preview
	if n > len(data) {
		n = len(data)
	}
	fmt.Printf("first %d bytes:\n%s\n", n, hex.Dump(data[:n]))

	printByteFrequency(data)
	printLengthCandidates(data, *maxFrame)
	printZeroRuns(data)
}

func printByteFrequency(data []byte) {
	var counts [256]int
	for _, b := range data {
		counts[b]++
	}

	type pair struct {
		B byte
		N int
	}
	var pairs []pair
	for i, n := range counts {
		if n > 0 {
			pairs = append(pairs, pair{byte(i), n})
		}
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].N == pairs[j].N {
			return pairs[i].B < pairs[j].B
		}
		return pairs[i].N > pairs[j].N
	})

	fmt.Println("most frequent bytes:")
	limit := 16
	if len(pairs) < limit {
		limit = len(pairs)
	}
	for _, p := range pairs[:limit] {
		fmt.Printf("  %02X  %8d\n", p.B, p.N)
	}
	fmt.Println()
}

func printLengthCandidates(data []byte, maxFrame int) {
	limit := len(data)
	if limit > 128 {
		limit = 128
	}

	var out []candidate
	for off := 0; off < limit; off++ {
		if off+2 <= len(data) {
			le := uint64(binary.LittleEndian.Uint16(data[off : off+2]))
			be := uint64(binary.BigEndian.Uint16(data[off : off+2]))
			if plausible(le, len(data), maxFrame) {
				out = append(out, candidate{off, 2, "LE", le})
			}
			if be != le && plausible(be, len(data), maxFrame) {
				out = append(out, candidate{off, 2, "BE", be})
			}
		}
		if off+4 <= len(data) {
			le := uint64(binary.LittleEndian.Uint32(data[off : off+4]))
			be := uint64(binary.BigEndian.Uint32(data[off : off+4]))
			if plausible(le, len(data), maxFrame) {
				out = append(out, candidate{off, 4, "LE", le})
			}
			if be != le && plausible(be, len(data), maxFrame) {
				out = append(out, candidate{off, 4, "BE", be})
			}
		}
	}

	fmt.Println("plausible length/header integers in first 128 bytes:")
	if len(out) == 0 {
		fmt.Println("  none")
	} else {
		limit := 40
		if len(out) < limit {
			limit = len(out)
		}
		for _, c := range out[:limit] {
			fmt.Printf("  off=%3d width=%d %s value=%d (0x%X)\n",
				c.Offset, c.Width, c.Endian, c.Value, c.Value)
		}
	}
	fmt.Println()
}

func plausible(v uint64, fileSize int, maxFrame int) bool {
	return v >= 2 && v <= uint64(maxFrame) && v <= uint64(fileSize)
}

func printZeroRuns(data []byte) {
	fmt.Println("zero runs >= 8 bytes in first 4096 bytes:")
	limit := len(data)
	if limit > 4096 {
		limit = 4096
	}

	found := false
	for i := 0; i < limit; {
		if data[i] != 0 {
			i++
			continue
		}
		j := i
		for j < limit && data[j] == 0 {
			j++
		}
		if j-i >= 8 {
			fmt.Printf("  off=%d len=%d\n", i, j-i)
			found = true
		}
		i = j
	}
	if !found {
		fmt.Println("  none")
	}
	fmt.Println()
}
