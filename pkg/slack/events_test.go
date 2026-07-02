package slack

import "testing"

func TestRouteEvent_Challenge(t *testing.T) {
	d := routeEvent([]byte(`{"type":"url_verification","challenge":"abc123"}`))
	if d.Kind != routeChallenge || d.Challenge != "abc123" {
		t.Fatalf("challenge not routed: %+v", d)
	}
	// Empty challenge → ignore.
	if routeEvent([]byte(`{"type":"url_verification","challenge":""}`)).Kind != routeIgnore {
		t.Fatal("empty challenge should be ignored")
	}
}

func TestRouteEvent_RelayPlainMessage(t *testing.T) {
	raw := []byte(`{"type":"event_callback","team_id":"T1","event":{"type":"message","channel":"C1","user":"U1","text":"hi","ts":"1.2"}}`)
	d := routeEvent(raw)
	if d.Kind != routeRelay {
		t.Fatalf("plain message not relayed: %+v", d)
	}
	if d.TeamID != "T1" || d.SlackChannelID != "C1" || d.SlackUserID != "U1" || d.Text != "hi" {
		t.Fatalf("relay fields wrong: %+v", d)
	}
}

func TestRouteEvent_DropsBotAndSubtype(t *testing.T) {
	// bot_id present → ack (never relay; echo-loop prevention).
	bot := `{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"C","user":"U","text":"x","bot_id":"B1","ts":"1"}}`
	if routeEvent([]byte(bot)).Kind != routeAck {
		t.Fatal("bot message must be ack, not relay (echo loop)")
	}
	// subtype present (edit/delete/join) → ack.
	sub := `{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"C","user":"U","text":"x","subtype":"message_changed","ts":"1"}}`
	if routeEvent([]byte(sub)).Kind != routeAck {
		t.Fatal("subtyped message must be ack")
	}
}

func TestRouteEvent_MissingFields(t *testing.T) {
	cases := []string{
		`{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"C","text":"x","ts":"1"}}`, // no user
		`{"type":"event_callback","team_id":"T","event":{"type":"message","channel":"C","user":"U","ts":"1"}}`, // no text
		`{"type":"event_callback","team_id":"T","event":{"type":"reaction_added"}}`,                            // non-message
		`{"type":"event_callback","team_id":"T"}`,                                                              // no event
		`{"type":"something_else"}`, // unknown top type
	}
	for i, c := range cases {
		if routeEvent([]byte(c)).Kind == routeRelay {
			t.Fatalf("case %d relayed but should ack: %s", i, c)
		}
	}
}

func TestRouteEvent_Malformed(t *testing.T) {
	if routeEvent([]byte(`not json`)).Kind != routeIgnore {
		t.Fatal("malformed json should be ignored")
	}
	if routeEvent([]byte(`{}`)).Kind != routeIgnore {
		t.Fatal("empty type should be ignored")
	}
}

func TestEventKey(t *testing.T) {
	raw := []byte(`{"type":"event_callback","event_id":"Ev123","event":{"type":"message"}}`)
	if eventKey(raw) != "Ev123" {
		t.Fatalf("event key wrong: %q", eventKey(raw))
	}
	// url_verification has no event_id.
	if eventKey([]byte(`{"type":"url_verification"}`)) != "" {
		t.Fatal("non-callback should have empty key")
	}
}
