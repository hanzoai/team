package slack

import (
	"encoding/json"
	"strings"
)

// routeKind is the decision the webhook layer makes about an inbound (already
// signature-verified) Slack payload.
type routeKind int

const (
	routeIgnore    routeKind = iota // malformed / unsupported
	routeChallenge                  // url_verification handshake
	routeAck                        // valid but nothing to act on (echo/subtype/non-message)
	routeRelay                      // a plain user message to mirror into a MAPPED Hanzo channel
	routeAgent                      // an @mention / DM to the bot: run an agent on-behalf-of the user
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
	Type        string `json:"type"`
	Channel     string `json:"channel"`
	ChannelType string `json:"channel_type"`
	User        string `json:"user"`
	Text        string `json:"text"`
	TS          string `json:"ts"`
	Team        string `json:"team"`
	Subtype     string `json:"subtype"`
	BotID       string `json:"bot_id"`
	ThreadTS    string `json:"thread_ts"`
}

// routeEvent decides what to do with a signature-verified Slack payload. Pure -
// no I/O. Three message shapes matter:
//
//   - app_mention (@hanzo in a channel) and message with channel_type=="im"
//     (a DM to the bot) are AGENT triggers: run an agent on-behalf-of the user
//     and reply in-thread. The leading <@BOTID> mention token is stripped.
//   - a plain channel message is a RELAY candidate (mirrored into a MAPPED Hanzo
//     channel) - the existing behavior, UNCHANGED. The agent path is additive.
//
// The bot's own messages (bot_id/subtype) are always dropped so a mirrored or
// bot-authored message never loops back.
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
	if env.Type != "event_callback" || len(env.Event) == 0 {
		return routeDecision{Kind: routeAck}
	}
	var ev slackMessageEvent
	if err := json.Unmarshal(env.Event, &ev); err != nil {
		return routeDecision{Kind: routeAck}
	}

	switch ev.Type {
	case "app_mention":
		// The bot was @-mentioned in a channel. Skip bot-authored mentions
		// (echo-loop guard). Reply threads under the triggering message.
		if ev.BotID != "" || ev.User == "" || ev.Text == "" {
			return routeDecision{Kind: routeAck}
		}
		return routeDecision{
			Kind:           routeAgent,
			TeamID:         env.TeamID,
			SlackChannelID: ev.Channel,
			SlackUserID:    ev.User,
			Text:           stripLeadingMention(ev.Text),
			TS:             ev.TS,
			ThreadTS:       threadOr(ev.ThreadTS, ev.TS),
		}
	case "message":
		// Drop the bot's own messages + non-plain subtypes (edit/delete/join).
		if ev.BotID != "" || ev.Subtype != "" || ev.User == "" || ev.Text == "" {
			return routeDecision{Kind: routeAck}
		}
		if ev.ChannelType == "im" {
			// A DM to the bot: there is no channel mapping (DMs are never
			// mapped), so this is an AGENT trigger, not a relay. Reply threads
			// under the message.
			return routeDecision{
				Kind:           routeAgent,
				TeamID:         env.TeamID,
				SlackChannelID: ev.Channel,
				SlackUserID:    ev.User,
				Text:           stripLeadingMention(ev.Text),
				TS:             ev.TS,
				ThreadTS:       threadOr(ev.ThreadTS, ev.TS),
			}
		}
		// A plain channel message: RELAY candidate (mirror into a mapped Hanzo
		// channel). Unchanged from the original relay behavior.
		return routeDecision{
			Kind:           routeRelay,
			TeamID:         env.TeamID,
			SlackChannelID: ev.Channel,
			SlackUserID:    ev.User,
			Text:           ev.Text,
			TS:             ev.TS,
			ThreadTS:       ev.ThreadTS,
		}
	default:
		return routeDecision{Kind: routeAck}
	}
}

// stripLeadingMention removes a single leading Slack mention token
// ("<@U…>" or "<@U…|label>") plus following whitespace from an app_mention/DM
// text, so the agent receives the user's actual prompt ("@hanzo what's up" ->
// "what's up"). A text with no leading mention is returned trimmed, unchanged.
func stripLeadingMention(text string) string {
	t := strings.TrimSpace(text)
	if strings.HasPrefix(t, "<@") {
		if end := strings.IndexByte(t, '>'); end >= 0 {
			return strings.TrimSpace(t[end+1:])
		}
	}
	return t
}

// threadOr returns threadTS when set, else ts - so a reply always threads under
// the triggering message (a top-level trigger has no thread_ts; its own ts is
// the thread root).
func threadOr(threadTS, ts string) string {
	if threadTS != "" {
		return threadTS
	}
	return ts
}

// eventKey extracts the dedupe key (Slack event_id) from a payload; empty string
// if absent, which callers treat as non-dedupable (never blocks).
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
