package custom

import "fmt"

type Confidence string

const (
	Confirmed   Confidence = "confirmed"
	LegacyMatch Confidence = "legacy-match"
	Unresolved  Confidence = "unresolved"
)

type Definition struct {
	ID          uint32
	Name        string
	Confidence  Confidence
	Description string
}

var definitions = map[uint32]Definition{
	82:   {82, "MONITER", Unresolved, "Observed client custom message; 2026 sender/shape still unresolved."},
	185:  {185, "NEW_TEACHER", LegacyMatch, "Teacher/pupil system."},
	298:  {298, "REFRESH_TASK_NPC_EFFECT", Confirmed, "Refresh quest marker/effect for a serialized NPC object."},
	409:  {409, "UNKNOWN_409", Unresolved, "Do not auto-handle until 2026 client semantics are proven."},
	505:  {505, "SMALL_GAME_RESULT", LegacyMatch, "SJY Army mini-game result."},
	690:  {690, "GET_GAME_STEP", Confirmed, "Requests current main/sub game progression."},
	758:  {758, "LEITAI_WAR", Confirmed, "Leitai/arena protocol."},
	770:  {770, "JIUYINZHI_GET_INFO", LegacyMatch, "JiuYinZhi progression/event system."},
	858:  {858, "NEW_TERRITORY", Confirmed, "New Territory camp/PvP state."},
	949:  {949, "MASSES_FIGHT", Confirmed, "Mass-battle state/resume."},
	958:  {958, "GET_SERVER_ID", Confirmed, "Requests logical server/service ID."},
	959:  {959, "GET_ACCOUNT", Confirmed, "Requests login account name."},
	1016: {1016, "GUILDBUILDING", Confirmed, "Guild-building system."},
}

func Lookup(id uint32) (Definition, bool) {
	v, ok := definitions[id]
	return v, ok
}

func Name(id uint32) string {
	if v, ok := Lookup(id); ok {
		return v.Name
	}
	return fmt.Sprintf("UNKNOWN_%d", id)
}

type StartupAction struct {
	MessageID  uint32
	Subcommand int64
	HasSubcmd  bool
	Name       string
}

var StartupActions = []StartupAction{
	{MessageID: 1016, Subcommand: 140, HasSubcmd: true, Name: "guildbuilding_request_precreate_npc"},
	{MessageID: 758, Subcommand: 10, HasSubcmd: true, Name: "leitai_oncontinue"},
	{MessageID: 949, Subcommand: 3, HasSubcmd: true, Name: "masses_fight_resume"},
	{MessageID: 858, Subcommand: 6, HasSubcmd: true, Name: "new_territory_state_query"},
	{MessageID: 958, Name: "get_server_id"},
	{MessageID: 690, Name: "get_game_step"},
	{MessageID: 959, Name: "get_login_account"},
}

func ClassifyStartup(id uint32, args []int64) (StartupAction, bool) {
	for _, action := range StartupActions {
		if action.MessageID != id {
			continue
		}
		if !action.HasSubcmd {
			return action, true
		}
		if len(args) > 0 && args[0] == action.Subcommand {
			return action, true
		}
	}
	return StartupAction{}, false
}

func SafeNoReplyStartup(id uint32, args []int64) bool {
	action, ok := ClassifyStartup(id, args)
	if !ok {
		return false
	}
	switch action.Name {
	case "guildbuilding_request_precreate_npc",
		"leitai_oncontinue",
		"masses_fight_resume",
		"new_territory_state_query":
		return true
	default:
		return false
	}
}

type NPCRefresh struct {
	Command   int64
	ObjectRaw []byte
}

func ValidateNPCRefresh(v NPCRefresh) error {
	if v.Command != 1 {
		return fmt.Errorf("298: unsupported subcommand %d", v.Command)
	}
	if len(v.ObjectRaw) == 0 {
		return fmt.Errorf("298: missing serialized NPC object")
	}
	return nil
}
