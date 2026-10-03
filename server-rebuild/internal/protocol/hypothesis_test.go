package protocol

import (
	"encoding/binary"
	"testing"
)

func makeFrame(payload []byte) []byte {
	frame := make([]byte, 4+len(payload))
	binary.LittleEndian.PutUint16(frame[0:2], uint16(len(frame)))
	frame[2] = 0xAA
	frame[3] = 0x55
	copy(frame[4:], payload)
	return frame
}

func TestSplitLittleEndianLengthIncludingHeader(t *testing.T) {
	data := append(makeFrame([]byte{1, 2, 3}), makeFrame([]byte{4, 5})...)

	h := LengthHypothesis{
		Offset:         0,
		Width:          2,
		Endian:         Little,
		IncludesHeader: true,
		HeaderSize:     4,
		MaxFrame:       65535,
	}

	got := h.Split(data)
	if got.Frames != 2 {
		t.Fatalf("frames=%d want=2", got.Frames)
	}
	if got.Trailing != 0 {
		t.Fatalf("trailing=%d want=0", got.Trailing)
	}
	if len(got.FrameLengths) != 2 || got.FrameLengths[0] != 7 || got.FrameLengths[1] != 6 {
		t.Fatalf("unexpected lengths: %#v", got.FrameLengths)
	}
}

func TestSplitLengthExcludingHeader(t *testing.T) {
	first := []byte{3, 0, 0xAA, 0x55, 1, 2, 3}
	second := []byte{2, 0, 0xAA, 0x55, 4, 5}
	data := append(first, second...)

	h := LengthHypothesis{
		Offset:         0,
		Width:          2,
		Endian:         Little,
		IncludesHeader: false,
		HeaderSize:     4,
		MaxFrame:       65535,
	}

	got := h.Split(data)
	if got.Frames != 2 || got.Trailing != 0 {
		t.Fatalf("unexpected split: %+v", got)
	}
}

func TestRejectImpossibleLength(t *testing.T) {
	data := []byte{0xff, 0xff, 0, 0, 1, 2, 3}

	h := LengthHypothesis{
		Offset:         0,
		Width:          2,
		Endian:         Little,
		IncludesHeader: true,
		HeaderSize:     4,
		MaxFrame:       4096,
	}

	got := h.Split(data)
	if got.Frames != 0 || got.FirstFailure != 0 {
		t.Fatalf("unexpected split: %+v", got)
	}
}
