/// <reference path="../functions/types.d.ts" />
// Slack <-> Hanzo Cloud AI bridge: team->org install records, per-user account
// links, and a durable agent-event dedupe. Additive, append-only. All three are
// PLUGIN-OWNED: no member CRUD rules (null == locked); the slack package reads
// and writes them through the app store (superuser context) and enforces tenant
// scope in the handler.
//
//  1. slack_installs   - slack_team_id -> owner_org (+ optional workspace_id).
//     The ONE place that resolves a Slack team to its Hanzo tenant WITHOUT a
//     channel mapping, so an @mention / DM / slash command finds the org (and
//     thus the workspace bot token). ONE row per team (first-org-wins is
//     enforced in oauth(): a second org cannot overwrite an existing team's
//     install), so the effective ownership is (org, team). workspace_id is
//     OPTIONAL: the org-scoped console connect flow has no single workspace.
//
//  2. slack_user_links - (slack_team_id, slack_user_id) -> the linked Hanzo
//     account (subject + org). Written at the link callback, where slack_user_id
//     is proven by a Slack sign-in leg (never taken from a URL param). The
//     refresh token lives KMS-encrypted; this row is only the pointer. ONE row
//     per user.
//
//  3. slack_processed_events - a DURABLE dedupe for the agent path (an @mention
//     runs a BILLED agent turn, so a duplicate must never double-run/double-bill).
//     Keyed by the Slack event_id (or a slash trigger_id); the unique index makes
//     "insert-or-skip" atomic and it survives a pod restart, unlike the in-process
//     seen-set (which stays as the cosmetic dedupe for the channel-mirror relay).

migrate((app) => {
  const workspaces = app.findCollectionByNameOrId("workspaces");

  // ---- 1. slack_installs (plugin-owned; deny all public CRUD) ----
  const installs = new Collection({
    type: "base",
    name: "slack_installs",
    fields: [
      // Optional: the org-scoped connect path has no single workspace. Provenance
      // only - the agent path routes by owner_org, never by this field.
      { name: "workspace_id", type: "relation", required: false, collectionId: workspaces.id, cascadeDelete: true },
      // The owning TENANT (owner_org) - the SAME value the bot token is stored
      // under in KMS (KMS per-org RBAC).
      { name: "owner_org", type: "text", required: true },
      { name: "slack_team_id", type: "text", required: true },
      { name: "created_at", type: "autodate", onCreate: true },
      { name: "updated_at", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      // ONE install per Slack team (first-org-wins guarded in oauth()).
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

  // ---- 3. slack_processed_events (plugin-owned; deny all public CRUD) ----
  const processed = new Collection({
    type: "base",
    name: "slack_processed_events",
    fields: [
      // Slack event_id (events) or trigger_id (slash). The unique index is the
      // dedupe: insert-or-skip before dispatching a billed agent turn.
      { name: "event_key", type: "text", required: true },
      { name: "created_at", type: "autodate", onCreate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_slack_processed_key ON slack_processed_events (event_key)",
    ],
  });
  app.save(processed);
}, (app) => {
  ["slack_processed_events", "slack_user_links", "slack_installs"].forEach((name) => {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  });
});
