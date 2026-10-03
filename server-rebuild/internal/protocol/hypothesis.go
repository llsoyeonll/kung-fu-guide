package protocol

import (
	"encoding/binary"
	"errors"
	"fmt"
)

type Endian string

const (
	Little Endian = "little"
	Big    Endian = "big"
)

type LengthHypothesis struct {
	Offset         int
	Width          int
	Endian         Endian
	IncludesHeader bool
	HeaderSize     int
	MaxFrame       int
}

type SplitResult struct {
	Frames        int
	Consumed      int
	Trailing      int
	FirstFailure  int
	FrameLengths  []int
}

func (h LengthHypothesis) Validate() error {
	if h.Offset < 0 {
		return errors.New("negative length offset")
	}
	if h.Width != 2 && h.Width != 4 {
		return fmt.Errorf("unsupported width %d", h.Width)
	}
	if h.Endian != Little && h.Endian != Big {
		return fmt.Errorf("unsupported endian %q", h.Endian)
	}
	if h.HeaderSize < h.Offset+h.Width {
		return errors.New("header size smaller than length field")
	}
	if h.MaxFrame <= 0 {
		return errors.New("max frame must be positive")
	}
	return nil
}

func (h LengthHypothesis) Split(data []byte) SplitResult {
	result := SplitResult{FirstFailure: -1}

	if err := h.Validate(); err != nil {
		result.FirstFailure = 0
		result.Trailing = len(data)
		return result
	}

	pos := 0
	for pos < len(data) {
		if len(data)-pos < h.HeaderSize {
			result.FirstFailure = pos
			break
		}

		raw, ok := h.readLength(data[pos:])
		if !ok {
			result.FirstFailure = pos
			break
		}

		frameLen := raw
		if !h.IncludesHeader {
			frameLen += h.HeaderSize
		}

		if frameLen < h.HeaderSize || frameLen > h.MaxFrame {
			result.FirstFailure = pos
			break
		}
		if frameLen > len(data)-pos {
			result.FirstFailure = pos
			break
		}

		result.FrameLengths = append(result.FrameLengths, frameLen)
		result.Frames++
		pos += frameLen
	}

	result.Consumed = pos
	result.Trailing = len(data) - pos
	return result
}

func (h LengthHypothesis) readLength(frame []byte) (int, bool) {
	end := h.Offset + h.Width
	if h.Offset < 0 || end > len(frame) {
		return 0, false
	}

	b := frame[h.Offset:end]

	switch h.Width {
	case 2:
		if h.Endian == Little {
			return int(binary.LittleEndian.Uint16(b)), true
		}
		return int(binary.BigEndian.Uint16(b)), true
	case 4:
		if h.Endian == Little {
			v := binary.LittleEndian.Uint32(b)
			if uint64(v) > uint64(^uint(0)>>1) {
				return 0, false
			}
			return int(v), true
		}
		v := binary.BigEndian.Uint32(b)
		if uint64(v) > uint64(^uint(0)>>1) {
			return 0, false
		}
		return int(v), true
	default:
		return 0, false
	}
}

type Candidate struct {
	Hypothesis LengthHypothesis
	Result     SplitResult
	Score      float64
}

func Score(h LengthHypothesis, data []byte) Candidate {
	r := h.Split(data)

	var coverage float64
	if len(data) > 0 {
		coverage = float64(r.Consumed) / float64(len(data))
	}

	// Coverage is the main signal. Repeated valid frames are a second signal.
	// A single "frame" covering the entire file is penalized because random
	// integers can otherwise look deceptively good.
	score := coverage * 1000
	score += float64(r.Frames) * 2

	if r.Frames == 1 && r.Trailing == 0 {
		score -= 100
	}
	if r.Frames == 0 {
		score -= 500
	}

	return Candidate{
		Hypothesis: h,
		Result:     r,
		Score:      score,
	}
}
