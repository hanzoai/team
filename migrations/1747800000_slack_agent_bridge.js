/// <reference path="../functions/types.d.ts" />
// Slack <-> Hanzo Cloud AI bridge: team->org install records + per-user account
// links. Two additive collections, append-only (prod already ran the earlier
// migrations). Both are PLUGIN-OWNED: no member CRUD rules (null == locked), so
// all access to the Base collection API is denied; the slack package reads and
// writes them through the app store (superuser context) and enforces tenant
// scope in the handler.
//
//  1. slack_installs   - slack_team_id -> workspace_id + owner_org. Written at
//     the OAuth callback (after the bot token is stored in KMS), this is the ONE
//     place that resolves a Slack team to its Hanzo tenant WITHOUT a channel
//     mapping, so an @mention / DM / slash command can find the org (and thus
//     the workspace bot token) before any channel is bridged. ONE row per team.
//
//  2. slack_user_links - (slack_team_id, slack_user_id) -> the linked Hanzo
//     account (subject + org). Written at the hanzo.id OIDC link callback. It is
//     the pointer that lets an @mention run an agent ON BEHALF OF the Slack
//     user's own Hanzo account (their billing). The refresh token itself is NOT
//     stored here - it lives KMS-encrypted (path "slack-user-tokens"); this row
//     only records that the link exists + who it points at. ONE row per user.

migrate((app) => {
  const workspaces = app.findCollectionByNameOrId("workspaces");

  // ---- 1. slack_installs (plugin-owned; deny all public CRUD) ----
  const installs = new Collection({
    type: "base",
    name: "slack_installs",
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      // The workspace's owning TENANT (owner_org) - the SAME value the bot token
      // was stored under in KMS, so the agent path fetches the token under the
      // tenant, never a per-account path (KMS per-org RBAC).
      { name: "owner_org", type: "text", required: true },
      { name: "slack_team_id", type: "text", required: true },
      { name: "created_at", type: "autodate", onCreate: true },
      { name: "updated_at", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      // ONE install per Slack team - the org lookup must be unambiguous.
      "CREATE UNIQUE INDEX idx_slack_install_team ON slack_installs (slack_team_id)",
    ],
  });
  app.save(installs);

  // ---- 2. slack_user_links (plugin-owned; deny all public CRUD) ----
  const links = new Collection({
    type: "base",
    name: "slack_user_links",
    fields: [
      { name: "slack_team_id", type: "text", required: true },
      { name: "slack_user_id", type: "text", required: true },
      // The linked Hanzo account's IAM subject (sub) and org (owner). Identity
      // only - never a token (the refresh token lives in KMS).
      { name: "hanzo_subject", type: "text", required: true },
      { name: "hanzo_org", type: "text" },
      { name: "created_at", type: "autodate", onCreate: true },
      { name: "updated_at", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      // ONE link per (team, slack user): a re-link updates the same row.
      "CREATE UNIQUE INDEX idx_slack_user_link ON slack_user_links (slack_team_id, slack_user_id)",
    ],
  });
  app.save(links);
}, (app) => {
  ["slack_user_links", "slack_installs"].forEach((name) => {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  });
});
