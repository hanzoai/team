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

// upsertInstall records slack_team_id -> workspace + owner_org. Idempotent (one
// row per team). Called at the OAuth callback after the bot token is saved.
func (c *controller) upsertInstall(teamID, workspaceID, org string) error {
	existing, _ := c.app.FindFirstRecordByFilter("slack_installs",
		"slack_team_id = {:t}", dbx.Params{"t": teamID})
	if existing != nil {
		existing.Set("workspace_id", workspaceID)
		existing.Set("owner_org", org)
		return c.app.Save(existing)
	}
	coll, err := c.app.FindCollectionByNameOrId("slack_installs")
	if err != nil {
		return err
	}
	rec := core.NewRecord(coll)
	rec.Set("slack_team_id", teamID)
	rec.Set("workspace_id", workspaceID)
	rec.Set("owner_org", org)
	return c.app.Save(rec)
}

// findUserLink returns the (team, user) -> Hanzo account link row, or nil.
func (c *controller) findUserLink(teamID, slackUserID string) *core.Record {
	rec, _ := c.app.FindFirstRecordByFilter("slack_user_links",
		"slack_team_id = {:t} && slack_user_id = {:u}",
		dbx.Params{"t": teamID, "u": slackUserID})
	return rec
}

// saveUserLink upserts the (team, user) -> Hanzo account identity mapping. The
// refresh token is stored separately in KMS (never in this row).
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
// (team, user). The entry host is derived from SLACK_LINK_REDIRECT_URI (its
// /callback sibling) so ONE config drives both ends of the flow.
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
// returns a short prompt carrying the link URL. Every returned string is safe to
// post to Slack: internal errors are logged (never tokens) and surfaced as a
// terse message.
func (c *controller) agentReply(ctx context.Context, teamID, slackUserID, text string) string {
	bearer, _, linked, err := c.linkedToken(ctx, teamID, slackUserID)
	if err != nil {
		c.app.Logger().Warn("slack: agent identity", "team", teamID, "err", err)
		return "Sorry - I couldn't reach your Hanzo account just now. Please try again shortly."
	}
	if !linked {
		u, serr := c.linkURL(teamID, slackUserID)
		if serr != nil {
			c.app.Logger().Error("slack: link url", "team", teamID, "err", serr)
			return "Connect your Hanzo account to use @hanzo."
		}
		return "Connect your Hanzo account to use @hanzo: " + u
	}
	answer, rerr := runAgent(ctx, c.cfg.agentsBase, c.cfg.agentRef, text, bearer)
	if rerr != nil {
		c.app.Logger().Warn("slack: agent run", "team", teamID, "err", rerr) // never logs the bearer
		return "Sorry - the agent hit an error handling that. Please try again."
	}
	if strings.TrimSpace(answer) == "" {
		return "(the agent returned an empty response)"
	}
	return answer
}
