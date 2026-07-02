package slack

import "encoding/json"

// routeKind is the decision the webhook layer makes about an inbound (already
// signature-verified) Slack payload.
type routeKind int

const (
	routeIgnore    routeKind = iota // malformed / unsupported
	routeChallenge                  // url_verification handshake
	routeAck                        // valid but nothing to relay (echo/subtype/non-message)
	routeRelay                      // a plain user message to mirror into Hanzo
)

// routeDecision is the outcome of routeEvent. Only the fields relevant to the
// kind are populated.
type routeDecision struct {
	Kind           routeKind
	Challenge      string
	TeamID         string
	SlackChannelID string
	SlackUserID    string
	Text           string
	TS             string
	ThreadTS       string
}

// slackEnvelope is the minimal view of the Slack Events API payloads we act on.
type slackEnvelope struct {
	Type      string          `json:"type"`
	Challenge string          `json:"challenge"`
	TeamID    string          `json:"team_id"`
	APIAppID  string          `json:"api_app_id"`
	EventID   string          `json:"event_id"`
	Event     json.RawMessage `json:"event"`
}

type slackMessageEvent struct {
	Type     string `json:"type"`
	Channel  string `json:"channel"`
	User     string `json:"user"`
	Text     string `json:"text"`
	TS       string `json:"ts"`
	Team     string `json:"team"`
	Subtype  string `json:"subtype"`
	BotID    string `json:"bot_id"`
	ThreadTS string `json:"thread_ts"`
}

// routeEvent decides what to do with a signature-verified Slack payload. Pure —
// no I/O. Drops the bot's own messages (bot_id/subtype) so a mirrored message
// never loops back into Slack (echo-loop prevention). Go port of routeSlackEvent.
func routeEvent(raw []byte) routeDecision {
	var env slackEnvelope
	if err := json.Unmarshal(raw, &env); err != nil || env.Type == "" {
		return routeDecision{Kind: routeIgnore}
	}
	if env.Type == "url_verification" {
		if env.Challenge != "" {
			return routeDecision{Kind: routeChallenge, Challenge: env.Challenge}
		}
		return routeDecision{Kind: routeIgnore}
	}
	if env.Type != "event_callback" {
		return routeDecision{Kind: routeAck}
	}
	if len(env.Event) == 0 {
		return routeDecision{Kind: routeAck}
	}
	var ev slackMessageEvent
	if err := json.Unmarshal(env.Event, &ev); err != nil || ev.Type != "message" {
		return routeDecision{Kind: routeAck}
	}
	// Skip bot messages (incl. our own mirror) and non-plain subtypes
	// (message_changed, message_deleted, channel_join, ...).
	if ev.BotID != "" || ev.Subtype != "" {
		return routeDecision{Kind: routeAck}
	}
	if ev.User == "" || ev.Text == "" {
		return routeDecision{Kind: routeAck}
	}
	return routeDecision{
		Kind:           routeRelay,
		TeamID:         env.TeamID,
		SlackChannelID: ev.Channel,
		SlackUserID:    ev.User,
		Text:           ev.Text,
		TS:             ev.TS,
		ThreadTS:       ev.ThreadTS,
	}
}

// eventKey extracts the dedupe key (Slack event_id) from a payload; empty string
// if absent, which callers treat as non-dedupable (never blocks). Go port of
// slackEventKey.
func eventKey(raw []byte) string {
	var env slackEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return ""
	}
	if env.Type == "event_callback" {
		return env.EventID
	}
	return ""
}
