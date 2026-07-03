package slack

import (
	"context"
	"net/url"
	"strings"

	"github.com/hanzoai/base/core"
	"github.com/hanzoai/dbx"
)

// installOrg resolves a Slack team to its Hanzo tenant (owner_org) + workspace
// id via the slack_installs record written at OAuth time. This is the ONE way
// the agent path resolves the org WITHOUT a channel mapping, so an @mention / DM
// / slash command can find the tenant (and thus the workspace bot token) before
// any channel is bridged. The org is ALWAYS read here, never trusted from Slack.
func (c *controller) installOrg(teamID string) (org, workspaceID string, ok bool) {
	rec, _ := c.app.FindFirstRecordByFilter("slack_installs",
		"slack_team_id = {:t}", dbx.Params{"t": teamID})
	if rec == nil {
		return "", "", false
	}
	org = rec.GetString("owner_org")
	if org == "" {
		return "", "", false
	}
	return org, rec.GetString("workspace_id"), true
}

// upsertInstall records slack_team_id -> owner_org (+ optional workspace_id).
// FIRST-ORG-WINS: it REFUSES to change the owner_org of an existing team install
// (returns errInstallConflict), so a second org cannot capture a team another
// org already connected (the confused-deputy defense). workspaceID may be empty
// (the org-scoped connect path has no single workspace).
func (c *controller) upsertInstall(teamID, workspaceID, org string) error {
	existing, _ := c.app.FindFirstRecordByFilter("slack_installs",
		"slack_team_id = {:t}", dbx.Params{"t": teamID})
	if existing != nil {
		if existing.GetString("owner_org") != org {
			return errInstallConflict
		}
		if workspaceID != "" {
			existing.Set("workspace_id", workspaceID)
		}
		return c.app.Save(existing)
	}
	coll, err := c.app.FindCollectionByNameOrId("slack_installs")
	if err != nil {
		return err
	}
	rec := core.NewRecord(coll)
	rec.Set("slack_team_id", teamID)
	if workspaceID != "" {
		rec.Set("workspace_id", workspaceID)
	}
	rec.Set("owner_org", org)
	return c.app.Save(rec)
}

