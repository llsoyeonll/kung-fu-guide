package main

import (
	"flag"
	"fmt"
	"os"
	"sort"

	"github.com/local/9yin-go-server/internal/protocol"
)

func main() {
	path := flag.String("file", "", "raw TCP stream capture")
	maxOffset := flag.Int("max-offset", 12, "largest candidate offset for a length field")
	maxHeader := flag.Int("max-header", 24, "largest candidate frame header size")
	maxFrame := flag.Int("max-frame", 65535, "largest plausible frame")
	top := flag.Int("top", 30, "number of candidates to print")
	flag.Parse()

	if *path == "" {
		fmt.Fprintln(os.Stderr, "usage: frame-scan -file c2s.bin")
		os.Exit(2)
	}

	data, err := os.ReadFile(*path)
	if err != nil {
		panic(err)
	}
	if len(data) == 0 {
		fmt.Fprintln(os.Stderr, "capture is empty")
		os.Exit(1)
	}

	var candidates []protocol.Candidate

	for offset := 0; offset <= *maxOffset; offset++ {
		for _, width := range []int{2, 4} {
			minHeader := offset + width
			for header := minHeader; header <= *maxHeader; header++ {
				for _, endian := range []protocol.Endian{protocol.Little, protocol.Big} {
					for _, includesHeader := range []bool{true, false} {
						h := protocol.LengthHypothesis{
							Offset:         offset,
							Width:          width,
							Endian:         endian,
							IncludesHeader: includesHeader,
							HeaderSize:     header,
							MaxFrame:       *maxFrame,
						}
						candidates = append(candidates, protocol.Score(h, data))
					}
				}
			}
		}
	}

	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].Score == candidates[j].Score {
			return candidates[i].Result.Frames > candidates[j].Result.Frames
		}
		return candidates[i].Score > candidates[j].Score
	})

	n := *top
	if n > len(candidates) {
		n = len(candidates)
	}

	fmt.Printf("file=%s size=%d candidates=%d\n\n", *path, len(data), len(candidates))

	for i := 0; i < n; i++ {
		c := candidates[i]
		h := c.Hypothesis
		r := c.Result

		fmt.Printf(
			"#%02d score=%8.2f coverage=%6.2f%% frames=%5d trailing=%6d fail=%6d  offset=%2d width=%d endian=%-6s includes_header=%-5v header=%2d\n",
			i+1,
			c.Score,
			100*float64(r.Consumed)/float64(len(data)),
			r.Frames,
			r.Trailing,
			r.FirstFailure,
			h.Offset,
			h.Width,
			h.Endian,
			h.IncludesHeader,
			h.HeaderSize,
		)

		show := len(r.FrameLengths)
		if show > 12 {
			show = 12
		}
		if show > 0 {
			fmt.Printf("     first lengths: %v\n", r.FrameLengths[:show])
		}
	}
}
