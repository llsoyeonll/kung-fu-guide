package custom

import "testing"

func TestStartupMessages(t *testing.T) {
	tests := []struct {
		id   uint32
		args []int64
		name string
	}{
		{1016, []int64{140}, "guildbuilding_request_precreate_npc"},
		{758, []int64{10}, "leitai_oncontinue"},
		{949, []int64{3}, "masses_fight_resume"},
		{858, []int64{6}, "new_territory_state_query"},
		{958, nil, "get_server_id"},
		{690, nil, "get_game_step"},
		{959, nil, "get_login_account"},
	}

	for _, tc := range tests {
		got, ok := ClassifyStartup(tc.id, tc.args)
		if !ok {
			t.Fatalf("message %d was not classified", tc.id)
		}
		if got.Name != tc.name {
			t.Fatalf("message %d: got %q, want %q", tc.id, got.Name, tc.name)
		}
	}
}

func TestDifferentSubcommandIsNotSwallowed(t *testing.T) {
	if SafeNoReplyStartup(1016, []int64{101}) {
		t.Fatal("1016/101 must not be swallowed")
	}
	if SafeNoReplyStartup(758, []int64{1}) {
		t.Fatal("758/1 must not be treated as the known 758/10 startup request")
	}
}

func TestDoNotGuessUnresolvedIDs(t *testing.T) {
	for _, id := range []uint32{82, 409} {
		d, ok := Lookup(id)
		if !ok {
			t.Fatalf("%d must be present in diagnostic catalogue", id)
		}
		if d.Confidence != Unresolved {
			t.Fatalf("%d must remain unresolved, got %q", id, d.Confidence)
		}
		if SafeNoReplyStartup(id, nil) {
			t.Fatalf("%d must never be silently swallowed", id)
		}
	}
}

func TestNPCRefreshAcceptsOpaqueObject(t *testing.T) {
	err := ValidateNPCRefresh(NPCRefresh{
		Command:   1,
		ObjectRaw: []byte{0x01, 0x02, 0x03},
	})
	if err != nil {
		t.Fatal(err)
	}
}
