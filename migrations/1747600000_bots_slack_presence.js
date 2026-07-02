/// <reference path="../functions/types.d.ts" />
// Chat presence, bot-member badges, and Slack channel mappings.
//
// Three additive changes, append-only (prod already ran the earlier three):
//
//  1. members  — bot columns. A bot member is an ordinary `members` row whose
//     account (user_id) is the DETERMINISTIC uuid v5 of `iam:sa:<saId>`, so a
//     re-sync always resolves to the SAME row (never a duplicate). The badge +
//     provenance live inline so the Huly front (and /v1/chat) can render a bot
//     differently from a human without a second lookup.
//
//  2. presence — chat presence. One row per (workspace, user), last_seen bumped
//     on heartbeat. Member-scoped like channels/messages.
//
//  3. slack_mappings — Hanzo channel <-> Slack channel bridge, ONE row per
//     mapping. Plugin-owned: no member CRUD (admin writes only via /v1/slack),
//     so the rules deny all public access; the slack package uses the app store
//     (superuser context) to read/write. Tenant scope is enforced in the
//     handler (ownership proven by a KMS-stored token for the Slack team).

migrate((app) => {
  // ---- 1. members: bot badge + provenance ----
  const members = app.findCollectionByNameOrId("members");
  if (!members) {
    throw new Error("expected members collection from 1747400000 team_domain migration");
  }
  if (!members.fields.getByName("is_bot")) {
    members.fields.add(new Field({ name: "is_bot", type: "bool" }));
  }
  // The IAM service-account principal id this bot member represents (empty for
  // humans). Unique-per-workspace when present so a SA maps to one member row.
  if (!members.fields.getByName("service_account_id")) {
    members.fields.add(new Field({ name: "service_account_id", type: "text" }));
  }
  // The bot's org (IAM owner) and model, surfaced for the badge + admin list.
  if (!members.fields.getByName("organization")) {
    members.fields.add(new Field({ name: "organization", type: "text" }));
  }
  if (!members.fields.getByName("agent_model")) {
    members.fields.add(new Field({ name: "agent_model", type: "text" }));
  }
  // Display name for a bot member (humans resolve via IAM; bots have no IAM
  // profile lookup so we carry it here). Empty for humans.
  if (!members.fields.getByName("display_name")) {
    members.fields.add(new Field({ name: "display_name", type: "text" }));
  }
  // active gates a bot's presence in pickers: a removed bot is deactivated
  // (active=false), not deleted, so history keeps its authorship attribution.
  if (!members.fields.getByName("active")) {
    members.fields.add(new Field({ name: "active", type: "bool" }));
  }
  app.save(members);
  // A workspace maps a SA to at most one member row. Partial-unique on the
  // non-empty service_account_id (SQLite: WHERE clause makes '' rows exempt).
  app.db()
    .newQuery(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_members_workspace_sa " +
        "ON members (workspace_id, service_account_id) WHERE service_account_id != ''"
    )
    .execute();

  const workspaces = app.findCollectionByNameOrId("workspaces");
  const memberRule =
    "workspace_id.members_via_workspace_id.user_id ?= @request.auth.id";

  // ---- 2. presence ----
  const presence = new Collection({
    type: "base",
    name: "presence",
    listRule: memberRule,
    viewRule: memberRule,
    createRule: memberRule + " && user_id = @request.auth.id",
    updateRule: memberRule + " && user_id = @request.auth.id",
    deleteRule: memberRule + " && user_id = @request.auth.id",
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "user_id", type: "text", required: true },
      { name: "status", type: "select", values: ["online", "away", "offline"], maxSelect: 1, required: true },
      { name: "last_seen", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_presence_workspace_user ON presence (workspace_id, user_id)",
    ],
  });
  app.save(presence);

  // ---- 3. slack_mappings (plugin-owned; deny all public CRUD) ----
  const slack = new Collection({
    type: "base",
    name: "slack_mappings",
    // No member rules: only the slack package (superuser store context) writes
    // here. All CRUD via the Base collection API is denied (null == locked).
    fields: [
      { name: "workspace_id", type: "relation", required: true, collectionId: workspaces.id, cascadeDelete: true },
      { name: "channel_id", type: "relation", required: true, collectionId: app.findCollectionByNameOrId("channels").id, cascadeDelete: true },
      { name: "slack_team_id", type: "text", required: true },
      { name: "slack_channel_id", type: "text", required: true },
      { name: "slack_channel_name", type: "text" },
      { name: "enabled", type: "bool" },
      { name: "created_by", type: "text", required: true },
      { name: "created_at", type: "autodate", onCreate: true },
    ],
    indexes: [
      // One mapping per (team, slack channel) so an inbound event routes to one Hanzo channel.
      "CREATE UNIQUE INDEX idx_slack_team_channel ON slack_mappings (slack_team_id, slack_channel_id)",
      // Fast lookup on the outgoing path: given a Hanzo channel, is it mapped?
      "CREATE INDEX idx_slack_channel ON slack_mappings (channel_id)",
      "CREATE INDEX idx_slack_workspace ON slack_mappings (workspace_id)",
    ],
  });
  app.save(slack);
}, (app) => {
  ["slack_mappings", "presence"].forEach((name) => {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  });
  // members columns are additive — left in place on down (append-only prod).
});
