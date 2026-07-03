package slack

import "testing"

// app_mention (@hanzo in a channel) routes to the agent, with the leading bot
// mention stripped and the reply threaded under the triggering message.
func TestRouteEvent_AppMention(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T1","event":{"type":"app_mention","channel":"C9","user":"U1","text":"<@U0BOT> summarize this","ts":"111.1"}}`)
	d := routeEvent(raw)
	if d.Kind != routeAgent {
		t.Fatalf("app_mention not routed to agent: %+v", d)
	}
	if d.Text != "summarize this" {
		t.Fatalf("leading mention not stripped: %q", d.Text)
	}
	if d.ThreadTS != "111.1" {
		t.Fatalf("thread_ts must fall back to ts, got %q", d.ThreadTS)
	}
	if d.TeamID != "T1" || d.SlackChannelID != "C9" || d.SlackUserID != "U1" {
		t.Fatalf("agent fields wrong: %+v", d)
	}
}

// An @mention already inside a thread replies into that SAME thread (thread_ts
// preserved, not overwritten by ts).
func TestRouteEvent_AppMention_ThreadPreserved(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T","event":{"type":"app_mention","channel":"C","user":"U","text":"<@U0BOT> hi","ts":"222.2","thread_ts":"100.0"}}`)
	if d := routeEvent(raw); d.ThreadTS != "100.0" {
		t.Fatalf("existing thread_ts must be preserved, got %q", d.ThreadTS)
	}
}

// A DM to the bot (channel_type=im) routes to the agent, NOT the channel relay.
func TestRouteEvent_DM(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"D1","channel_type":"im","user":"U1","text":"hello bot","ts":"5.5"}}`)
	d := routeEvent(raw)
	if d.Kind != routeAgent {
		t.Fatalf("DM not routed to agent: %+v", d)
	}
	if d.Text != "hello bot" || d.ThreadTS != "5.5" {
		t.Fatalf("dm fields wrong: %+v", d)
	}
}

// A plain channel message (no channel_type=im) STILL routes to relay, with text
// and thread_ts unchanged — the mirror path must not regress.
func TestRouteEvent_ChannelMessageStillRelays(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"C1","channel_type":"channel","user":"U1","text":"<@U0BOT> keep raw","ts":"9.9"}}`)
	d := routeEvent(raw)
	if d.Kind != routeRelay {
		t.Fatalf("channel message should relay: %+v", d)
	}
	if d.Text != "<@U0BOT> keep raw" {
		t.Fatalf("relay text must stay raw (unstripped), got %q", d.Text)
	}
	if d.ThreadTS != "" {
		t.Fatalf("relay thread_ts must stay raw (empty), got %q", d.ThreadTS)
	}
}

// A bot-authored app_mention is dropped (echo-loop guard).
func TestRouteEvent_AgentDropsBotMention(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T","event":{"type":"app_mention","channel":"C","user":"U","bot_id":"B1","text":"<@U0BOT> x","ts":"1"}}`)
	if routeEvent(raw).Kind != routeAck {
		t.Fatal("bot-authored app_mention must ack, not run the agent (echo loop)")
	}
}

func TestStripLeadingMention(t *testing.T) {
	cases := map[string]string{
		"<@U0BOT> hello":       "hello",
		"  <@U0BOT>   spaced ": "spaced",
		"<@U0BOT|hanzo> hi":    "hi",
		"no mention here":      "no mention here",
		"<@U0BOT>":             "",
	}
	for in, want := range cases {
		if got := stripLeadingMention(in); got != want {
			t.Fatalf("stripLeadingMention(%q) = %q, want %q", in, got, want)
		}
	}
}

// Slash command bodies are urlencoded; parse extracts the fields and requires
// the identifying ones (team_id, user_id).
func TestParseSlashCommand(t *testing.T) {
	form := "team_id=T1&channel_id=C1&user_id=U1&text=what+is+2%2B2&response_url=https%3A%2F%2Fhooks.slack.com%2Fx&trigger_id=13345224609.738474920.abc"
	team, channel, user, text, ru, trigger, ok := parseSlashCommand([]byte(form))
	if !ok {
		t.Fatal("valid slash command not parsed")
	}
	if team != "T1" || channel != "C1" || user != "U1" {
		t.Fatalf("ids wrong: team=%s channel=%s user=%s", team, channel, user)
	}
	if text != "what is 2+2" {
		t.Fatalf("text not url-decoded: %q", text)
	}
	if ru != "https://hooks.slack.com/x" {
		t.Fatalf("response_url wrong: %q", ru)
	}
	if trigger != "13345224609.738474920.abc" {
		t.Fatalf("trigger_id wrong: %q", trigger)
	}
	if _, _, _, _, _, _, ok2 := parseSlashCommand([]byte("team_id=T1")); ok2 {
		t.Fatal("missing user_id must be not-ok")
	}
}