// markProcessed is the DURABLE agent-path dedupe (M2). It inserts a
// slack_processed_events row for `key` (a Slack event_id or slash trigger_id)
// and returns fresh=true only if this is the first sighting. A duplicate (unique
// index) returns fresh=false. Because it is DB-backed it survives a pod restart
// (and holds across replicas), so a Slack retry can never trigger a second
// BILLED agent run. An empty key is non-dedupable (fresh) - callers only pass
// non-empty keys onto the billed path. A genuine DB error is surfaced so the
// caller can fail closed (skip) rather than risk a double-run.
func (c *controller) markProcessed(key string) (bool, error) {
	if key == "" {
		return true, nil
	}
	if existing, _ := c.app.FindFirstRecordByFilter("slack_processed_events",
		"event_key = {:k}", dbx.Params{"k": key}); existing != nil {
		return false, nil
	}
	coll, err := c.app.FindCollectionByNameOrId("slack_processed_events")
	if err != nil {
		return false, err
	}
	rec := core.NewRecord(coll)
	rec.Set("event_key", key)
	if err := c.app.Save(rec); err != nil {
		// A concurrent insert lost the race to the unique index: the row now
		// exists, so this IS a duplicate, not a failure.
		if existing, _ := c.app.FindFirstRecordByFilter("slack_processed_events",
			"event_key = {:k}", dbx.Params{"k": key}); existing != nil {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// findUserLink returns the (team, user) -> Hanzo account link row, or nil.
func (c *controller) findUserLink(teamID, slackUserID string) *core.Record {
	rec, _ := c.app.FindFirstRecordByFilter("slack_user_links",
		"slack_team_id = {:t} && slack_user_id = {:u}",
		dbx.Params{"t": teamID, "u": slackUserID})
	return rec
}

// saveUserLink upserts the (team, user) -> Hanzo account identity mapping. The
// (team, user) here is the SLACK-VERIFIED subject (proven by the Slack sign-in
// leg), never a client-supplied value. The refresh token is stored separately
// in KMS (never in this row).
func (c *controller) saveUserLink(teamID, slackUserID, subject, org string) error {
	existing := c.findUserLink(teamID, slackUserID)
	if existing != nil {
		existing.Set("hanzo_subject", subject)
		existing.Set("hanzo_org", org)
		return c.app.Save(existing)
	}
	coll, err := c.app.FindCollectionByNameOrId("slack_user_links")
	if err != nil {
		return err
	}
	rec := core.NewRecord(coll)
	rec.Set("slack_team_id", teamID)
	rec.Set("slack_user_id", slackUserID)
	rec.Set("hanzo_subject", subject)
	rec.Set("hanzo_org", org)
	return c.app.Save(rec)
}

// linkedToken mints a FRESH, org-scoped Hanzo access token for a linked Slack
// user, to authorize an on-behalf-of agent run. It looks up the link, fetches
// the KMS-stored refresh token (under the workspace TENANT org - the same org
// the bot token lives under, never a per-account path), and exchanges it at IAM.
// Returns ok=false (no error) when the user is not linked. The stored refresh
// token is rotated if IAM issued a new one.
func (c *controller) linkedToken(ctx context.Context, teamID, slackUserID string) (bearer, org string, ok bool, err error) {
	link := c.findUserLink(teamID, slackUserID)
	if link == nil {
		return "", "", false, nil
	}
	kmsOrg, _, iok := c.installOrg(teamID)
	if !iok {
		return "", "", false, nil
	}
	ut, found, gerr := c.userTokens.get(ctx, kmsOrg, teamID, slackUserID)
	if gerr != nil {
		return "", "", false, gerr
	}
	if !found || ut.RefreshToken == "" {
		return "", "", false, nil
	}
	ts, rerr := c.oidc.refresh(ctx, ut.RefreshToken)
	if rerr != nil {
		return "", "", false, rerr
	}
	// Rotate the stored refresh token when IAM issued a new one (best-effort; a
	// failed rotation must not fail the run - the old token stays valid until
	// IAM revokes it).
	if ts.Refresh != "" && ts.Refresh != ut.RefreshToken {
		ut.RefreshToken = ts.Refresh
		_ = c.userTokens.save(ctx, kmsOrg, teamID, slackUserID, ut)
	}
	return ts.Access, link.GetString("hanzo_org"), true, nil
}

// linkURL builds the per-user "connect your Hanzo account" URL: the
// /v1/slack/link entry point carrying a signed, single-use state binding
// (team, user). NOTE the (team,user) in this state is PROVENANCE only - the
// account binding at redemption is taken from the Slack-verified sign-in leg +
// a browser-bound cookie, never from this URL (the link-hijack defense). The
// entry host is derived from SLACK_LINK_REDIRECT_URI (its /callback sibling) so
// ONE config drives the flow.
func (c *controller) linkURL(teamID, slackUserID string) (string, error) {
	state, err := signLinkState(c.cfg.secret, teamID, slackUserID, 0)
	if err != nil {
		return "", err
	}
	entry := strings.TrimSuffix(c.cfg.linkRedirect, "/callback")
	return entry + "?state=" + url.QueryEscape(state), nil
}

// agentReply is the ONE agent brain, shared by the @mention/DM path and the
// slash-command path. It resolves the caller's Hanzo identity and either runs
// the agent on-behalf-of them (returning the model's answer) or, when unlinked,
// returns a short prompt carrying the link URL. linkPrompt reports whether the
// reply is the (sensitive) link prompt - the caller MUST deliver those
// ephemerally (never to a whole channel). Every returned string is safe to post:
// internal errors are logged (never tokens) and surfaced as a terse message.
func (c *controller) agentReply(ctx context.Context, teamID, slackUserID, text string) (reply string, linkPrompt bool) {
	bearer, _, linked, err := c.linkedToken(ctx, teamID, slackUserID)
	if err != nil {
		c.app.Logger().Warn("slack: agent identity", "team", teamID, "err", err)
		return "Sorry - I couldn't reach your Hanzo account just now. Please try again shortly.", false
	}
	if !linked {
		u, serr := c.linkURL(teamID, slackUserID)
		if serr != nil {
			c.app.Logger().Error("slack: link url", "team", teamID, "err", serr)
			return "Connect your Hanzo account to use @hanzo.", true
		}
		return "Connect your Hanzo account to use @hanzo: " + u, true
	}
	answer, rerr := runAgent(ctx, c.cfg.agentsBase, c.cfg.agentRef, text, bearer)
	if rerr != nil {
		c.app.Logger().Warn("slack: agent run", "team", teamID, "err", rerr) // never logs the bearer
		return "Sorry - the agent hit an error handling that. Please try again.", false
	}
	if strings.TrimSpace(answer) == "" {
		return "(the agent returned an empty response)", false
	}
	return answer, false
}
